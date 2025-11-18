// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

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
   * Reload task spaces from disk (e.g., after git branch switch)
   * Returns true if active task space changed
   */
  async reloadFromDisk(): Promise<boolean> {
    const oldActiveId = this.data.activeTaskSpaceId;

    // Reload from storage
    this.data = await this.storage.loadTaskSpaces();

    // Check if active task space changed
    const newActiveId = this.data.activeTaskSpaceId;
    return oldActiveId !== newActiveId;
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
   * @param setAsActive - If true, sets this as the active task space immediately
   */
  async createTaskSpace(name: string, taskFile?: string, setAsActive: boolean = false): Promise<TaskSpace> {
    // Validate name is unique
    if (this.data.taskSpaces.some(ts => ts.name === name)) {
      throw new Error(`Task space "${name}" already exists`);
    }

    const currentTabs = await this.getCurrentOpenTabs();
    const activeTab = this.getActiveTab();

    const taskSpace: TaskSpace = {
      name,
      id: randomUUID(),
      tabs: currentTabs,
      taskFile,
      activeTab,
      createdAt: Date.now(),
      lastAccessed: Date.now()
    };

    this.data.taskSpaces.push(taskSpace);

    // Set as active if requested (atomically with creation)
    if (setAsActive) {
      this.data.activeTaskSpaceId = taskSpace.id;
    }

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

    const taskSpace = this.data.taskSpaces[index];

    // Move associated task file if it exists
    if (taskSpace.taskFile) {
      await this.moveTaskFileToDone(taskSpace.taskFile);
    }

    this.data.taskSpaces.splice(index, 1);

    // Clear active if we deleted the active task space
    if (this.data.activeTaskSpaceId === id) {
      this.data.activeTaskSpaceId = undefined;
    }

    await this.save();
  }

  /**
   * Move task file from task/ to task/done/
   * If a file with the same name exists, add numeric suffix (_2, _3, etc.)
   */
  private async moveTaskFileToDone(taskFile: string): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) {
      // No workspace, can't move files
      return;
    }

    try {
      // Construct paths
      // taskFile format: "task/task_name.md"
      const fileName = path.basename(taskFile); // "task_name.md"
      const fileExt = path.extname(fileName); // ".md"
      const fileBase = path.basename(fileName, fileExt); // "task_name"

      const sourceUri = vscode.Uri.joinPath(workspaceFolder.uri, taskFile);
      const doneDir = vscode.Uri.joinPath(workspaceFolder.uri, 'task', 'done');

      // Check if source file exists
      try {
        await vscode.workspace.fs.stat(sourceUri);
      } catch {
        // Source file doesn't exist, nothing to move (this is OK)
        return;
      }

      // Ensure task/done/ directory exists
      try {
        await vscode.workspace.fs.createDirectory(doneDir);
      } catch {
        // Directory might already exist, ignore error
      }

      // Find a unique filename in task/done/
      let targetFileName = fileName;
      let targetUri = vscode.Uri.joinPath(doneDir, targetFileName);
      let counter = 2;

      while (true) {
        try {
          await vscode.workspace.fs.stat(targetUri);
          // File exists, try next number
          targetFileName = `${fileBase}_${counter}${fileExt}`;
          targetUri = vscode.Uri.joinPath(doneDir, targetFileName);
          counter++;
        } catch {
          // File doesn't exist, we can use this name
          break;
        }
      }

      // Move file
      await vscode.workspace.fs.rename(sourceUri, targetUri, {
        overwrite: false
      });

    } catch (error) {
      // Log error but don't throw - we still want to delete the task space
      console.error(`Failed to move task file ${taskFile} to done/:`, error);

      // Show warning to user
      vscode.window.showWarningMessage(
        `Task space deleted but could not move file "${path.basename(taskFile)}" to task/done/`
      );
    }
  }

  /**
   * Switch to a different task space
   */
  async switchToTaskSpace(id: string): Promise<void> {
    const taskSpace = this.data.taskSpaces.find(ts => ts.id === id);
    if (!taskSpace) {
      throw new Error('Task space not found');
    }

    // Update active task space FIRST, before opening tabs
    // This ensures auto-save listener saves to the correct space
    this.data.activeTaskSpaceId = id;
    taskSpace.lastAccessed = Date.now();

    // Close all current tabs
    await this.closeAllTabs();

    // Open tabs from target task space with correct ordering and focus
    await this.openTabs(taskSpace.tabs, taskSpace.taskFile, taskSpace.activeTab);

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
    taskSpace.activeTab = this.getActiveTab();
    await this.save();
  }

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
   * Get the currently active tab's relative path
   */
  private getActiveTab(): string | undefined {
    const workspaceFolder = this.getWorkspaceFolder();
    const activeEditor = vscode.window.activeTextEditor;
    
    if (!activeEditor) {
      return undefined;
    }

    if (!workspaceFolder) {
      // No workspace, return absolute path
      return activeEditor.document.uri.fsPath;
    }

    const filePath = activeEditor.document.uri.fsPath;
    const workspaceRoot = workspaceFolder.uri.fsPath;
    const relativePath = path.relative(workspaceRoot, filePath);

    // Only return if file is within workspace
    if (!relativePath.startsWith('..')) {
      return relativePath;
    }

    return undefined;
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
  async openTabs(tabs: string[], taskFile?: string, activeTab?: string): Promise<void> {
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

    // Helper to open a file
    const openFile = async (filePath: string, preserveFocus: boolean) => {
      try {
        const absolutePath = toAbsolutePath(filePath);
        const uri = vscode.Uri.file(absolutePath);

        await vscode.window.showTextDocument(uri, {
          preview: false,
          preserveFocus
        });
      } catch (error) {
        errors.push(filePath);
      }
    };

    // Step 1: Open task file FIRST (if specified)
    if (taskFile) {
      await openFile(taskFile, true);  // Don't steal focus yet
    }

    // Step 2: Open all other tabs (excluding task file and active tab)
    for (const tab of tabs) {
      // Skip if this is the task file (already opened) or the active tab (will open last)
      if (tab === taskFile || tab === activeTab) {
        continue;
      }
      await openFile(tab, true);  // Don't steal focus
    }

    // Step 3: Open and focus the active tab (if specified and not already opened)
    if (activeTab) {
      // Only open if it wasn't already opened as the task file
      if (activeTab !== taskFile) {
        await openFile(activeTab, false);  // This one gets focus
      } else {
        // Active tab is the task file, so just focus it
        try {
          const absolutePath = toAbsolutePath(activeTab);
          const uri = vscode.Uri.file(absolutePath);
          await vscode.window.showTextDocument(uri, {
            preview: false,
            preserveFocus: false  // Give it focus
          });
        } catch (error) {
          // Already handled in errors
        }
      }
    } else if (taskFile) {
      // No active tab specified, focus the task file
      try {
        const absolutePath = toAbsolutePath(taskFile);
        const uri = vscode.Uri.file(absolutePath);
        await vscode.window.showTextDocument(uri, {
          preview: false,
          preserveFocus: false  // Give it focus
        });
      } catch (error) {
        // Already handled in errors
      }
    }

    // Log errors for debugging (silently ignore missing files)
    if (errors.length > 0) {
      console.log(`Skipped ${errors.length} missing file(s):`, errors);
    }
  }

  /**
   * Get workspace folder (first one if multiple)
   */
  private getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
    const folders = vscode.workspace.workspaceFolders;
    return folders && folders.length > 0 ? folders[0] : undefined;
  }

  /**
   * Get all task files from task/ directory (task_*.md pattern)
   * Returns relative paths like "task/task_foo.md"
   */
  async getTaskFiles(): Promise<string[]> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) {
      return [];
    }

    try {
      const taskDir = vscode.Uri.joinPath(workspaceFolder.uri, 'task');

      // Check if task directory exists
      try {
        await vscode.workspace.fs.stat(taskDir);
      } catch {
        // task/ directory doesn't exist
        return [];
      }

      // Read directory contents
      const files = await vscode.workspace.fs.readDirectory(taskDir);

      // Filter for task_*.md files
      const taskFiles = files
        .filter(([name, type]) => {
          return type === vscode.FileType.File &&
                 name.startsWith('task_') &&
                 name.endsWith('.md');
        })
        .map(([name]) => `task/${name}`)
        .sort(); // Sort alphabetically

      return taskFiles;
    } catch (error) {
      console.error('Failed to get task files:', error);
      return [];
    }
  }

  /**
   * Get task files that don't have linked task spaces
   * Returns array of relative paths like "task/task_foo.md"
   */
  async getUnlinkedTaskFiles(): Promise<string[]> {
    const allTaskFiles = await this.getTaskFiles();
    const linkedFiles = new Set(
      this.data.taskSpaces
        .filter(ts => ts.taskFile)
        .map(ts => ts.taskFile!)
    );

    return allTaskFiles.filter(file => !linkedFiles.has(file));
  }

  /**
   * Check if a task file has a linked task space
   */
  hasLinkedTaskSpace(taskFile: string): boolean {
    return this.data.taskSpaces.some(ts => ts.taskFile === taskFile);
  }
}
