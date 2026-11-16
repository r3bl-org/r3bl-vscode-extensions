// Copyright (c) 2024-2026 R3BL LLC. Licensed under MIT License.

import {
    JumpPoint,
    JumpPointsManager,
    ActiveTaskSpaceRef,
    JUMP_POINTS_STORAGE_KEY,
    JUMP_POINTS_STORAGE_FILE,
    JUMP_POINTS_VERSION,
    extractSymbolLabel,
    isSameLocation,
    buildJumpQuickPickItems,
    generateJumpPointsCodeSearchContent,
    resolveJumpPointUri,
} from "../jumpPointNavigator"
import * as vscode from "vscode"

function makePoint(overrides: Partial<JumpPoint> & { line: number }): JumpPoint {
    const relativePath = overrides.relativePath ?? "src/lib.rs"
    const fsPath = overrides.fsPath ?? `/workspace/${relativePath}`
    const uriString = overrides.uriString ?? `file://${fsPath}`

    return {
        id: overrides.id ?? `id-${overrides.line}`,
        uriString,
        fsPath,
        relativePath,
        line: overrides.line,
        character: overrides.character ?? 0,
        symbolLabel: overrides.symbolLabel ?? `sym_${overrides.line}`,
        linePreview: overrides.linePreview ?? `let x = ${overrides.line};`,
    }
}

describe("extractSymbolLabel", () => {
    it("extracts Rust struct declaration label", () => {
        expect(extractSymbolLabel("pub struct DialogBuffer {", "pub")).toBe(
            "struct DialogBuffer",
        )
        expect(extractSymbolLabel("pub(crate) struct ColorWheel;", "ColorWheel")).toBe(
            "struct ColorWheel",
        )
    })

    it("extracts Rust fn declaration label including async/unsafe/const", () => {
        expect(extractSymbolLabel("pub async fn apply_event(&mut self) {")).toBe(
            "fn apply_event",
        )
        expect(extractSymbolLabel("unsafe fn raw_ptr_op() {}", "fn")).toBe(
            "fn raw_ptr_op",
        )
    })

    it("extracts enum, trait, and type alias declarations", () => {
        expect(extractSymbolLabel("pub enum EventResult {")).toBe("enum EventResult")
        expect(extractSymbolLabel("pub trait RenderPipeline {")).toBe(
            "trait RenderPipeline",
        )
        expect(extractSymbolLabel("pub type ByteIndex = usize;")).toBe("type ByteIndex")
    })

    it("uses specific wordAtCursor when jumping from a parameter or return type on a fn line", () => {
        expect(
            extractSymbolLabel(
                "pub fn process(engine: &mut DialogEngine) {",
                "DialogEngine",
            ),
        ).toBe("DialogEngine")
    })

    it("uses wordAtCursor on non-declaration lines", () => {
        expect(
            extractSymbolLabel("    let buffer = DialogBuffer::new();", "DialogBuffer"),
        ).toBe("DialogBuffer")
    })

    it("falls back to truncated line text or line number when no word is under cursor", () => {
        expect(extractSymbolLabel("    foo.bar().baz();")).toBe("foo.bar().baz();")
        expect(extractSymbolLabel("   ", undefined, 9)).toBe("line 10")
    })
})

describe("isSameLocation", () => {
    it("returns true when uriString and line match", () => {
        const a = makePoint({ relativePath: "src/a.rs", line: 10, character: 2 })
        const b = makePoint({ relativePath: "src/a.rs", line: 10, character: 15 })
        expect(isSameLocation(a, b)).toBe(true)
    })

    it("returns false when line or file differs", () => {
        const a = makePoint({ relativePath: "src/a.rs", line: 10 })
        const b = makePoint({ relativePath: "src/a.rs", line: 11 })
        const c = makePoint({ relativePath: "src/b.rs", line: 10 })
        expect(isSameLocation(a, b)).toBe(false)
        expect(isSameLocation(a, c)).toBe(false)
    })
})

