// Copyright (c) 2025 R3BL LLC. Licensed under MIT License.

import * as vscode from 'vscode';
import * as path from 'path';
import { TaskSpace } from './types';
import { TaskSpaceManager } from './taskSpaceManager';
import { promptToInstallClaudeCodeIntegration } from './claudeCodeIntegration';

interface TaskSpaceQuickPickItem extends vscode.QuickPickItem {
  taskSpace?: TaskSpace;
  action?: 'create' | 'switch';
}

/**
 * Show main task spaces dialog
 */
export async function showTaskSpacesDialog(
  manager: TaskSpaceManager,
  statusBar: vscode.StatusBarItem,
  context?: vscode.ExtensionContext
): Promise<void> {
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
      await handleCreateTaskSpace(manager, statusBar, context);
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
 * Handle creating a new task space
 */
async function handleCreateTaskSpace(
  manager: TaskSpaceManager,
  statusBar: vscode.StatusBarItem,
  context?: vscode.ExtensionContext
): Promise<void> {
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

    // Prompt to install Claude Code integration if task file is linked
    if (taskFile && context) {
      await promptToInstallClaudeCodeIntegration(context);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create task space: ${error}`);
  }
}

/**
 * Handle switching to a task space
 */
async function handleSwitchTaskSpace(
  manager: TaskSpaceManager,
  taskSpace: TaskSpace,
  statusBar: vscode.StatusBarItem
): Promise<void> {
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

/**
 * Handle deleting a task space
 */
async function handleDeleteTaskSpace(
  manager: TaskSpaceManager,
  taskSpace: TaskSpace,
  statusBar: vscode.StatusBarItem
): Promise<void> {
  // Confirm deletion
  const message = taskSpace.taskFile
    ? `Delete task space "${taskSpace.name}"?\n\nThe associated file "${path.basename(taskSpace.taskFile)}" will be moved to task/done/.\n\nThis cannot be undone.`
    : `Delete task space "${taskSpace.name}"? This cannot be undone.`;

  const confirm = await vscode.window.showWarningMessage(
    message,
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

/**
 * Handle renaming a task space
 */
async function handleRenameTaskSpace(
  manager: TaskSpaceManager,
  taskSpace: TaskSpace,
  statusBar: vscode.StatusBarItem
): Promise<void> {
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

/**
 * Update status bar with current task space
 */
export function updateStatusBar(
  statusBarItem: vscode.StatusBarItem,
  manager: TaskSpaceManager
): void {
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

/**
 * Create status bar item
 */
export function createStatusBarItem(): vscode.StatusBarItem {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100  // Priority (higher = more left)
  );

  statusBarItem.command = 'r3bl-task-management.showTaskSpaces';
  statusBarItem.tooltip = 'Click to manage task spaces (Alt+Shift+T)';

  return statusBarItem;
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
