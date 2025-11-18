// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

export interface TaskSpace {
  name: string;
  id: string;
  tabs: string[];                  // Relative paths from workspace root
  taskFile?: string;               // Optional relative path to task/*.md
  activeTab?: string;              // Optional relative path to the active tab
  createdAt: number;
  lastAccessed: number;
}

export interface TaskSpaceStorage {
  version: string;                 // For future schema migrations
  taskSpaces: TaskSpace[];
  activeTaskSpaceId?: string;
}
