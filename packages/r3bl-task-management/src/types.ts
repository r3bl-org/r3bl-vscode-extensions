// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

export interface TabInfo {
    path: string; // Relative path from workspace root
    isPinned: boolean; // Whether the tab is pinned
}

export interface TaskSpace {
    name: string;
    id: string;
    tabs: TabInfo[]; // Tab information including path and pinned state
    taskFile?: string; // Relative path to task/*.md (Required in v4.0+, used for 1:1 mapping)
    activeTab?: string; // Optional relative path to the active tab
    createdAt: number;
    // NOTE: lastAccessed is stored separately in VSCode workspace state to avoid git noise
}

export interface TaskSpaceStorage {
    version: string; // For future schema migrations
    taskSpaces: TaskSpace[];
    nextQueueIds?: string[]; // IDs of task spaces in the next queue (Dashboard Workflow)
    previousStackIds?: string[]; // IDs of task spaces in the previous stack (Dashboard Workflow)
}
