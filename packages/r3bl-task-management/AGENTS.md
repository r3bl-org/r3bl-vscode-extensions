# R3BL Task Management - Architecture Guide

This document describes the internal architecture, event lifecycle, and common pitfalls
when making changes to the R3BL Task Management extension. It is intended for AI
assistants and developers working on this codebase.

## Overview

R3BL Task Management allows users to manage "task spaces" - named collections of open tabs
that can be saved and restored. The extension supports multiple VSCode instances having
different task spaces active simultaneously on the same project folder.

## File Structure

```
src/
├── extension.ts        # Extension activation, command registration, event handlers
├── taskSpaceManager.ts # Core business logic, tab operations, switching logic
├── storage.ts          # File I/O, migration logic, workspace state management
├── types.ts            # TypeScript interfaces
├── ui.ts               # QuickPick dialogs, status bar updates
└── claudeCodeIntegration.ts  # /r3bl-task slash command installation
```

## Data Storage Architecture

The extension uses a **split storage architecture** to support multi-instance behavior:

### 1. Shared File: `.vscode/task-spaces.json`

**Location**: `<workspace>/.vscode/task-spaces.json`

**Contents** (version 3.0):

```json
{
    "version": "3.0",
    "taskSpaces": [
        {
            "name": "Feature Work",
            "id": "uuid-here",
            "tabs": [
                { "path": "src/index.ts", "isPinned": true },
                { "path": "src/utils.ts", "isPinned": false }
            ],
            "taskFile": "task/task_feature.md",
            "activeTab": "src/index.ts",
            "createdAt": 1234567890
        }
    ]
}
```

**Synced across instances**: Yes (via file watcher) **Version controlled**: Yes (can be
committed to git)

### 2. Per-Instance State: VSCode WorkspaceState

**Location**: `~/.config/Code/User/workspaceStorage/<workspace-id>/state.vscdb`

**Contents**:

- `activeTaskSpaceId`: Which task space is active in THIS window
- `taskSpaceMetadata`: `{ [id]: { lastAccessed: number } }` for sorting

**Synced across instances**: No **Version controlled**: No

### Why This Split?

| Requirement                                   | Solution                              |
| --------------------------------------------- | ------------------------------------- |
| Multiple windows with different active spaces | `activeTaskSpaceId` in workspaceState |
| Task space definitions sync across instances  | File watcher on `task-spaces.json`    |
| Avoid git noise from frequent timestamps      | `lastAccessed` in workspaceState      |
| Allow version controlling task spaces         | JSON file in `.vscode/`               |

## Event Lifecycle

### Extension Activation Flow

```
1. activate() called by VSCode
   │
2. TaskSpaceManager.initialize()
   ├── Load task-spaces.json (migration 2.0 → 3.0 if needed)
   ├── Set lastSavedChecksum
   └── Load activeTaskSpaceId from workspaceState
   │
3. checkAndUpgradeClaudeCommand()
   │
4. Restore tabs if restoreTabsOnStartup enabled
   └── switchToTaskSpaceFromFileWatcher(activeId)
   │
5. Create status bar, register commands
   │
6. Register event listeners:
   ├── tabGroups.onDidChangeTabs → debounced auto-save
   ├── workspace.onDidChangeConfiguration → status bar update
   └── fileWatcher.onDidChange → external sync
```

### Task Space Switching Flow

There are **two entry points** for switching, named by their trigger:

```
                 ┌─────────────────────────────────────────┐
                 │      diffSwitchToTaskSpace (private)    │
                 │      - Diff-based UI changes only       │
                 │      - No save                          │
                 └─────────────────────────────────────────┘
                          ▲                    ▲
                          │                    │
          ┌───────────────┴─────┐   ┌─────────┴───────────────┐
          │ switchToTaskSpace   │   │ switchToTaskSpace       │
          │ FromUserAction      │   │ FromFileWatcher         │
          │ (public)            │   │ (public)                │
          │ - Saves after       │   │ - No save               │
          │ - Suppresses        │   │ - Suppresses auto-save  │
          │   auto-save during  │   │   during sync           │
          └─────────────────────┘   └─────────────────────────┘
```

### diffSwitchToTaskSpace Algorithm

```
1. Close tabs not in target space
2. Open tabs missing from current view
3. Reorder tabs to match saved order (using moveEditorLeftInGroup/Right)
4. Sync pin states
5. Focus the saved activeTab
6. Update activeTaskSpaceId in workspaceState
7. Update lastAccessed timestamp
```

### Auto-Save Flow

```
Tab change detected (onDidChangeTabs)
        │
        ├── isSyncingFromFileWatcher()? → Skip (prevents sync loop)
        │
        ├── autoSaveCurrentTaskSpace disabled? → Skip
        │
        ├── No active task space? → Skip
        │
        └── Debounce (default 500ms)
               │
               └── getCurrentOpenTabs() → updateTaskSpaceTabs()
```

### File Watcher Sync Flow

```
task-spaces.json changed on disk
        │
1. reloadFromDisk() → load new JSON
        │
2. isOwnSave(loadedData)?
   ├── Yes → Skip (we wrote this)
   └── No → External change, continue
        │
3. clearActiveIfDeleted()
   └── If our activeTaskSpaceId doesn't exist in new data, clear it
        │
4. switchToTaskSpaceFromFileWatcher(activeId)
   └── Apply tab changes (diff-based, no save)
        │
5. updateStatusBar()
```