describe("JumpPointsManager", () => {
    let manager: JumpPointsManager
    let activeTask: ActiveTaskSpaceRef | undefined

    beforeEach(async () => {
        activeTask = { id: "task-1", name: "Task 1" }
        manager = new JumpPointsManager()
        const emptyMemento: vscode.Memento = {
            keys: () => [],
            get: () => undefined,
            update: async () => {},
        }
        await manager.initialize(emptyMemento, () => activeTask)
    })

    it("records both origin and destination on the first jump", () => {
        const origin = makePoint({
            relativePath: "src/editor.rs",
            line: 141,
            symbolLabel: "DialogBuffer",
        })
        const dest = makePoint({
            relativePath: "src/dialog_buffer.rs",
            line: 17,
            symbolLabel: "struct DialogBuffer",
        })

        manager.recordJump(origin, dest)

        expect(manager.getPoints()).toEqual([origin, dest])
        expect(manager.getCurrentIndex()).toBe(1)
    })

    it("appends only destination when drilling down from the current destination file", () => {
        const p1 = makePoint({
            relativePath: "src/editor.rs",
            line: 141,
            symbolLabel: "DialogBuffer",
        })
        const p2 = makePoint({
            relativePath: "src/dialog_buffer.rs",
            line: 17,
            symbolLabel: "struct DialogBuffer",
        })
        // User scrolls down 4 lines inside src/dialog_buffer.rs to a field and presses Alt+U
        const fieldOrigin = makePoint({
            relativePath: "src/dialog_buffer.rs",
            line: 21,
            symbolLabel: "ColorWheel",
        })
        const p3 = makePoint({
            relativePath: "src/color_wheel.rs",
            line: 44,
            symbolLabel: "struct ColorWheel",
        })

        manager.recordJump(p1, p2)
        manager.recordJump(fieldOrigin, p3)

        expect(manager.getPoints()).toEqual([p1, p2, p3])
        expect(manager.getCurrentIndex()).toBe(2)
    })

    it("records new origin and destination when jumping from an unrecorded file mid-session", () => {
        const p1 = makePoint({ relativePath: "src/a.rs", line: 10 })
        const p2 = makePoint({ relativePath: "src/b.rs", line: 20 })
        manager.recordJump(p1, p2)

        const newFileOrigin = makePoint({
            relativePath: "src/unrelated.rs",
            line: 5,
        })
        const p3 = makePoint({ relativePath: "src/target.rs", line: 50 })
        manager.recordJump(newFileOrigin, p3)

        expect(manager.getPoints()).toEqual([p1, p2, newFileOrigin, p3])
        expect(manager.getCurrentIndex()).toBe(3)
    })

    it("ignores no-op jumps where origin and destination are on the same file and line", () => {
        const p1 = makePoint({ relativePath: "src/a.rs", line: 10, character: 0 })
        const p1SameLine = makePoint({
            relativePath: "src/a.rs",
            line: 10,
            character: 8,
        })

        manager.recordJump(p1, p1SameLine)

        expect(manager.getPoints()).toEqual([])
        expect(manager.getCurrentIndex()).toBe(-1)
    })

    it("supports backtracking and forward-tracking via navigateToIndex", () => {
        const p1 = makePoint({ relativePath: "src/a.rs", line: 10 })
        const p2 = makePoint({ relativePath: "src/b.rs", line: 20 })
        const p3 = makePoint({ relativePath: "src/c.rs", line: 30 })

        manager.recordJump(p1, p2)
        manager.recordJump(p2, p3)
        expect(manager.getCurrentIndex()).toBe(2)

        // Backtrack to #1 (index 0)
        const targetBack = manager.navigateToIndex(0)
        expect(targetBack).toEqual(p1)
        expect(manager.getCurrentIndex()).toBe(0)

        // Forward-track to #2 (index 1)
        const targetForward = manager.navigateToIndex(1)
        expect(targetForward).toEqual(p2)
        expect(manager.getCurrentIndex()).toBe(1)
    })

    it("removes items and adjusts currentIndex properly", () => {
        const p1 = makePoint({ relativePath: "src/a.rs", line: 10 })
        const p2 = makePoint({ relativePath: "src/b.rs", line: 20 })
        const p3 = makePoint({ relativePath: "src/c.rs", line: 30 })

        manager.recordJump(p1, p2)
        manager.recordJump(p2, p3)
        expect(manager.getCurrentIndex()).toBe(2)

        // Remove item before currentIndex -> currentIndex shifts down by 1
        manager.removeAtIndex(0)
        expect(manager.getPoints()).toEqual([p2, p3])
        expect(manager.getCurrentIndex()).toBe(1)

        // Remove last item when currentIndex is at the end -> clamps to new last index
        manager.removeAtIndex(1)
        expect(manager.getPoints()).toEqual([p2])
        expect(manager.getCurrentIndex()).toBe(0)

        // Remove final remaining item -> resets to -1
        manager.removeAtIndex(0)
        expect(manager.getPoints()).toEqual([])
        expect(manager.getCurrentIndex()).toBe(-1)
    })

    it("clears all points and resets index", () => {
        const p1 = makePoint({ relativePath: "src/a.rs", line: 10 })
        const p2 = makePoint({ relativePath: "src/b.rs", line: 20 })
        manager.recordJump(p1, p2)

        manager.clear()
        expect(manager.getPoints()).toEqual([])
        expect(manager.getCurrentIndex()).toBe(-1)
    })

    it("restores points and currentIndex from workspaceState fallback when no workspace is open", async () => {
        const p1 = makePoint({ relativePath: "src/a.rs", line: 10 })
        const p2 = makePoint({ relativePath: "src/b.rs", line: 20 })

        const store = new Map<string, any>()
        store.set(JUMP_POINTS_STORAGE_KEY, {
            version: JUMP_POINTS_VERSION,
            tasks: {
                "task-1": {
                    points: [p1, p2],
                    currentIndex: 0,
                },
            },
        })

        const mockMemento: vscode.Memento = {
            keys: () => Array.from(store.keys()),
            get: <T>(key: string): T | undefined => store.get(key),
            update: async (key: string, value: any): Promise<void> => {
                store.set(key, value)
            },
        }

        const localManager = new JumpPointsManager()
        await localManager.initialize(mockMemento, () => activeTask)
        expect(localManager.getPoints()).toEqual([p1, p2])
        expect(localManager.getCurrentIndex()).toBe(0)
    })

    it("persists updates to workspaceState fallback when no workspace is open", async () => {
        const store = new Map<string, any>()
        const mockMemento: vscode.Memento = {
            keys: () => Array.from(store.keys()),
            get: <T>(key: string): T | undefined => store.get(key),
            update: async (key: string, value: any): Promise<void> => {
                store.set(key, value)
            },
        }

        const localManager = new JumpPointsManager()
        await localManager.initialize(mockMemento, () => activeTask)

        const p1 = makePoint({ relativePath: "src/a.rs", line: 10 })
        const p2 = makePoint({ relativePath: "src/b.rs", line: 20 })
        localManager.recordJump(p1, p2)
        await localManager.waitForPendingSaves()

        const state1 = store.get(JUMP_POINTS_STORAGE_KEY)
        expect(state1.version).toBe(JUMP_POINTS_VERSION)
        expect(state1.tasks["task-1"].points).toHaveLength(2)
        expect(state1.tasks["task-1"].currentIndex).toBe(1)

        localManager.navigateToIndex(0)
        await localManager.waitForPendingSaves()
        expect(store.get(JUMP_POINTS_STORAGE_KEY).tasks["task-1"].currentIndex).toBe(0)

        localManager.removeAtIndex(1)
        await localManager.waitForPendingSaves()
        expect(store.get(JUMP_POINTS_STORAGE_KEY).tasks["task-1"].points).toHaveLength(1)

        localManager.clear()
        await localManager.waitForPendingSaves()
        expect(store.get(JUMP_POINTS_STORAGE_KEY).tasks["task-1"]).toBeUndefined()
    })

    it("isolates jump points per task space and returns empty when no task is active", () => {
        const p1 = makePoint({ relativePath: "src/a.rs", line: 10 })
        const p2 = makePoint({ relativePath: "src/b.rs", line: 20 })
        manager.recordJump(p1, p2)
        expect(manager.getPoints()).toEqual([p1, p2])

        // Switch to Task 2 — should start clean with zero overlap
        activeTask = { id: "task-2", name: "Task 2" }
        expect(manager.getPoints()).toEqual([])
        expect(manager.getCurrentIndex()).toBe(-1)

        const p3 = makePoint({ relativePath: "src/c.rs", line: 30 })
        const p4 = makePoint({ relativePath: "src/d.rs", line: 40 })
        manager.recordJump(p3, p4)
        expect(manager.getPoints()).toEqual([p3, p4])

        // Switch back to Task 1 — restores Task 1's points
        activeTask = { id: "task-1", name: "Task 1" }
        expect(manager.getPoints()).toEqual([p1, p2])

        // No active task — empty and recordJump is a no-op
        activeTask = undefined
        expect(manager.getPoints()).toEqual([])
        expect(manager.getCurrentIndex()).toBe(-1)
        manager.recordJump(p1, p3)
        expect(manager.getPoints("task-1")).toEqual([p1, p2])
    })

    describe("workspace .vscode/jump-points.json persistence & cross-IDE sync", () => {
        const mockWorkspace = vscode.workspace as unknown as {
            workspaceFolders:
                | Array<{ uri: vscode.Uri; name: string; index: number }>
                | undefined
        }
        const mockFiles = (vscode as unknown as { __mockFiles: Map<string, Uint8Array> })
            .__mockFiles
        const storagePath = `/repo/${JUMP_POINTS_STORAGE_FILE}`

        beforeEach(() => {
            mockFiles.clear()
            mockWorkspace.workspaceFolders = [
                { uri: vscode.Uri.file("/repo"), name: "repo", index: 0 },
            ]
        })

        afterEach(() => {
            mockWorkspace.workspaceFolders = undefined
            mockFiles.clear()
        })

        it("persists and restores per-task jump points in .vscode/jump-points.json v3.0", async () => {
            const emptyMemento: vscode.Memento = {
                keys: () => [],
                get: () => undefined,
                update: async () => {},
            }

            const localManager = new JumpPointsManager()
            await localManager.initialize(emptyMemento, () => activeTask)

            const p1 = makePoint({ relativePath: "src/a.rs", line: 10 })
            const p2 = makePoint({ relativePath: "src/b.rs", line: 20 })
            localManager.recordJump(p1, p2)
            localManager.navigateToIndex(0)
            await localManager.waitForPendingSaves()

            const raw = mockFiles.get(storagePath)
            expect(raw).toBeDefined()
            const parsed = JSON.parse(Buffer.from(raw!).toString("utf8"))
            expect(parsed.version).toBe(JUMP_POINTS_VERSION)
            expect(parsed.tasks["task-1"].points).toEqual([p1, p2])
            expect(parsed.tasks["task-1"].currentIndex).toBe(0)

            // Simulate a second IDE opening the same workspace with the same active task
            const secondIdeManager = new JumpPointsManager()
            await secondIdeManager.initialize(emptyMemento, () => activeTask)
            expect(secondIdeManager.getPoints()).toEqual([p1, p2])
            expect(secondIdeManager.getCurrentIndex()).toBe(0)
        })

        it("ignores own save in reloadFromDisk and reloads external IDE edits", async () => {
            const emptyMemento: vscode.Memento = {
                keys: () => [],
                get: () => undefined,
                update: async () => {},
            }

            const localManager = new JumpPointsManager()
            await localManager.initialize(emptyMemento, () => activeTask)
            const p1 = makePoint({ relativePath: "src/a.rs", line: 10 })
            const p2 = makePoint({ relativePath: "src/b.rs", line: 20 })
            localManager.recordJump(p1, p2)
            await localManager.waitForPendingSaves()

            // Own save on disk should be ignored
            expect(await localManager.reloadFromDisk()).toBe(false)

            // Another IDE updates .vscode/jump-points.json externally
            const p3 = makePoint({ relativePath: "src/c.rs", line: 30 })
            mockFiles.set(
                storagePath,
                Buffer.from(
                    JSON.stringify(
                        {
                            version: JUMP_POINTS_VERSION,
                            tasks: {
                                "task-1": { points: [p1, p2, p3], currentIndex: 2 },
                            },
                        },
                        null,
                        2,
                    ),
                    "utf8",
                ),
            )

            expect(await localManager.reloadFromDisk()).toBe(true)
            expect(localManager.getPoints()).toEqual([p1, p2, p3])
            expect(localManager.getCurrentIndex()).toBe(2)

            // Deleting the file externally clears the in-memory jump points
            localManager.handleExternalFileDelete()
            expect(localManager.getPoints()).toEqual([])
            expect(localManager.getCurrentIndex()).toBe(-1)
        })

        it("migrates legacy v1.0 and v2.0 .vscode/jump-points.json into v3.0", async () => {
            const p1 = makePoint({ relativePath: "src/a.rs", line: 10 })
            const p2 = makePoint({ relativePath: "src/b.rs", line: 20 })
            mockFiles.set(
                storagePath,
                Buffer.from(
                    JSON.stringify(
                        { version: "1.0", points: [p1, p2], currentIndex: 1 },
                        null,
                        2,
                    ),
                    "utf8",
                ),
            )

            const emptyMemento: vscode.Memento = {
                keys: () => [],
                get: () => undefined,
                update: async () => {},
            }
            const localManager = new JumpPointsManager()
            await localManager.initialize(emptyMemento, () => activeTask)

            expect(localManager.getPoints()).toEqual([p1, p2])
            expect(localManager.getCurrentIndex()).toBe(1)

            const raw = mockFiles.get(storagePath)
            const parsed = JSON.parse(Buffer.from(raw!).toString("utf8"))
            expect(parsed.version).toBe(JUMP_POINTS_VERSION)
            expect(parsed.tasks["task-1"]).toEqual({
                points: [p1, p2],
                currentIndex: 1,
            })

            // Also verify v2.0 migration
            const legacyV2Field = "jour" + "neys"
            mockFiles.set(
                storagePath,
                Buffer.from(
                    JSON.stringify(
                        {
                            version: "2.0",
                            [legacyV2Field]: {
                                "task-1": { points: [p1], currentIndex: 0 },
                            },
                        },
                        null,
                        2,
                    ),
                    "utf8",
                ),
            )

            const v2Manager = new JumpPointsManager()
            await v2Manager.initialize(emptyMemento, () => activeTask)
            expect(v2Manager.getPoints()).toEqual([p1])
            const migratedV2 = JSON.parse(
                Buffer.from(mockFiles.get(storagePath)!).toString("utf8"),
            )
            expect(migratedV2.version).toBe(JUMP_POINTS_VERSION)
            expect(migratedV2.tasks["task-1"]).toEqual({ points: [p1], currentIndex: 0 })
        })

        it("deletes only the specified task jump points in deleteJumpPointsForTask", async () => {
            const emptyMemento: vscode.Memento = {
                keys: () => [],
                get: () => undefined,
                update: async () => {},
            }
            const localManager = new JumpPointsManager()
            await localManager.initialize(emptyMemento, () => activeTask)

            const p1 = makePoint({ relativePath: "src/a.rs", line: 10 })
            const p2 = makePoint({ relativePath: "src/b.rs", line: 20 })
            localManager.recordJump(p1, p2)

            activeTask = { id: "task-2", name: "Task 2" }
            const p3 = makePoint({ relativePath: "src/c.rs", line: 30 })
            const p4 = makePoint({ relativePath: "src/d.rs", line: 40 })
            localManager.recordJump(p3, p4)
            await localManager.waitForPendingSaves()

            await localManager.deleteJumpPointsForTask("task-1")
            await localManager.waitForPendingSaves()

            expect(localManager.getPoints("task-1")).toEqual([])
            expect(localManager.getPoints("task-2")).toEqual([p3, p4])
        })
    })
})

