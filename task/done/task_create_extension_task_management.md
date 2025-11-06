<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
  - [Purpose](#purpose)
  - [Key Features](#key-features)
- [Technical Approach](#technical-approach)
  - [Data Model](#data-model)
  - [Storage Strategy](#storage-strategy)
  - [VSCode APIs to Use](#vscode-apis-to-use)
- [Implementation Plan](#implementation-plan)
  - [Step 0: Create Extension Package Structure](#step-0-create-extension-package-structure)
    - [Step 0.0: Create Directory Structure](#step-00-create-directory-structure)
    - [Step 0.1: Create package.json](#step-01-create-packagejson)
    - [Step 0.2: Create tsconfig.json](#step-02-create-tsconfigjson)
    - [Step 0.3: Create .vscodeignore](#step-03-create-vscodeignore)
    - [Step 0.4: Copy License and Logo Files](#step-04-copy-license-and-logo-files)
  - [Step 1: Implement Core Data Structures and Storage](#step-1-implement-core-data-structures-and-storage)
    - [Step 1.0: Create src/types.ts](#step-10-create-srctypests)
    - [Step 1.1: Create src/storage.ts](#step-11-create-srcstoragets)
  - [Step 2: Implement Task Space Manager](#step-2-implement-task-space-manager)
    - [Step 2.0: Create src/taskSpaceManager.ts](#step-20-create-srctaskspacemanagerts)
    - [Step 2.1: Implement Tab Management Methods](#step-21-implement-tab-management-methods)
    - [Step 2.2: Implement Task Space Operations](#step-22-implement-task-space-operations)
  - [Step 3: Implement Quick Pick UI](#step-3-implement-quick-pick-ui)
    - [Step 3.0: Create Main Dialog Handler](#step-30-create-main-dialog-handler)
    - [Step 3.1: Implement Create Task Space Flow](#step-31-implement-create-task-space-flow)
    - [Step 3.2: Implement Switch Task Space Flow](#step-32-implement-switch-task-space-flow)
    - [Step 3.3: Implement Delete Task Space Flow](#step-33-implement-delete-task-space-flow)
    - [Step 3.4: Implement Rename Task Space Flow](#step-34-implement-rename-task-space-flow)
  - [Step 4: Implement Status Bar Indicator](#step-4-implement-status-bar-indicator)
    - [Step 4.0: Create Status Bar Item](#step-40-create-status-bar-item)
    - [Step 4.1: Update Status Bar on Task Space Changes](#step-41-update-status-bar-on-task-space-changes)
  - [Step 5: Implement Auto-Save Tabs](#step-5-implement-auto-save-tabs)
    - [Step 5.0: Listen to Tab Changes](#step-50-listen-to-tab-changes)
    - [Step 5.1: Debounce Tab Updates](#step-51-debounce-tab-updates)
  - [Step 6: Implement Extension Lifecycle](#step-6-implement-extension-lifecycle)
    - [Step 6.0: Create src/extension.ts](#step-60-create-srcextensiontsx)
  - [Step 7: Polish and Edge Cases](#step-7-polish-and-edge-cases)
    - [Step 7.0: Handle Edge Cases](#step-70-handle-edge-cases)
    - [Step 7.1: Add User Feedback](#step-71-add-user-feedback)
    - [Step 7.2: Add Configuration Options](#step-72-add-configuration-options)
  - [Step 8: Integrate into Extension Pack](#step-8-integrate-into-extension-pack)
  - [Step 9: Update Build Infrastructure](#step-9-update-build-infrastructure)
    - [Step 9.0: Update Root package.json](#step-90-update-root-packagejson)
    - [Step 9.1: Update build.sh](#step-91-update-buildsh)
    - [Step 9.2: Update install.sh](#step-92-update-installsh)
    - [Step 9.3: Update script_lib.sh](#step-93-update-script_libsh)
  - [Step 10: Testing Plan](#step-10-testing-plan)
    - [Step 10.0: Manual Testing Checklist](#step-100-manual-testing-checklist)
    - [Step 10.1: Build and Package](#step-101-build-and-package)
- [Future Enhancements (Post-MVP)](#future-enhancements-post-mvp)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Overview

This extension provides task space management for VSCode, allowing users to organize their work by switching between different collections of open tabs. Each task space can optionally be linked to a task markdown file for tracking work items.

This extension is inspired by the [IntelliJ Task Management plugin](https://plugins.jetbrains.com/plugin/11545-task-management) and brings similar functionality to VSCode.

## Purpose

When working on multiple features or tasks simultaneously, developers need a way to:
1. Group related files together into "task spaces"
2. Quickly switch between different contexts without losing their place
3. Optionally associate a task tracking file with each task space
4. Manage task spaces (create, switch, delete, modify) through a single keyboard shortcut

## Key Features

1. **Quick Access**: `Alt+Shift+T` brings up a dialog for all task management operations
2. **Task Spaces**: Collections of open editor tabs that can be saved and restored
3. **Context Switching**: Seamlessly switch between task spaces (closes current tabs, opens new ones)
4. **Auto-Save**: Tabs are automatically saved when opened/closed/moved within a task space
5. **Status Bar Indicator**: Always know which task space you're currently in
6. **Task File Association**: Optionally link a `task/*.md` file that's always open in that task space
7. **Full Management**: Create, switch to, rename, and delete task spaces from the same interface
8. **Workspace-Specific**: Task spaces stored in `.vscode/task-spaces.json` (can be shared with team)

---

# Technical Approach

## Data Model

```typescript
interface TaskSpace {
  name: string;                    // Display name for the task space
  id: string;                      // Unique identifier (UUID)
  tabs: string[];                  // Array of relative file paths (from workspace root)
  taskFile?: string;               // Optional: relative path to task/*.md file
  createdAt: number;               // Timestamp
  lastAccessed: number;            // Timestamp
}

interface TaskSpaceStorage {
  version: string;                 // Schema version (for future migrations)
  taskSpaces: TaskSpace[];
  activeTaskSpaceId?: string;      // Currently active task space
}
```

## Storage Strategy

**Primary Storage**: `.vscode/task-spaces.json` file in the workspace

```json
{
  "version": "1.0",
  "taskSpaces": [
    {
      "name": "Feature: User Auth",
      "id": "uuid-1234",
      "tabs": [
        "src/auth/login.ts",
        "src/auth/signup.ts",
        "tests/auth.test.ts"
      ],
      "taskFile": "task/auth_feature.md",
      "createdAt": 1234567890,
      "lastAccessed": 1234567899
    }
  ],
  "activeTaskSpaceId": "uuid-1234"
}
```

**Benefits**:
- ✅ Workspace-specific (each project has its own task spaces)
- ✅ Can be committed to git (team can share task spaces)
- ✅ Syncs automatically if `.vscode` folder is synced
- ✅ Easy to inspect and edit manually if needed
- ✅ Works with VSCode's built-in settings sync

**Fallback**: Use `globalState` when no workspace is open (for single-file editing scenarios)

**File Paths**: Store as relative paths from workspace root for portability across machines

## VSCode APIs to Use

1. **Tab Management**: `vscode.window.tabGroups` API (VSCode 1.70+)
   - `vscode.window.tabGroups.all` - Get all currently open tabs
   - `vscode.window.tabGroups.onDidChangeTabs` - Listen for tab changes (for auto-save)
   - `vscode.window.tabGroups.close()` - Close tabs programmatically
   - `vscode.window.showTextDocument()` - Open files in the editor

2. **Quick Pick Dialog**: `vscode.window.createQuickPick()`
   - Main interface for all task space operations
   - Show list of existing task spaces with action buttons
   - Support for creating new task spaces inline

3. **Input Box**: `vscode.window.showInputBox()`
   - Get task space names from user
   - Rename operations

4. **File System**: `vscode.workspace.fs`
   - Read/write `.vscode/task-spaces.json`
   - Check if files exist

5. **Status Bar**: `vscode.window.createStatusBarItem()`
   - Show current task space
   - Click to open dialog

6. **Workspace**: `vscode.workspace.workspaceFolders`
   - Get workspace root for relative paths
   - Calculate relative paths from workspace root

---

# Implementation Plan

## Step 0: Create Extension Package Structure

### Step 0.0: Create Directory Structure

Create the extension directory with necessary subdirectories:

```
packages/r3bl-task-management/
├── src/
│   ├── extension.ts           # Main extension entry point
│   ├── taskSpaceManager.ts    # Core task space management logic
│   ├── storage.ts             # Storage abstraction layer
│   └── types.ts               # TypeScript type definitions
├── package.json
├── tsconfig.json
├── .vscodeignore
├── LICENSE
└── r3bl-cube-logo.png
```

Commands to create:
```bash
mkdir -p packages/r3bl-task-management/src
```

### Step 0.1: Create package.json

Create `packages/r3bl-task-management/package.json` with the following structure:

```json
{
  "name": "r3bl-task-management",
  "displayName": "R3BL Task Management",
  "description": "Manage task spaces - collections of open tabs for different work contexts",
  "version": "1.0.0",
  "publisher": "R3BL",
  "engines": {
    "vscode": "^1.70.0"
  },
  "categories": ["Other"],
  "icon": "r3bl-cube-logo.png",
  "repository": {
    "type": "git",
    "url": "https://github.com/r3bl-org/r3bl-vscode-extensions.git",
    "directory": "packages/r3bl-task-management"
  },
  "activationEvents": [
    "onStartupFinished"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "r3bl-task-management.showTaskSpaces",
        "title": "Manage Task Spaces",
        "category": "R3BL"
      }
    ],
    "keybindings": [
      {
        "command": "r3bl-task-management.showTaskSpaces",
        "key": "alt+shift+t",
        "when": "!terminalFocus"
      }
    ],
    "configuration": {
      "title": "R3BL Task Management",
      "properties": {
        "r3bl-task-management.autoSaveCurrentTaskSpace": {
          "type": "boolean",
          "default": true,
          "description": "Automatically save the current task space when tabs change"
        },
        "r3bl-task-management.confirmBeforeSwitch": {
          "type": "boolean",
          "default": false,
          "description": "Show confirmation dialog before switching task spaces"
        },
        "r3bl-task-management.showStatusBar": {
          "type": "boolean",
          "default": true,
          "description": "Show current task space in status bar"
        }
      }
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "@types/vscode": "^1.70.0",
    "typescript": "^5.0.0"
  }
}
```

Key configuration notes:
- **Engine requirement**: VSCode 1.70+ for `tabGroups` API
- **Activation**: On startup (`onStartupFinished`)
- **Keybinding**: `Alt+Shift+T` (disabled when terminal has focus)
- **Settings**: Allow users to disable auto-save, enable confirmation dialogs, hide status bar

### Step 0.2: Create tsconfig.json

Create `packages/r3bl-task-management/tsconfig.json` with TypeScript compilation settings:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "out",
    "lib": ["ES2020"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "exclude": ["node_modules", ".vscode-test"]
}
```

### Step 0.3: Create .vscodeignore

Create `packages/r3bl-task-management/.vscodeignore` to exclude unnecessary files from the VSIX package:

```
.git
.gitignore
src
tsconfig.json
.vscode-test
*.vsix
node_modules
.vscode
```

### Step 0.4: Copy License and Logo Files

Copy the following files from another extension package:

```bash
cp packages/r3bl-semantic-config/LICENSE packages/r3bl-task-management/LICENSE
cp packages/r3bl-semantic-config/r3bl-cube-logo.png packages/r3bl-task-management/r3bl-cube-logo.png
```

---

## Step 1: Implement Core Data Structures and Storage

### Step 1.0: Create src/types.ts

Define TypeScript interfaces for task spaces and storage:

```typescript
export interface TaskSpace {
  name: string;
  id: string;
  tabs: string[];                  // Relative paths from workspace root
  taskFile?: string;               // Optional relative path to task/*.md
  createdAt: number;
  lastAccessed: number;
}

export interface TaskSpaceStorage {
  version: string;                 // For future schema migrations
  taskSpaces: TaskSpace[];
  activeTaskSpaceId?: string;
}
```

### Step 1.1: Create src/storage.ts

Implement storage abstraction that reads/writes `.vscode/task-spaces.json`:

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import { TaskSpace, TaskSpaceStorage } from './types';

const STORAGE_FILE = '.vscode/task-spaces.json';
const CURRENT_VERSION = '1.0';

export class Storage {
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Load task spaces from .vscode/task-spaces.json
   * Falls back to globalState if no workspace is open
   */
  async loadTaskSpaces(): Promise<TaskSpaceStorage> {
    const workspaceFolder = this.getWorkspaceFolder();

    if (workspaceFolder) {
      // Try to load from .vscode/task-spaces.json
      const storageUri = vscode.Uri.joinPath(workspaceFolder.uri, STORAGE_FILE);

      try {
        const content = await vscode.workspace.fs.readFile(storageUri);
        const data = JSON.parse(content.toString()) as TaskSpaceStorage;
        return this.migrateIfNeeded(data);
      } catch (error) {
        // File doesn't exist or is invalid, return empty storage
        return this.createEmptyStorage();
      }
    } else {
      // No workspace, use globalState
      const data = this.context.globalState.get<TaskSpaceStorage>('taskSpaces');
      return data ? this.migrateIfNeeded(data) : this.createEmptyStorage();
    }
  }

  /**
   * Save task spaces to .vscode/task-spaces.json
   * Falls back to globalState if no workspace is open
   */
  async saveTaskSpaces(data: TaskSpaceStorage): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();

    if (workspaceFolder) {
      // Ensure .vscode directory exists
      const vscodeDir = vscode.Uri.joinPath(workspaceFolder.uri, '.vscode');
      try {
        await vscode.workspace.fs.createDirectory(vscodeDir);
      } catch {
        // Directory might already exist, ignore error
      }

      // Write to .vscode/task-spaces.json
      const storageUri = vscode.Uri.joinPath(workspaceFolder.uri, STORAGE_FILE);
      const content = JSON.stringify(data, null, 2);
      await vscode.workspace.fs.writeFile(storageUri, Buffer.from(content, 'utf8'));
    } else {
      // No workspace, use globalState
      await this.context.globalState.update('taskSpaces', data);
    }
  }

  /**
   * Get the current workspace folder
   * Returns undefined if no workspace is open
   */
  private getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
    const folders = vscode.workspace.workspaceFolders;
    return folders && folders.length > 0 ? folders[0] : undefined;
  }

  /**
   * Create empty storage structure
   */
  private createEmptyStorage(): TaskSpaceStorage {
    return {
      version: CURRENT_VERSION,
      taskSpaces: [],
      activeTaskSpaceId: undefined
    };
  }

  /**
   * Migrate storage to current version if needed
   */
  private migrateIfNeeded(data: TaskSpaceStorage): TaskSpaceStorage {
    // Future-proofing: handle schema migrations here
    if (!data.version) {
      data.version = CURRENT_VERSION;
    }
    return data;
  }
}
```

**Key implementation details**:
- Primary storage: `.vscode/task-spaces.json` in workspace
- Fallback: `globalState` when no workspace is open
- Creates `.vscode` directory if it doesn't exist
- Handles file read/write errors gracefully
- Pretty-prints JSON for human readability
- Includes version field for future schema migrations

---

## Step 2: Implement Task Space Manager

### Step 2.0: Create src/taskSpaceManager.ts

Core class that manages all task space operations:

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import { TaskSpace, TaskSpaceStorage } from './types';
import { Storage } from './storage';
import { randomUUID } from 'crypto';

export class TaskSpaceManager {
  private storage: Storage;
  private data: TaskSpaceStorage;

  constructor(context: vscode.ExtensionContext) {
    this.storage = new Storage(context);
    this.data = { version: '1.0', taskSpaces: [], activeTaskSpaceId: undefined };
  }

  /**
   * Initialize manager by loading data from storage
   */
  async initialize(): Promise<void> {
    this.data = await this.storage.loadTaskSpaces();
  }

  /**
   * Save current state to storage
   */
  private async save(): Promise<void> {
    await this.storage.saveTaskSpaces(this.data);
  }

  /**
   * Get all task spaces
   */
  getTaskSpaces(): TaskSpace[] {
    return [...this.data.taskSpaces];
  }

  /**
   * Get active task space
   */
  getActiveTaskSpace(): TaskSpace | undefined {
    return this.data.taskSpaces.find(ts => ts.id === this.data.activeTaskSpaceId);
  }

  /**
   * Get active task space ID
   */
  getActiveTaskSpaceId(): string | undefined {
    return this.data.activeTaskSpaceId;
  }

  /**
   * Create a new task space with current open tabs
   */
  async createTaskSpace(name: string, taskFile?: string): Promise<TaskSpace> {
    // Validate name is unique
    if (this.data.taskSpaces.some(ts => ts.name === name)) {
      throw new Error(`Task space "${name}" already exists`);
    }

    const currentTabs = await this.getCurrentOpenTabs();

    const taskSpace: TaskSpace = {
      name,
      id: randomUUID(),
      tabs: currentTabs,
      taskFile,
      createdAt: Date.now(),
      lastAccessed: Date.now()
    };

    this.data.taskSpaces.push(taskSpace);
    await this.save();

    return taskSpace;
  }

  /**
   * Delete a task space
   */
  async deleteTaskSpace(id: string): Promise<void> {
    const index = this.data.taskSpaces.findIndex(ts => ts.id === id);
    if (index === -1) {
      throw new Error('Task space not found');
    }

    this.data.taskSpaces.splice(index, 1);

    // Clear active if we deleted the active task space
    if (this.data.activeTaskSpaceId === id) {
      this.data.activeTaskSpaceId = undefined;
    }

    await this.save();
  }

  /**
   * Switch to a different task space
   */
  async switchToTaskSpace(id: string): Promise<void> {
    const taskSpace = this.data.taskSpaces.find(ts => ts.id === id);
    if (!taskSpace) {
      throw new Error('Task space not found');
    }

    // Save current task space tabs before switching (if there's an active one)
    const currentActive = this.getActiveTaskSpace();
    if (currentActive) {
      const currentTabs = await this.getCurrentOpenTabs();
      await this.updateTaskSpaceTabs(currentActive.id, currentTabs);
    }

    // Close all current tabs
    await this.closeAllTabs();

    // Open tabs from target task space
    await this.openTabs(taskSpace.tabs, taskSpace.taskFile);

    // Update active task space
    this.data.activeTaskSpaceId = id;
    taskSpace.lastAccessed = Date.now();

    await this.save();
  }

  /**
   * Rename a task space
   */
  async renameTaskSpace(id: string, newName: string): Promise<void> {
    const taskSpace = this.data.taskSpaces.find(ts => ts.id === id);
    if (!taskSpace) {
      throw new Error('Task space not found');
    }

    // Validate new name is unique
    if (this.data.taskSpaces.some(ts => ts.name === newName && ts.id !== id)) {
      throw new Error(`Task space "${newName}" already exists`);
    }

    taskSpace.name = newName;
    await this.save();
  }

  /**
   * Update tabs for a task space
   */
  async updateTaskSpaceTabs(id: string, tabs: string[]): Promise<void> {
    const taskSpace = this.data.taskSpaces.find(ts => ts.id === id);
    if (!taskSpace) {
      throw new Error('Task space not found');
    }

    taskSpace.tabs = tabs;
    await this.save();
  }

  // Tab management methods implemented in next step...
}
```

### Step 2.1: Implement Tab Management Methods

Add these methods to `TaskSpaceManager`:

```typescript
/**
 * Get currently open tabs as relative paths from workspace root
 */
async getCurrentOpenTabs(): Promise<string[]> {
  const workspaceFolder = this.getWorkspaceFolder();
  if (!workspaceFolder) {
    // No workspace, return absolute paths
    return this.getOpenTabsAbsolute();
  }

  const tabs: string[] = [];
  const workspaceRoot = workspaceFolder.uri.fsPath;

  for (const tabGroup of vscode.window.tabGroups.all) {
    for (const tab of tabGroup.tabs) {
      const input = tab.input;

      // Only include file tabs (not settings, output, etc.)
      if (input instanceof vscode.TabInputText) {
        const filePath = input.uri.fsPath;

        // Convert to relative path from workspace root
        const relativePath = path.relative(workspaceRoot, filePath);

        // Only include files within workspace
        if (!relativePath.startsWith('..')) {
          tabs.push(relativePath);
        }
      }
    }
  }

  // Remove duplicates (same file might be open in multiple groups)
  return [...new Set(tabs)];
}

/**
 * Get currently open tabs as absolute paths (fallback when no workspace)
 */
private getOpenTabsAbsolute(): string[] {
  const tabs: string[] = [];

  for (const tabGroup of vscode.window.tabGroups.all) {
    for (const tab of tabGroup.tabs) {
      const input = tab.input;

      if (input instanceof vscode.TabInputText) {
        tabs.push(input.uri.fsPath);
      }
    }
  }

  return [...new Set(tabs)];
}

/**
 * Close all open tabs
 */
async closeAllTabs(): Promise<void> {
  // Close all tab groups
  for (const tabGroup of vscode.window.tabGroups.all) {
    await vscode.window.tabGroups.close(tabGroup);
  }
}

/**
 * Open tabs from file paths
 * @param tabs - Array of relative paths (from workspace root) or absolute paths
 * @param taskFile - Optional task file to open last (will be the active tab)
 */
async openTabs(tabs: string[], taskFile?: string): Promise<void> {
  const workspaceFolder = this.getWorkspaceFolder();
  const errors: string[] = [];

  // Helper to convert relative path to absolute
  const toAbsolutePath = (relativePath: string): string => {
    if (path.isAbsolute(relativePath)) {
      return relativePath;
    }
    if (workspaceFolder) {
      return path.join(workspaceFolder.uri.fsPath, relativePath);
    }
    return relativePath;
  };

  // Open regular tabs first
  for (const tab of tabs) {
    try {
      const absolutePath = toAbsolutePath(tab);
      const uri = vscode.Uri.file(absolutePath);

      await vscode.window.showTextDocument(uri, {
        preview: false,  // Don't open in preview mode
        preserveFocus: true  // Don't steal focus
      });
    } catch (error) {
      errors.push(tab);
    }
  }

  // Open task file last (if specified) so it becomes the active tab
  if (taskFile) {
    try {
      const absolutePath = toAbsolutePath(taskFile);
      const uri = vscode.Uri.file(absolutePath);

      await vscode.window.showTextDocument(uri, {
        preview: false,
        preserveFocus: false  // This one gets focus
      });
    } catch (error) {
      errors.push(taskFile);
    }
  }

  // Show notification if any files failed to open
  if (errors.length > 0) {
    vscode.window.showWarningMessage(
      `Failed to open ${errors.length} file(s): ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`
    );
  }
}

/**
 * Get workspace folder (first one if multiple)
 */
private getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  const folders = vscode.workspace.workspaceFolders;
  return folders && folders.length > 0 ? folders[0] : undefined;
}
```

### Step 2.2: Implement Task Space Operations

The main operations are already implemented in Step 2.0:
- `createTaskSpace()` - Create new task space with current tabs
- `deleteTaskSpace()` - Remove a task space
- `switchToTaskSpace()` - Switch contexts (save current, close tabs, open new tabs)
- `renameTaskSpace()` - Change task space name
- `updateTaskSpaceTabs()` - Update tabs array (used by auto-save)

**Key behaviors**:
- Switching automatically saves current task space tabs
- File paths stored as relative paths for portability
- Falls back to absolute paths when no workspace is open
- Handles missing files gracefully (shows warning, continues)
- Task file always opens last (becomes active tab)

---

## Step 3: Implement Quick Pick UI

### Step 3.0: Create Main Dialog Handler

The main dialog uses `vscode.window.createQuickPick()` for a rich, interactive UI:

```typescript
interface TaskSpaceQuickPickItem extends vscode.QuickPickItem {
  taskSpace?: TaskSpace;
  action?: 'create' | 'switch';
}

async function showTaskSpacesDialog(manager: TaskSpaceManager, statusBar: vscode.StatusBarItem) {
  const quickPick = vscode.window.createQuickPick<TaskSpaceQuickPickItem>();
  quickPick.placeholder = 'Select a task space or create a new one';
  quickPick.matchOnDescription = true;
  quickPick.matchOnDetail = true;

  // Populate items
  const items: TaskSpaceQuickPickItem[] = [];

  // Add "Create New" option at the top
  items.push({
    label: '$(add) Create New Task Space',
    description: '',
    action: 'create'
  });

  // Add separator
  items.push({
    label: '',
    kind: vscode.QuickPickItemKind.Separator
  });

  // Add existing task spaces
  const taskSpaces = manager.getTaskSpaces();
  const activeId = manager.getActiveTaskSpaceId();

  // Sort by last accessed (most recent first)
  const sortedSpaces = [...taskSpaces].sort((a, b) => b.lastAccessed - a.lastAccessed);

  for (const ts of sortedSpaces) {
    const isActive = ts.id === activeId;
    items.push({
      label: `${isActive ? '$(arrow-right) ' : '$(book) '}${ts.name}`,
      description: `${ts.tabs.length} tabs${ts.taskFile ? ' 📄' : ''}`,
      detail: `Last accessed: ${formatRelativeTime(ts.lastAccessed)}`,
      taskSpace: ts,
      action: 'switch',
      buttons: [
        {
          iconPath: new vscode.ThemeIcon('edit'),
          tooltip: 'Rename'
        },
        {
          iconPath: new vscode.ThemeIcon('trash'),
          tooltip: 'Delete'
        }
      ]
    });
  }

  quickPick.items = items;

  // Handle selection (Enter key)
  quickPick.onDidAccept(async () => {
    const selected = quickPick.selectedItems[0];
    if (!selected) {
      return;
    }

    quickPick.hide();

    if (selected.action === 'create') {
      await handleCreateTaskSpace(manager, statusBar);
    } else if (selected.action === 'switch' && selected.taskSpace) {
      await handleSwitchTaskSpace(manager, selected.taskSpace, statusBar);
    }
  });

  // Handle button clicks
  quickPick.onDidTriggerItemButton(async (e) => {
    const item = e.item as TaskSpaceQuickPickItem;
    if (!item.taskSpace) {
      return;
    }

    const button = e.button;

    if (button.tooltip === 'Rename') {
      quickPick.hide();
      await handleRenameTaskSpace(manager, item.taskSpace, statusBar);
      // Re-show dialog after rename
      await showTaskSpacesDialog(manager, statusBar);
    } else if (button.tooltip === 'Delete') {
      quickPick.hide();
      await handleDeleteTaskSpace(manager, item.taskSpace, statusBar);
      // Re-show dialog after delete
      await showTaskSpacesDialog(manager, statusBar);
    }
  });

  quickPick.onDidHide(() => quickPick.dispose());
  quickPick.show();
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  return 'Just now';
}
```

**UI Features**:
- "Create New" option always at the top
- Active task space indicated with arrow icon (`$(arrow-right)`)
- Inactive task spaces have book icon (`$(book)`)
- Tab count and task file indicator in description
- Relative time in detail line
- Action buttons for rename and delete
- Items sorted by most recently accessed

### Step 3.1: Implement Create Task Space Flow

```typescript
async function handleCreateTaskSpace(manager: TaskSpaceManager, statusBar: vscode.StatusBarItem) {
  // Step 1: Get task space name
  const name = await vscode.window.showInputBox({
    prompt: 'Enter task space name',
    placeHolder: 'e.g., Feature: User Authentication',
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Task space name cannot be empty';
      }

      // Check for duplicate names
      const taskSpaces = manager.getTaskSpaces();
      if (taskSpaces.some(ts => ts.name === value)) {
        return `Task space "${value}" already exists`;
      }

      return null;
    }
  });

  if (!name) {
    return; // User cancelled
  }

  // Step 2: Optionally link a task file
  const linkTaskFile = await vscode.window.showQuickPick(
    [
      { label: 'Yes', description: 'Link a task/*.md file' },
      { label: 'No', description: 'Create without task file' }
    ],
    { placeHolder: 'Link a task file?' }
  );

  let taskFile: string | undefined;

  if (linkTaskFile?.label === 'Yes') {
    // Show files from task/ directory
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      const taskDir = vscode.Uri.joinPath(workspaceFolder.uri, 'task');

      try {
        const files = await vscode.workspace.fs.readDirectory(taskDir);
        const mdFiles = files
          .filter(([name, type]) => type === vscode.FileType.File && name.endsWith('.md'))
          .map(([name]) => ({
            label: name,
            description: 'task/' + name
          }));

        if (mdFiles.length > 0) {
          const selected = await vscode.window.showQuickPick(
            [{ label: 'None', description: 'No task file' }, ...mdFiles],
            { placeHolder: 'Select a task file' }
          );

          if (selected && selected.label !== 'None') {
            taskFile = 'task/' + selected.label;
          }
        } else {
          vscode.window.showInformationMessage('No .md files found in task/ directory');
        }
      } catch {
        // task/ directory doesn't exist
        vscode.window.showInformationMessage('task/ directory not found');
      }
    }
  }

  // Step 3: Create task space with current tabs
  try {
    const taskSpace = await manager.createTaskSpace(name, taskFile);

    // Switch to the new task space
    await manager.switchToTaskSpace(taskSpace.id);

    // Update status bar
    updateStatusBar(statusBar, manager);

    // Show confirmation
    vscode.window.showInformationMessage(
      `Task space "${name}" created with ${taskSpace.tabs.length} tab(s)`
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create task space: ${error}`);
  }
}
```

### Step 3.2: Implement Switch Task Space Flow

```typescript
async function handleSwitchTaskSpace(
  manager: TaskSpaceManager,
  taskSpace: TaskSpace,
  statusBar: vscode.StatusBarItem
) {
  // Check if already active
  if (manager.getActiveTaskSpaceId() === taskSpace.id) {
    vscode.window.showInformationMessage(`Already in task space "${taskSpace.name}"`);
    return;
  }

  // Optional: Confirm before switching (if configured)
  const config = vscode.workspace.getConfiguration('r3bl-task-management');
  const confirmBeforeSwitch = config.get<boolean>('confirmBeforeSwitch', false);

  if (confirmBeforeSwitch) {
    const confirm = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Switch task space' },
        { label: 'No', description: 'Cancel' }
      ],
      { placeHolder: `Switch to task space "${taskSpace.name}"?` }
    );

    if (confirm?.label !== 'Yes') {
      return;
    }
  }

  // Show progress indicator
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Switching to "${taskSpace.name}"...`,
      cancellable: false
    },
    async (progress) => {
      try {
        progress.report({ increment: 0 });

        // Switch task space
        await manager.switchToTaskSpace(taskSpace.id);

        progress.report({ increment: 100 });

        // Update status bar
        updateStatusBar(statusBar, manager);

        // Show confirmation
        vscode.window.showInformationMessage(
          `Switched to "${taskSpace.name}" (${taskSpace.tabs.length} tabs)`
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to switch task space: ${error}`);
      }
    }
  );
}
```

### Step 3.3: Implement Delete Task Space Flow

```typescript
async function handleDeleteTaskSpace(
  manager: TaskSpaceManager,
  taskSpace: TaskSpace,
  statusBar: vscode.StatusBarItem
) {
  // Confirm deletion
  const confirm = await vscode.window.showWarningMessage(
    `Delete task space "${taskSpace.name}"? This cannot be undone.`,
    { modal: true },
    'Delete'
  );

  if (confirm !== 'Delete') {
    return;
  }

  try {
    await manager.deleteTaskSpace(taskSpace.id);

    // Update status bar
    updateStatusBar(statusBar, manager);

    // Show confirmation
    vscode.window.showInformationMessage(`Task space "${taskSpace.name}" deleted`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to delete task space: ${error}`);
  }
}
```

### Step 3.4: Implement Rename Task Space Flow

```typescript
async function handleRenameTaskSpace(
  manager: TaskSpaceManager,
  taskSpace: TaskSpace,
  statusBar: vscode.StatusBarItem
) {
  const newName = await vscode.window.showInputBox({
    prompt: 'Enter new task space name',
    value: taskSpace.name,
    placeHolder: taskSpace.name,
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Task space name cannot be empty';
      }

      // Check for duplicate names (excluding current task space)
      const taskSpaces = manager.getTaskSpaces();
      if (taskSpaces.some(ts => ts.name === value && ts.id !== taskSpace.id)) {
        return `Task space "${value}" already exists`;
      }

      return null;
    }
  });

  if (!newName || newName === taskSpace.name) {
    return; // User cancelled or no change
  }

  try {
    await manager.renameTaskSpace(taskSpace.id, newName);

    // Update status bar
    updateStatusBar(statusBar, manager);

    // Show confirmation
    vscode.window.showInformationMessage(`Task space renamed to "${newName}"`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to rename task space: ${error}`);
  }
}
```

---

## Step 4: Implement Status Bar Indicator

### Step 4.0: Create Status Bar Item

The status bar shows the current task space and is clickable:

```typescript
function createStatusBarItem(): vscode.StatusBarItem {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100  // Priority (higher = more left)
  );

  statusBarItem.command = 'r3bl-task-management.showTaskSpaces';
  statusBarItem.tooltip = 'Click to manage task spaces (Alt+Shift+T)';

  return statusBarItem;
}
```

### Step 4.1: Update Status Bar on Task Space Changes

```typescript
function updateStatusBar(statusBarItem: vscode.StatusBarItem, manager: TaskSpaceManager) {
  // Check if status bar is enabled in settings
  const config = vscode.workspace.getConfiguration('r3bl-task-management');
  const showStatusBar = config.get<boolean>('showStatusBar', true);

  if (!showStatusBar) {
    statusBarItem.hide();
    return;
  }

  const activeTaskSpace = manager.getActiveTaskSpace();

  if (activeTaskSpace) {
    statusBarItem.text = `$(book) ${activeTaskSpace.name} (${activeTaskSpace.tabs.length})`;
    statusBarItem.backgroundColor = undefined;  // Default background
    statusBarItem.show();
  } else {
    statusBarItem.text = '$(book) No Task Space';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    statusBarItem.show();
  }
}
```

**Status Bar Display**:
- Active task space: `📋 MyFeature (5)` - Shows name and tab count
- No task space: `📋 No Task Space` - Yellow warning background
- Hidden if user disables in settings
- Always clickable to open dialog

---

## Step 5: Implement Auto-Save Tabs

### Step 5.0: Listen to Tab Changes

Register listener in extension activation:

```typescript
let autoSaveTimeout: NodeJS.Timeout | undefined;

const tabChangeDisposable = vscode.window.tabGroups.onDidChangeTabs(async (e) => {
  // Check if auto-save is enabled
  const config = vscode.workspace.getConfiguration('r3bl-task-management');
  const autoSave = config.get<boolean>('autoSaveCurrentTaskSpace', true);

  if (!autoSave) {
    return;
  }

  // Only auto-save if we have an active task space
  const activeTaskSpace = manager.getActiveTaskSpace();
  if (!activeTaskSpace) {
    return;
  }

  // Debounce: wait 500ms after last change before saving
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }

  autoSaveTimeout = setTimeout(async () => {
    try {
      const currentTabs = await manager.getCurrentOpenTabs();
      await manager.updateTaskSpaceTabs(activeTaskSpace.id, currentTabs);

      // Update status bar (tab count might have changed)
      updateStatusBar(statusBarItem, manager);
    } catch (error) {
      console.error('Failed to auto-save task space:', error);
    }
  }, 500);
});

context.subscriptions.push(tabChangeDisposable);
```

### Step 5.1: Debounce Tab Updates

The debouncing logic (shown above) prevents excessive writes:
- Waits 500ms after last tab change before saving
- Clears previous timeout if new change occurs
- Reduces disk I/O and performance impact
- User configurable via `autoSaveCurrentTaskSpace` setting

**Benefits of Auto-Save**:
- ✅ No manual "Update Tabs" action needed
- ✅ Task space always reflects current state
- ✅ Can't forget to save changes
- ✅ Seamless user experience
- ✅ Can be disabled if desired

---

## Step 6: Implement Extension Lifecycle

### Step 6.0: Create src/extension.ts

Main extension entry point that ties everything together:

```typescript
import * as vscode from 'vscode';
import { TaskSpaceManager } from './taskSpaceManager';

let manager: TaskSpaceManager;
let statusBarItem: vscode.StatusBarItem;
let autoSaveTimeout: NodeJS.Timeout | undefined;

export async function activate(context: vscode.ExtensionContext) {
  console.log('R3BL Task Management extension is now active');

  // Initialize manager
  manager = new TaskSpaceManager(context);
  await manager.initialize();

  // Create status bar item
  statusBarItem = createStatusBarItem();
  updateStatusBar(statusBarItem, manager);
  context.subscriptions.push(statusBarItem);

  // Register main command
  const showCommand = vscode.commands.registerCommand(
    'r3bl-task-management.showTaskSpaces',
    async () => {
      await showTaskSpacesDialog(manager, statusBarItem);
    }
  );
  context.subscriptions.push(showCommand);

  // Register auto-save listener
  const tabChangeDisposable = vscode.window.tabGroups.onDidChangeTabs(async (e) => {
    // Check if auto-save is enabled
    const config = vscode.workspace.getConfiguration('r3bl-task-management');
    const autoSave = config.get<boolean>('autoSaveCurrentTaskSpace', true);

    if (!autoSave) {
      return;
    }

    // Only auto-save if we have an active task space
    const activeTaskSpace = manager.getActiveTaskSpace();
    if (!activeTaskSpace) {
      return;
    }

    // Debounce: wait 500ms after last change
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    autoSaveTimeout = setTimeout(async () => {
      try {
        const currentTabs = await manager.getCurrentOpenTabs();
        await manager.updateTaskSpaceTabs(activeTaskSpace.id, currentTabs);
        updateStatusBar(statusBarItem, manager);
      } catch (error) {
        console.error('Failed to auto-save task space:', error);
      }
    }, 500);
  });
  context.subscriptions.push(tabChangeDisposable);

  // Listen for configuration changes (e.g., status bar visibility)
  const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('r3bl-task-management.showStatusBar')) {
      updateStatusBar(statusBarItem, manager);
    }
  });
  context.subscriptions.push(configChangeDisposable);
}

export function deactivate() {
  // Clear any pending auto-save
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }
}

// Helper functions from Step 3 and 4 go here...
function createStatusBarItem(): vscode.StatusBarItem { /* ... */ }
function updateStatusBar(statusBarItem: vscode.StatusBarItem, manager: TaskSpaceManager) { /* ... */ }
async function showTaskSpacesDialog(manager: TaskSpaceManager, statusBar: vscode.StatusBarItem) { /* ... */ }
// etc.
```

**Lifecycle Summary**:
1. **Activation** (`onStartupFinished`):
   - Initialize manager (load task spaces from storage)
   - Create and show status bar item
   - Register command (`Alt+Shift+T`)
   - Setup auto-save listener
   - Listen for configuration changes

2. **During Runtime**:
   - User presses `Alt+Shift+T` → Opens dialog
   - User clicks status bar → Opens dialog
   - Tabs change → Auto-save (debounced)
   - User switches task spaces → Update status bar
   - Configuration changes → Update status bar

3. **Deactivation**:
   - Clear pending timeouts
   - Dispose subscriptions (automatic)

---

## Step 7: Polish and Edge Cases

### Step 7.0: Handle Edge Cases

1. **No workspace open**:
   ```typescript
   // In TaskSpaceManager
   if (!vscode.workspace.workspaceFolders) {
     vscode.window.showWarningMessage(
       'Task Management works best with a workspace. Consider opening a folder.'
     );
     // Fall back to globalState storage with absolute paths
   }
   ```

2. **Files no longer exist**:
   ```typescript
   // In openTabs() method - already handled
   // Shows warning: "Failed to open 2 file(s): src/deleted.ts, test/old.ts"
   ```

3. **Empty task spaces**:
   ```typescript
   // Allow creating task spaces with 0 tabs
   // Useful for starting fresh contexts
   ```

4. **Duplicate names**:
   ```typescript
   // Already validated in createTaskSpace() and renameTaskSpace()
   // Shows error: "Task space 'Feature' already exists"
   ```

5. **Unsaved changes**:
   ```typescript
   // Optional: Check for dirty editors before switching
   const dirtyEditors = vscode.window.visibleTextEditors.filter(e => e.document.isDirty);
   if (dirtyEditors.length > 0 && confirmBeforeSwitch) {
     // Show warning
   }
   ```

6. **Terminal focus**:
   ```typescript
   // Already handled in package.json keybinding:
   // "when": "!terminalFocus"
   ```

7. **Multiple workspace folders**:
   ```typescript
   // Use first workspace folder consistently
   // Future enhancement: Support multi-root workspaces
   ```

### Step 7.1: Add User Feedback

Ensure all operations provide feedback:

```typescript
// Success messages (informational)
vscode.window.showInformationMessage('Task space "Feature" created');
vscode.window.showInformationMessage('Switched to "Bugfix" (7 tabs)');
vscode.window.showInformationMessage('Task space renamed to "New Name"');

// Warning messages (non-critical issues)
vscode.window.showWarningMessage('Failed to open 2 file(s): deleted.ts, old.ts');
vscode.window.showWarningMessage('Task Management works best with a workspace');

// Error messages (critical failures)
vscode.window.showErrorMessage('Failed to create task space: Invalid name');
vscode.window.showErrorMessage('Failed to switch task space: Storage error');

// Progress indicators (long-running operations)
await vscode.window.withProgress(
  {
    location: vscode.ProgressLocation.Notification,
    title: 'Switching task space...',
    cancellable: false
  },
  async () => { /* ... */ }
);
```

### Step 7.2: Add Configuration Options

Already defined in `package.json` (Step 0.1):

```json
"configuration": {
  "r3bl-task-management.autoSaveCurrentTaskSpace": {
    "type": "boolean",
    "default": true,
    "description": "Automatically save the current task space when tabs change"
  },
  "r3bl-task-management.confirmBeforeSwitch": {
    "type": "boolean",
    "default": false,
    "description": "Show confirmation dialog before switching task spaces"
  },
  "r3bl-task-management.showStatusBar": {
    "type": "boolean",
    "default": true,
    "description": "Show current task space in status bar"
  }
}
```

Users can configure these in VSCode settings:
- `Preferences: Open Settings (UI)` → Search "R3BL Task Management"
- Or edit `settings.json` directly

---

## Step 8: Integrate into Extension Pack

Add the new extension to the R3BL extension pack so users can install all R3BL extensions together.

Edit `packages/r3bl-extension-pack/package.json` and add to the `extensionPack` array:

```json
{
  "name": "r3bl-extension-pack",
  "displayName": "R3BL Extension Pack",
  "description": "Collection of R3BL extensions for VSCode",
  "version": "1.0.4",
  "publisher": "R3BL",
  "engines": {
    "vscode": "^1.60.0"
  },
  "categories": ["Extension Packs"],
  "extensionPack": [
    "R3BL.r3bl-theme",
    "R3BL.r3bl-auto-insert-copyright",
    "R3BL.r3bl-semantic-config",
    "R3BL.r3bl-task-management"
  ]
}
```

This ensures users who install the R3BL extension pack will get the task management extension automatically.

---

## Step 9: Update Build Infrastructure

### Step 9.0: Update Root package.json

Add a build script to the root `package.json`:

```json
{
  "scripts": {
    "build:theme": "npm run build --workspace=packages/r3bl-theme",
    "build:semantic-config": "npm run build --workspace=packages/r3bl-semantic-config",
    "build:auto-insert-copyright": "npm run build --workspace=packages/r3bl-auto-insert-copyright",
    "build:extension-pack": "npm run build --workspace=packages/r3bl-extension-pack",
    "build:task-management": "npm run build --workspace=packages/r3bl-task-management"
  }
}
```

### Step 9.1: Update build.sh

Add build steps to `build.sh` in the root directory:

```bash
#!/bin/bash

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# ... existing build steps ...

# Build R3BL Task Management
echo -e "${BLUE}Building R3BL Task Management...${NC}"
cd packages/r3bl-task-management
npm install
npm run compile
vsce package --no-dependencies
cd ../..
echo -e "${GREEN}R3BL Task Management built successfully${NC}"

# ... rest of build script ...
```

### Step 9.2: Update install.sh

Add installation steps to `install.sh`:

```bash
#!/bin/bash

# ... existing installations ...

# Install R3BL Task Management
echo "Installing R3BL Task Management..."
code --install-extension packages/r3bl-task-management/*.vsix

# ... rest of install script ...
```

### Step 9.3: Update script_lib.sh

Update `script_lib.sh` to track the new extension:

```bash
# Add to get_all_versions() function
function get_all_versions() {
  # ... existing extensions ...
  echo "r3bl-task-management: $(get_version packages/r3bl-task-management/package.json)"
}

# Add to print_built_extensions() function
function print_built_extensions() {
  # ... existing extensions ...
  echo "  - R3BL Task Management"
}

# Add to any other version tracking functions
```

---

## Step 10: Testing Plan

### Step 10.0: Manual Testing Checklist

**1. Create Task Space**:
- [ ] Create with current tabs open (should include all open files)
- [ ] Create with no tabs open (should have 0 tabs)
- [ ] Create with linked task file (task file should auto-open on switch)
- [ ] Try creating with duplicate name (should fail with error message)
- [ ] Try creating with empty name (should fail validation)
- [ ] Create in workspace vs. without workspace

**2. Switch Task Space**:
- [ ] Switch between task spaces (should close current, open new tabs)
- [ ] Verify tabs open in correct order
- [ ] Verify task file opens last (becomes active tab) if linked
- [ ] Switch with unsaved changes (should work, changes preserved)
- [ ] Switch when already in target task space (should show message)
- [ ] Verify status bar updates after switch

**3. Auto-Save Tabs**:
- [ ] Open new tab in active task space → wait 500ms → check storage file
- [ ] Close tab in active task space → verify saved
- [ ] Move tab between editor groups → verify saved
- [ ] Make rapid tab changes → verify debouncing (only one save)
- [ ] Disable auto-save in settings → verify tabs don't save
- [ ] Verify status bar tab count updates after auto-save

**4. Delete Task Space**:
- [ ] Delete non-active task space (should remove from list)
- [ ] Delete active task space (should clear status bar)
- [ ] Cancel deletion (should abort)
- [ ] Verify storage file updated after deletion
- [ ] Try deleting while dialog is open (re-open should show updated list)

**5. Rename Task Space**:
- [ ] Rename task space (should update name)
- [ ] Try duplicate name (should fail with error)
- [ ] Try empty name (should fail validation)
- [ ] Cancel rename (should abort)
- [ ] Verify status bar updates if active task space renamed

**6. Status Bar**:
- [ ] Shows current task space with correct name and tab count
- [ ] Shows "No Task Space" when not in any task space
- [ ] Click opens dialog (`Alt+Shift+T`)
- [ ] Updates when switching task spaces
- [ ] Updates when tabs change (tab count)
- [ ] Hide/show based on settings

**7. Keyboard Shortcut**:
- [ ] `Alt+Shift+T` opens dialog when focused on editor
- [ ] Doesn't trigger when terminal has focus
- [ ] Doesn't trigger in other panels (output, debug console, etc.)
- [ ] Check for conflicts with other extensions

**8. Persistence**:
- [ ] Close and reopen VSCode → verify task spaces persist
- [ ] Verify active task space remembered (status bar shows correct one)
- [ ] Verify `.vscode/task-spaces.json` file created
- [ ] Check JSON format is correct and readable
- [ ] Edit JSON manually → reload VSCode → verify changes reflected

**9. Edge Cases**:
- [ ] File in task space no longer exists → verify warning shown, others open
- [ ] Empty task space (0 tabs) → switch to it → verify no errors
- [ ] No workspace open → verify falls back to globalState
- [ ] Multiple workspace folders → verify uses first one
- [ ] Task file linked but doesn't exist → verify warning shown
- [ ] Very long task space names → verify UI handles gracefully
- [ ] Special characters in file names → verify paths work

**10. Settings**:
- [ ] Disable auto-save → verify tabs don't auto-update
- [ ] Enable confirmation before switch → verify prompt appears
- [ ] Hide status bar → verify status bar hidden
- [ ] Change settings while extension running → verify takes effect immediately

### Step 10.1: Build and Package

```bash
# Navigate to extension directory
cd packages/r3bl-task-management

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Verify compilation succeeded (check out/ directory exists)
ls -la out/

# Package extension
vsce package

# Verify .vsix file created
ls -la *.vsix

# Install locally for testing
code --install-extension r3bl-task-management-1.0.0.vsix

# Reload VSCode window
# Press Ctrl+Shift+P → "Developer: Reload Window"

# Test the extension
# Press Alt+Shift+T to open dialog
```

**Build Validation**:
- [ ] `npm install` completes without errors
- [ ] `npm run compile` generates `out/` directory
- [ ] `out/extension.js` exists and is not empty
- [ ] `vsce package` creates `.vsix` file
- [ ] `.vsix` file size is reasonable (< 1MB expected)
- [ ] Extension activates without errors (check Developer Tools console)

**Integration Testing**:
- [ ] Run `./build.sh` from root → verify task management builds
- [ ] Run `./install.sh` from root → verify task management installs
- [ ] Install extension pack → verify task management included

---

# Future Enhancements (Post-MVP)

These features can be added after the basic implementation is stable:

1. **Git Branch Integration**:
   - Auto-suggest task space name based on current git branch
   - Automatically create/switch task space when changing branches
   - Link task spaces to git branches

2. **Task File Templates**:
   - Auto-generate task markdown files from customizable templates
   - Quick create task file when creating task space
   - Template variables (date, task name, etc.)

3. **Search in Task Spaces**:
   - Quick search across all task space names
   - Search file names within task spaces
   - Fuzzy matching

4. **Import/Export**:
   - Export task spaces to JSON file
   - Import task spaces from JSON
   - Share task spaces with team members
   - Merge task spaces from multiple sources

5. **Task Space History**:
   - Track which files were accessed in each task space
   - Show "recently closed tabs" per task space
   - Undo tab closes

6. **Smart Tab Ordering**:
   - Remember and restore exact tab order
   - Remember tab order within groups
   - Remember which tab was active

7. **Split Editor Support**:
   - Save and restore split editor layouts
   - Remember which files were in which split
   - Restore editor group arrangements

8. **Pinned Tabs**:
   - Mark certain tabs as "pinned" (always present across all task spaces)
   - Global tabs that appear in every task space
   - Common files (e.g., TODO.md, README.md)

9. **Task Space Colors**:
   - Assign colors to task spaces
   - Visual indicators in status bar
   - Color-coded quick pick items

10. **Context Menu Integration**:
    - Right-click on files → "Add to current task space"
    - Right-click on tabs → "Add to task space..."
    - Explorer context menu integration

11. **Multi-root Workspace Support**:
    - Handle multiple workspace folders
    - Task spaces can span multiple roots
    - Per-root task spaces

12. **Task Space Analytics**:
    - Track time spent in each task space
    - Most frequently accessed task spaces
    - Suggest task spaces to archive (not used in 30 days)

13. **Quick Switch**:
    - Recent task spaces list
    - Quick switch to previous task space (like Alt+Tab)
    - MRU (Most Recently Used) ordering

14. **Task Space Groups**:
    - Organize task spaces into folders/categories
    - "Project A", "Project B", "Personal"
    - Hierarchical structure

15. **Cloud Sync**:
    - Sync task spaces across machines
    - Share task spaces with team via cloud
    - Conflict resolution

---

**End of Implementation Plan**

This plan provides a complete roadmap for implementing the R3BL Task Management extension for VSCode. The MVP focuses on the core features (create, switch, delete, rename task spaces with auto-save and status bar), while future enhancements can be prioritized based on user feedback.
