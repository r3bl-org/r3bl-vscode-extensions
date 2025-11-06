// Copyright (c) 2025 R3BL LLC. Licensed under MIT License.

import * as vscode from 'vscode';
import { TaskSpaceManager } from './taskSpaceManager';
import { showTaskSpacesDialog, updateStatusBar, createStatusBarItem } from './ui';

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
}

export function deactivate() {
  // Clear any pending auto-save
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }
}