## Race Condition Prevention

### Problem 1: Own-Save Detection

Without detection, file watcher creates infinite loops:

```
A saves → B's watcher fires → B applies → B saves → A's watcher fires → ...
```

**Solution**: SHA256 checksum tracking

```typescript
// On save:
this.lastSavedChecksum = computeChecksum(this.data)

// On file watcher:
if (computeChecksum(loadedData) === this.lastSavedChecksum) {
    return // Own save, skip
}
```

### Problem 2: Auto-Save During Sync

When syncing from file watcher, tab changes trigger onDidChangeTabs, which would
auto-save:

```
A saves → B syncs → B's tabs change → B auto-saves → A syncs → ...
```

**Solution**: Counter-based suppression

```typescript
// Before sync:
this.pendingFileWatcherSyncs++
try {
    await this.diffSwitchToTaskSpace(id)
} finally {
    this.pendingFileWatcherSyncs--
}

// In auto-save handler:
if (manager.isSyncingFromFileWatcher()) return
```

Uses a counter (not boolean) to handle theoretical overlapping syncs.

### Problem 3: Auto-Save During User Switch

When user clicks to switch spaces, tabs change → auto-save fires with old active space's
tabs:

```
User clicks "Space B" → tabs change → auto-save fires → saves current tabs to Space A (wrong!)
```

**Solution**: Same counter suppression in `switchToTaskSpaceFromUserAction()`

```typescript
async switchToTaskSpaceFromUserAction(id: string): Promise<void> {
    this.pendingFileWatcherSyncs++; // Suppress auto-save
    try {
        await this.diffSwitchToTaskSpace(id);
    } finally {
        this.pendingFileWatcherSyncs--;
    }
    await this.save(); // Explicit save after switch
}
```

## Version Migration

### Version History

| Version | Changes                                                              |
| ------- | -------------------------------------------------------------------- |
| 1.0     | Original: `tabs` as `string[]`                                       |
| 2.0     | `tabs` as `TabInfo[]` with `isPinned`, `activeTaskSpaceId` in JSON   |
| 3.0     | `activeTaskSpaceId` moved to workspaceState (multi-instance support) |

### Migration Code Location

`storage.ts` → `migrateIfNeeded()` method

Migration happens during `loadTaskSpaces()` before data is returned to the caller.

## Adding New Features

### Adding a New Command

1. Add command ID to `package.json` under `contributes.commands`
2. Register handler in `extension.ts`:
    ```typescript
    const myCommand = vscode.commands.registerCommand(
        "r3bl-task-management.myCommand",
        async () => {
            /* handler */
        },
    )
    context.subscriptions.push(myCommand)
    ```

### Adding a New Setting

1. Add to `package.json` under `contributes.configuration.properties`
2. Read in code:
    ```typescript
    const config = vscode.workspace.getConfiguration("r3bl-task-management")
    const value = config.get<boolean>("mySetting", defaultValue)
    ```

### Adding Data to task-spaces.json

1. Update `TaskSpace` interface in `types.ts`
2. If breaking change, bump version and add migration in `storage.ts`
3. Update README's file format documentation

### Adding Per-Instance State

Store in workspaceState (NOT task-spaces.json):

```typescript
// In storage.ts
async getMyState(): Promise<T | undefined> {
    return this.context.workspaceState.get<T>('myStateKey');
}

async setMyState(value: T): Promise<void> {
    await this.context.workspaceState.update('myStateKey', value);
}
```

### Hooking into Tab Changes

In `extension.ts`, the `onDidChangeTabs` handler already exists. If you need to add logic:

```typescript
// Look for this in extension.ts:
const tabChangeDisposable = vscode.window.tabGroups.onDidChangeTabs(async () => {
    if (manager.isSyncingFromFileWatcher()) return // Don't forget this check!
    // Your logic here
})
```

### Hooking into External File Changes

In `extension.ts`, the file watcher handler already exists:

```typescript
fileWatcher.onDidChange(async () => {
    const loadedData = await manager.reloadFromDisk()
    if (manager.isOwnSave(loadedData)) return
    // Your logic here (runs only for external changes)
})
```

## Testing Multi-Instance Behavior

1. Open same project in two VSCode windows
2. In window A, switch to task space "Alpha"
3. In window B, switch to task space "Beta"
4. Verify status bars show different active spaces
5. In window A, add a tab and save
6. Verify window B's tabs don't change (different active space)
7. In window B, switch to "Alpha"
8. Verify B now has A's tabs (via file watcher sync)

## Common Pitfalls

1. **Forgetting to suppress auto-save**: Any code that programmatically changes tabs
   should increment `pendingFileWatcherSyncs` before and decrement after.

2. **Saving in file watcher handler**: Never call `save()` in the file watcher sync path -
   it creates loops.

3. **Assuming activeTaskSpaceId is in JSON**: Since v3.0, it's in workspaceState. Always
   access via `manager.getActiveTaskSpaceId()`.

4. **Blocking the extension host**: Use `async/await` properly. Long-running operations
   should not block the main thread.

5. **Forgetting version migration**: If you change the JSON schema, bump the version and
   add migration logic in `migrateIfNeeded()`.
