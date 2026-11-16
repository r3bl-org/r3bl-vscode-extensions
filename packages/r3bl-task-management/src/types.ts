// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

export interface TabInfo {
    path: string // Relative path from workspace root
    isPinned: boolean // Whether the tab is pinned
}

/**
 * A Task Space (1:1 with `task/<name>.md`) owns a task's **Spatial Context**:
 * - **Opened Tabs (Breadth):** `tabs` + `activeTab` persisted here in `.vscode/task-spaces.json`
 * - **Jump Point Navigation (Depth):** per-task `JumpPoint[]` persisted in `.vscode/jump-points.json`
 */
export interface TaskSpace {
    name: string
    id: string
    tabs: TabInfo[] // Tab information including path and pinned state
    taskFile?: string // Relative path to task/*.md (Required in v4.0+, used for 1:1 mapping)
    activeTab?: string // Optional relative path to the active tab
    createdAt: number
    // NOTE: lastAccessed is stored separately in VSCode workspace state to avoid git noise
}

export interface TaskSpaceStorage {
    version: string // For future schema migrations
    taskSpaces: TaskSpace[]
    taskSpaceStackIds?: string[] // Explicit Task Stack (bottom-to-head, workspace-wide)
}
