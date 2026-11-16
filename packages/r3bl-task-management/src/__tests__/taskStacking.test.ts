// Copyright (c) 2024-2026 R3BL LLC. Licensed under MIT License.

import * as vscode from "vscode"
import { Storage } from "../storage"
import { TaskSpaceManager } from "../taskSpaceManager"
import { TaskSpace } from "../types"

function createMockMemento(initial: Record<string, unknown> = {}): vscode.Memento {
    const store = new Map<string, unknown>(Object.entries(initial))
    return {
        keys: () => Array.from(store.keys()),
        get: <T>(key: string, defaultValue?: T): T =>
            store.has(key) ? (store.get(key) as T) : (defaultValue as T),
        update: async (key: string, value: unknown): Promise<void> => {
            if (value === undefined) {
                store.delete(key)
            } else {
                store.set(key, value)
            }
        },
    }
}

function createMockContext(memento?: vscode.Memento): vscode.ExtensionContext {
    return {
        workspaceState: memento ?? createMockMemento(),
        subscriptions: [],
    } as unknown as vscode.ExtensionContext
}

describe("Storage v4.0 -> v5.0 migration", () => {
    const mockWorkspace = vscode.workspace as unknown as {
        workspaceFolders:
            | Array<{ uri: vscode.Uri; name: string; index: number }>
            | undefined
    }
    const mockFiles = (vscode as unknown as { __mockFiles: Map<string, Uint8Array> })
        .__mockFiles
    const storagePath = "/repo/.vscode/task-spaces.json"

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

    it("migrates v4.0 and v5.0 data to v6.0 taskSpaceStackIds and deletes legacy fields", async () => {
        const taskA: TaskSpace = {
            id: "task-a",
            name: "Task A",
            tabs: [],
            createdAt: 100,
        }
        const taskB: TaskSpace = {
            id: "task-b",
            name: "Task B",
            tabs: [],
            createdAt: 200,
        }
        mockFiles.set(
            storagePath,
            Buffer.from(
                JSON.stringify(
                    {
                        version: "4.0",
                        taskSpaces: [taskA, taskB],
                        nextQueueIds: ["task-b"],
                        previousStackIds: ["task-a"],
                    },
                    null,
                    2,
                ),
                "utf8",
            ),
        )

        const storage = new Storage(createMockContext())
        const loaded = await storage.loadTaskSpaces()

        expect(storage.didMigrate()).toBe(true)
        expect(loaded.version).toBe("6.0")
        expect(loaded.taskSpaceStackIds).toEqual(["task-a"])
        expect(
            (loaded as unknown as Record<string, unknown>).nextQueueIds,
        ).toBeUndefined()
        expect(
            (loaded as unknown as Record<string, unknown>).previousStackIds,
        ).toBeUndefined()
    })
})

