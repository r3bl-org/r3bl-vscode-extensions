// Copyright (c) 2024-2026 R3BL LLC. Licensed under MIT License.

import {
    JumpPoint,
    JumpJourneyManager,
    extractSymbolLabel,
    isSameLocation,
    buildJumpQuickPickItems,
    generateJourneyCodeSearchContent,
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

describe("JumpJourneyManager", () => {
    let manager: JumpJourneyManager

    beforeEach(() => {
        manager = new JumpJourneyManager()
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

    it("restores points and currentIndex from workspaceState on initialize", () => {
        const p1 = makePoint({ relativePath: "src/a.rs", line: 10 })
        const p2 = makePoint({ relativePath: "src/b.rs", line: 20 })

        const store = new Map<string, any>()
        store.set("r3bl-semantic-config.jumpJourney", {
            points: [p1, p2],
            currentIndex: 0,
        })

        const mockMemento: vscode.Memento = {
            keys: () => Array.from(store.keys()),
            get: <T>(key: string): T | undefined => store.get(key),
            update: async (key: string, value: any): Promise<void> => {
                store.set(key, value)
            },
        }

        manager.initialize(mockMemento)
        expect(manager.getPoints()).toEqual([p1, p2])
        expect(manager.getCurrentIndex()).toBe(0)
    })

    it("persists updates to workspaceState when recording, navigating, removing, or clearing", () => {
        const store = new Map<string, any>()
        const mockMemento: vscode.Memento = {
            keys: () => Array.from(store.keys()),
            get: <T>(key: string): T | undefined => store.get(key),
            update: async (key: string, value: any): Promise<void> => {
                store.set(key, value)
            },
        }

        manager.initialize(mockMemento)

        const p1 = makePoint({ relativePath: "src/a.rs", line: 10 })
        const p2 = makePoint({ relativePath: "src/b.rs", line: 20 })
        manager.recordJump(p1, p2)

        const state1 = store.get("r3bl-semantic-config.jumpJourney")
        expect(state1.points).toHaveLength(2)
        expect(state1.currentIndex).toBe(1)

        manager.navigateToIndex(0)
        expect(store.get("r3bl-semantic-config.jumpJourney").currentIndex).toBe(0)

        manager.removeAtIndex(1)
        expect(store.get("r3bl-semantic-config.jumpJourney").points).toHaveLength(1)

        manager.clear()
        expect(store.get("r3bl-semantic-config.jumpJourney").points).toHaveLength(0)
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

describe("generateJourneyCodeSearchContent", () => {
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

        const output = generateJourneyCodeSearchContent([p1], fileLines, 1)

        expect(output).toContain("# Jump Journey (1 step)")
        expect(output).toContain("# ── Step 1: DialogBuffer ──")
        expect(output).toContain("src/editor.rs:")
        expect(output).toContain("  2      // setup")
        expect(output).toContain("  3:     let buffer = DialogBuffer::new();")
        expect(output).toContain("  4      buffer.render();")
    })
})