describe("buildJumpQuickPickItems", () => {
    it("formats numbered jump points, marks currentIndex with $(arrow-right), and appends bottom actions", () => {
        const p1 = makePoint({
            relativePath: "src/editor.rs",
            line: 141,
            symbolLabel: "fn apply_event",
            linePreview: "let buffer = DialogBuffer::new();",
        })
        const p2 = makePoint({
            relativePath: "src/dialog_buffer.rs",
            line: 17,
            symbolLabel: "struct DialogBuffer",
            linePreview: "pub struct DialogBuffer {",
        })

        const items = buildJumpQuickPickItems([p1, p2], 1)

        expect(items).toHaveLength(5) // 2 jump points + 1 separator + 2 action rows
        expect(items[0].label).toBe("1. fn apply_event")
        expect(items[0].description).toBe("src/editor.rs:142")
        expect(items[0].buttons).toHaveLength(1)

        expect(items[1].label).toBe("2. $(arrow-right) struct DialogBuffer")
        expect(items[1].description).toBe("src/dialog_buffer.rs:18")

        expect(items[2].kind).toBe(vscode.QuickPickItemKind.Separator)
        expect(items[3].action).toBe("dump-code-search")
        expect(items[4].action).toBe("clear-all")
    })
})

describe("generateJumpPointsCodeSearchContent", () => {
    it("generates .code-search output with surrounding context lines and target line colon", () => {
        const p1 = makePoint({
            relativePath: "src/editor.rs",
            line: 2, // 0-indexed -> line 3
            symbolLabel: "DialogBuffer",
            linePreview: "    let buffer = DialogBuffer::new();",
        })

        const fileLines = new Map<string, readonly string[]>([
            [
                p1.uriString,
                [
                    "pub fn apply_event() {",
                    "    // setup",
                    "    let buffer = DialogBuffer::new();",
                    "    buffer.render();",
                    "}",
                ],
            ],
        ])

        const output = generateJumpPointsCodeSearchContent([p1], fileLines, 1)

        expect(output).toContain("# Jump Point Navigation (1 step)")
        expect(output).toContain("# ── Step 1: DialogBuffer ──")
        expect(output).toContain("src/editor.rs:")
        expect(output).toContain("  2      // setup")
        expect(output).toContain("  3:     let buffer = DialogBuffer::new();")
        expect(output).toContain("  4      buffer.render();")
    })
})