describe("TaskSpaceManager explicit Call Stack & Parked Head", () => {
    const mockWorkspace = vscode.workspace as unknown as {
        workspaceFolders:
            | Array<{ uri: vscode.Uri; name: string; index: number }>
            | undefined
    }
    const mockFiles = (vscode as unknown as { __mockFiles: Map<string, Uint8Array> })
        .__mockFiles
    const storagePath = "/repo/.vscode/task-spaces.json"

    let deletedIds: string[]
    let manager: TaskSpaceManager

    function setOpenTabs(relativePaths: string[]): void {
        const tabs = relativePaths.map((rel, idx) => ({
            input: new vscode.TabInputText(vscode.Uri.file(`/repo/${rel}`)),
            isPinned: false,
            isActive: idx === 0,
        }))
        ;(vscode.window.tabGroups as unknown as { all: unknown[] }).all = [
            { viewColumn: 1, tabs },
        ]
    }

    beforeEach(async () => {
        mockFiles.clear()
        deletedIds = []
        mockWorkspace.workspaceFolders = [
            { uri: vscode.Uri.file("/repo"), name: "repo", index: 0 },
        ]
        setOpenTabs([])
        manager = new TaskSpaceManager(createMockContext(), async (id) => {
            deletedIds.push(id)
        })
        await manager.initialize()
    })

    afterEach(() => {
        mockWorkspace.workspaceFolders = undefined
        mockFiles.clear()
        setOpenTabs([])
    })

    it("parks stack with its head on flat switch, resumes via popTaskSpace or switchTaskSpace, and finishes off-stack tasks cleanly", async () => {
        setOpenTabs(["src/a.rs"])
        const taskA = await manager.createTaskSpace("Task A", "task/a.md", true)
        const taskB = await manager.createTaskSpace("Task B", "task/b.md", false, [])
        mockFiles.set("/repo/task/c.md", Buffer.from("# C", "utf8"))
        const taskC = await manager.createTaskSpace("Task C", "task/c.md", false, [])

        // Push Task B onto Task A -> on-stack [A, B]
        await manager.pushTaskSpace(taskB.id)
        expect(manager.getStackState()).toEqual({
            mode: "on-stack",
            headTaskSpaceId: taskB.id,
            pausedTaskSpaceIds: [taskA.id],
        })

        // Flat-switch to unrelated Task C -> stack parks with Head = B and Paused = [A]
        setOpenTabs(["src/b.rs"])
        await manager.switchTaskSpace(taskC.id)
        expect(manager.getStackState()).toEqual({
            mode: "parked",
            activeTaskSpaceId: taskC.id,
            headTaskSpaceId: taskB.id,
            pausedTaskSpaceIds: [taskA.id],
        })

        // Finishing off-stack Task C does NOT hijack Task A — closes tabs and preserves parked [A, B]
        const returnedAfterOffStackFinish = await manager.finishCurrentTask()
        expect(returnedAfterOffStackFinish).toBeUndefined()
        expect(manager.getStackState()).toEqual({
            mode: "parked",
            activeTaskSpaceId: undefined,
            headTaskSpaceId: taskB.id,
            pausedTaskSpaceIds: [taskA.id],
        })

        // Alt+Shift+J (`popTaskSpace`) from No Task Space jumps straight back to parked head Task B!
        const resumeResult = await manager.popTaskSpace()
        expect(resumeResult?.outcome).toBe("resumed-stack")
        expect(resumeResult?.returnedTo?.id).toBe(taskB.id)
        expect(manager.getStackState()).toEqual({
            mode: "on-stack",
            headTaskSpaceId: taskB.id,
            pausedTaskSpaceIds: [taskA.id],
        })

        // Switching to paused caller Task A enters `browsing-stack` WITHOUT popping Task B!
        const browseOutcome = await manager.switchTaskSpace(taskA.id)
        expect(browseOutcome).toBe("browsed-stack")
        expect(manager.getStackState()).toEqual({
            mode: "browsing-stack",
            activeTaskSpaceId: taskA.id,
            headTaskSpaceId: taskB.id,
            pausedTaskSpaceIds: [taskA.id],
        })

        // Alt+Shift+J (`popTaskSpace`) while browsing Task A returns to stack head Task B without popping!
        const returnHead = await manager.popTaskSpace()
        expect(returnHead?.outcome).toBe("resumed-stack")
        expect(returnHead?.returnedTo?.id).toBe(taskB.id)
        expect(manager.getStackState()).toEqual({
            mode: "on-stack",
            headTaskSpaceId: taskB.id,
            pausedTaskSpaceIds: [taskA.id],
        })
    })

    it("pushTaskSpace saves outgoing tabs and pushes active task; pushNewSubtask works from on-stack and off-stack", async () => {
        setOpenTabs(["src/a.rs"])
        const taskA = await manager.createTaskSpace("Task A", "task/a.md", true)
        expect(taskA.tabs.map((t) => t.path)).toEqual(["src/a.rs"])

        // Create clean subtask via pushNewSubtask
        mockFiles.set("/repo/task/subtask-b.md", Buffer.from("# Subtask B", "utf8"))
        const subB = await manager.pushNewSubtask("Subtask B", "task/subtask-b.md")

        expect(manager.getActiveTaskSpaceId()).toBe(subB.id)
        expect(manager.getStackState()).toEqual({
            mode: "on-stack",
            headTaskSpaceId: subB.id,
            pausedTaskSpaceIds: [taskA.id],
        })
        // Clean subtask starts ONLY with task/subtask-b.md, not src/a.rs
        expect(subB.tabs.map((t) => t.path)).toEqual(["task/subtask-b.md"])

        // Flat-switch to an off-stack Task C, then pushNewSubtask D -> appends C & D onto [A, subB]
        const taskC = await manager.createTaskSpace("Task C", "task/c.md", true)
        expect(manager.getStackState().mode).toBe("parked")
        const subD = await manager.pushNewSubtask("Subtask D", "task/subtask-d.md")
        expect(manager.getStackState()).toEqual({
            mode: "on-stack",
            headTaskSpaceId: subD.id,
            pausedTaskSpaceIds: [taskA.id, subB.id, taskC.id],
        })
    })

    it("createTaskSpace clones open tabs and does not push onto stack", async () => {
        setOpenTabs(["src/a.rs", "src/b.rs"])
        const taskA = await manager.createTaskSpace("Task A", "task/a.md", true)
        const taskB = await manager.createTaskSpace("Task B", "task/b.md", true)

        expect(manager.getActiveTaskSpaceId()).toBe(taskB.id)
        expect(taskB.tabs.map((t) => t.path)).toEqual(["src/a.rs", "src/b.rs"])
        expect(manager.getStackState()).toEqual({
            mode: "empty",
            activeTaskSpaceId: taskB.id,
        })
        expect(manager.getTaskSpaces().map((t) => t.id)).toContain(taskA.id)
    })

    it("popTaskSpace pauses current task (stays available) and restores parent; empty stack closes tabs", async () => {
        setOpenTabs(["src/a.rs"])
        const taskA = await manager.createTaskSpace("Task A", "task/a.md", true)
        const taskB = await manager.pushNewSubtask("Task B", "task/b.md")
        setOpenTabs(["src/b.rs"])

        const outcome = await manager.popTaskSpace()
        expect(outcome?.outcome).toBe("popped-to-parent")
        expect(outcome?.poppedFrom?.id).toBe(taskB.id)
        expect(outcome?.returnedTo?.id).toBe(taskA.id)
        expect(manager.getActiveTaskSpaceId()).toBe(taskA.id)
        expect(manager.getStackState()).toEqual({
            mode: "empty",
            activeTaskSpaceId: taskA.id,
        })

        // Task B remains in Available Task Spaces with its saved tab state
        const savedB = manager.getTaskSpaces().find((ts) => ts.id === taskB.id)
        expect(savedB).toBeDefined()
        expect(savedB?.tabs.map((t) => t.path)).toEqual(["src/b.rs"])

        // Popping again with empty stack closes active task to No Task Space and clears tabs
        setOpenTabs(["src/a.rs"])
        const emptyOutcome = await manager.popTaskSpace()
        expect(emptyOutcome?.outcome).toBe("paused-empty-stack")
        expect(emptyOutcome?.poppedFrom?.id).toBe(taskA.id)
        expect(emptyOutcome?.returnedTo).toBeUndefined()
        expect(manager.getActiveTaskSpaceId()).toBeUndefined()
        expect(vscode.window.tabGroups.all[0].tabs).toHaveLength(0)

        // Popping when stack is empty and no active task returns undefined
        expect(await manager.popTaskSpace()).toBeUndefined()
    })

    it("finishCurrentTask archives, triggers jump-point cleanup callback, and pops stack or closes tabs", async () => {
        setOpenTabs(["src/a.rs"])
        const taskA = await manager.createTaskSpace("Task A", "task/a.md", true)
        mockFiles.set("/repo/task/b.md", Buffer.from("# B", "utf8"))
        const taskB = await manager.pushNewSubtask("Task B", "task/b.md")

        const returnedTo = await manager.finishCurrentTask()
        expect(returnedTo?.id).toBe(taskA.id)
        expect(deletedIds).toEqual([taskB.id])
        expect(manager.getActiveTaskSpaceId()).toBe(taskA.id)
        expect(mockFiles.has("/repo/task/done/b.md")).toBe(true)

        // Finishing the last task with empty stack returns undefined and closes tabs
        setOpenTabs(["src/a.rs"])
        const nextAfterLast = await manager.finishCurrentTask()
        expect(nextAfterLast).toBeUndefined()
        expect(deletedIds).toEqual([taskB.id, taskA.id])
        expect(manager.getActiveTaskSpaceId()).toBeUndefined()
        expect(vscode.window.tabGroups.all[0].tabs).toHaveLength(0)

        // Persisted JSON must be v6.0 with taskSpaceStackIds and no legacy fields
        const persisted = JSON.parse(
            Buffer.from(mockFiles.get(storagePath)!).toString("utf8"),
        )
        expect(persisted.version).toBe("6.0")
        expect(persisted.taskSpaceStackIds).toEqual([])
        expect(persisted.nextQueueIds).toBeUndefined()
        expect(persisted.previousStackIds).toBeUndefined()
    })
})
