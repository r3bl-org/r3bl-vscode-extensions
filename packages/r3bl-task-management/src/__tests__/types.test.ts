// Copyright (c) 2024-2026 R3BL LLC. Licensed under MIT License.

import * as assert from "assert"
import { TaskSpace, TaskSpaceStorage, TabInfo } from "../types"

describe("Types Test Suite", () => {
    test("TaskSpace interface structure", () => {
        const tabs: TabInfo[] = [
            { path: "file1.ts", isPinned: false },
            { path: "file2.ts", isPinned: true },
        ]
        const taskSpace: TaskSpace = {
            name: "Test Space",
            id: "test-id-123",
            tabs,
            taskFile: "task/test.md",
            createdAt: Date.now(),
        }

        assert.strictEqual(taskSpace.name, "Test Space")
        assert.strictEqual(taskSpace.id, "test-id-123")
        assert.strictEqual(taskSpace.tabs.length, 2)
        assert.strictEqual(taskSpace.tabs[0].path, "file1.ts")
        assert.strictEqual(taskSpace.tabs[0].isPinned, false)
        assert.strictEqual(taskSpace.tabs[1].path, "file2.ts")
        assert.strictEqual(taskSpace.tabs[1].isPinned, true)
        assert.strictEqual(taskSpace.taskFile, "task/test.md")
        assert.ok(taskSpace.createdAt > 0)
    })

    test("TaskSpace without optional taskFile", () => {
        const taskSpace: TaskSpace = {
            name: "Test Space",
            id: "test-id-123",
            tabs: [],
            createdAt: Date.now(),
        }

        assert.strictEqual(taskSpace.taskFile, undefined)
    })

    test("TaskSpaceStorage interface structure", () => {
        const storage: TaskSpaceStorage = {
            version: "6.0",
            taskSpaces: [],
            taskSpaceStackIds: [],
        }

        assert.strictEqual(storage.version, "6.0")
        assert.strictEqual(storage.taskSpaces.length, 0)
        assert.strictEqual(storage.taskSpaceStackIds?.length, 0)
    })

    test("TaskSpaceStorage with task space and stack IDs", () => {
        const taskSpace: TaskSpace = {
            name: "Test",
            id: "id-1",
            tabs: [],
            createdAt: Date.now(),
        }

        const storage: TaskSpaceStorage = {
            version: "6.0",
            taskSpaces: [taskSpace],
            taskSpaceStackIds: ["id-1"],
        }

        assert.strictEqual(storage.taskSpaces.length, 1)
        assert.strictEqual(storage.taskSpaces[0].id, "id-1")
        assert.deepStrictEqual(storage.taskSpaceStackIds, ["id-1"])
    })

    test("Empty tabs array is valid", () => {
        const taskSpace: TaskSpace = {
            name: "Empty Space",
            id: "empty-id",
            tabs: [],
            createdAt: Date.now(),
        }

        assert.strictEqual(taskSpace.tabs.length, 0)
        assert.ok(Array.isArray(taskSpace.tabs))
    })
})