describe("resolveJumpPointUri", () => {
    it("resolves workspace-relative paths against the active workspace folder", () => {
        const point = makePoint({
            relativePath: "src/editor.rs",
            fsPath: "/old-machine/repo/src/editor.rs",
            uriString: "file:///old-machine/repo/src/editor.rs",
            line: 10,
        })
        const folders = [
            { uri: vscode.Uri.file("/new-machine/repo"), name: "repo", index: 0 },
        ] as unknown as vscode.WorkspaceFolder[]

        const resolved = resolveJumpPointUri(point, folders)
        expect(resolved.fsPath).toBe("/new-machine/repo/src/editor.rs")
    })

    it("falls back to uriString for external files outside the workspace", () => {
        const point = makePoint({
            relativePath: "/home/user/.cargo/registry/src/tokio/lib.rs",
            fsPath: "/home/user/.cargo/registry/src/tokio/lib.rs",
            uriString: "file:///home/user/.cargo/registry/src/tokio/lib.rs",
            line: 42,
        })
        const folders = [
            { uri: vscode.Uri.file("/workspace/repo"), name: "repo", index: 0 },
        ] as unknown as vscode.WorkspaceFolder[]

        const resolved = resolveJumpPointUri(point, folders)
        expect(resolved.toString()).toBe(
            "file:///home/user/.cargo/registry/src/tokio/lib.rs",
        )
    })
})
