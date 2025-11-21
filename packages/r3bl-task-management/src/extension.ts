// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from 'vscode';
import { TaskSpaceManager } from './taskSpaceManager';
import { showTaskSpacesDialog, updateStatusBar, createStatusBarItem } from './ui';
import { installClaudeCodeIntegration, checkAndUpgradeClaudeCommand } from './claudeCodeIntegration';
import * as path from 'path';
import { StatusBarMessage, StatusBarMessageType } from '@r3bl/shared';

let manager: TaskSpaceManager;
let statusBarItem: vscode.StatusBarItem;
let autoSaveTimeout: NodeJS.Timeout | undefined;

/**
 * Command handler: Create Task Space from Task File
 */
async function createTaskSpaceFromFile(
  manager: TaskSpaceManager,
  statusBarItem: vscode.StatusBarItem
): Promise<void> {
  try {
    // Get only unlinked task files
    const unlinkedFiles = await manager.getUnlinkedTaskFiles();

    if (unlinkedFiles.length === 0) {
      // Check if there are ANY task files at all
      const allTaskFiles = await manager.getTaskFiles();

      if (allTaskFiles.length === 0) {
        StatusBarMessage.show('No task files found in task/ directory', StatusBarMessageType.Info);
      } else {
        StatusBarMessage.show('All task files already linked', StatusBarMessageType.Info);
      }
      return;
    }

    // Create quick pick items (only unlinked files)
    interface TaskFileItem extends vscode.QuickPickItem {
      taskFile: string;
    }

    const items: TaskFileItem[] = unlinkedFiles.map(file => {
      const fileName = path.basename(file);

      return {
        label: `$(file) ${fileName}`,
        description: 'Not linked',
        detail: file,
        taskFile: file
      };
    });

    // Show quick pick
    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a task file to create a task space for',
      title: 'Create Task Space from Task File'
    });

    if (!selected) {
      return; // User cancelled
    }

    // Ask for task space name
    const fileBaseName = path.basename(selected.taskFile, '.md');
    const suggestedName = fileBaseName.replace(/^task_/, ''); // Remove task_ prefix

    const name = await vscode.window.showInputBox({
      prompt: 'Enter task space name',
      value: suggestedName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Name cannot be empty';
        }
        if (manager.getTaskSpaces().some(ts => ts.name === value)) {
          return `Task space "${value}" already exists`;
        }
        return null;
      }
    });

    if (!name) {
      return; // User cancelled
    }

    // Open the task file FIRST, then create the task space
    // This ensures the task file is in the current tabs when createTaskSpace captures them
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      const taskFilePath = path.isAbsolute(selected.taskFile)
        ? selected.taskFile
        : path.join(workspaceFolder.uri.fsPath, selected.taskFile);
      const taskFileUri = vscode.Uri.file(taskFilePath);

      // Open and pin the task file
      await vscode.window.showTextDocument(taskFileUri, { preview: false });
      await vscode.commands.executeCommand('workbench.action.pinEditor');
    }

    // Now create task space - it will capture the task file in the tabs
    // Set as active immediately to avoid race condition
    await manager.createTaskSpace(name, selected.taskFile, true);

    // Update status bar
    updateStatusBar(statusBarItem, manager);

    StatusBarMessage.show(`Created task space "${name}"`, StatusBarMessageType.Success);
  } catch (error) {
    StatusBarMessage.show(`Failed to create task space: ${error}`, StatusBarMessageType.Error);
  }
}

export async function activate(context: vscode.ExtensionContext) {
  console.log('R3BL Task Management extension is now active');

  // Initialize manager
  manager = new TaskSpaceManager(context);
  await manager.initialize();

  // Check and auto-upgrade Claude Code command if needed
  await checkAndUpgradeClaudeCommand(context);

  // Restore tabs for active task space on startup
  const activeTaskSpace = manager.getActiveTaskSpace();
  if (activeTaskSpace) {
    // Check if restoreTabsOnStartup is enabled (default: true)
    const config = vscode.workspace.getConfiguration('r3bl-task-management');
    const restoreOnStartup = config.get<boolean>('restoreTabsOnStartup', true);

    if (restoreOnStartup) {
      // Smart switch only restores if tabs differ (avoids jarring close/reopen)
      await manager.smartSwitchToTaskSpace(activeTaskSpace.id);
    }
  }

  // Create status bar item
  statusBarItem = createStatusBarItem();
  updateStatusBar(statusBarItem, manager);
  context.subscriptions.push(statusBarItem);

  // Register main command
  const showCommand = vscode.commands.registerCommand(
    'r3bl-task-management.showTaskSpaces',
    async () => {
      await showTaskSpacesDialog(manager, statusBarItem, context);
    }
  );
  context.subscriptions.push(showCommand);

  // Register Install Claude Code Integration command
  const installClaudeCodeCommand = vscode.commands.registerCommand(
    'r3bl-task-management.installClaudeCodeIntegration',
    async () => {
      await installClaudeCodeIntegration(context);
    }
  );
  context.subscriptions.push(installClaudeCodeCommand);

  // Register Create Task Space from Task File command
  const createFromFileCommand = vscode.commands.registerCommand(
    'r3bl-task-management.createTaskSpaceFromFile',
    async () => {
      await createTaskSpaceFromFile(manager, statusBarItem);
    }
  );
  context.subscriptions.push(createFromFileCommand);

  // Register auto-save listener
  const tabChangeDisposable = vscode.window.tabGroups.onDidChangeTabs(async () => {
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

  // Watch for external changes to task-spaces.json (e.g., git branch switch)
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    const taskSpacesPattern = new vscode.RelativePattern(
      workspaceFolders[0],
      '.vscode/task-spaces.json'
    );
    const fileWatcher = vscode.workspace.createFileSystemWatcher(taskSpacesPattern);

    fileWatcher.onDidChange(async () => {
      // File changed externally (e.g., git checkout, another IDE instance)
      await manager.reloadFromDisk();

      // Always try smart switch - it will only apply changes if tabs differ
      const activeTaskSpace = manager.getActiveTaskSpace();
      if (activeTaskSpace) {
        // Smart switch only restores if tabs differ (avoids jarring close/reopen)
        await manager.smartSwitchToTaskSpace(activeTaskSpace.id);
      }

      // Update status bar to reflect new state
      updateStatusBar(statusBarItem, manager);
    });

    context.subscriptions.push(fileWatcher);
  }
}

export function deactivate() {
  // Clear any pending auto-save
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }
  StatusBarMessage.dispose();
}
