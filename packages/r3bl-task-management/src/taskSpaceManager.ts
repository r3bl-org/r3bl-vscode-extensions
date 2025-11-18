// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from 'vscode';
import * as path from 'path';
import { TabInfo, TaskSpace, TaskSpaceStorage } from './types';
import { Storage } from './storage';
import { randomUUID } from 'crypto';

export class TaskSpaceManager {
  private storage: Storage;
  private data: TaskSpaceStorage;

  constructor(context: vscode.ExtensionContext) {
    this.storage = new Storage(context);
    this.data = { version: '2.0', taskSpaces: [], activeTaskSpaceId: undefined };
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
   * Smart switch to task space - applies minimal changes using diff-based restore
   * Only closes/opens/reorders/pins what's necessary for smooth transitions
   * Returns true if changes were made, false if tabs already matched
   */
  async smartSwitchToTaskSpace(id: string): Promise<boolean> {
    const taskSpace = this.data.taskSpaces.find(ts => ts.id === id);
    if (!taskSpace) {
      throw new Error('Task space not found');
    }

    // Check if current tabs already match saved state
    const tabsMatch = await this.tabsMatchSavedState(taskSpace);

    if (!tabsMatch) {
      // Use diff-based restore for minimal UI disruption
      await this.diffSwitchToTaskSpace(id);
      return true;
    }

    return false;
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
  async updateTaskSpaceTabs(id: string, tabs: TabInfo[]): Promise<void> {
    const taskSpace = this.data.taskSpaces.find(ts => ts.id === id);
    if (!taskSpace) {
      throw new Error('Task space not found');
    }

    taskSpace.tabs = tabs;
    taskSpace.activeTab = this.getActiveTab();
    await this.save();
  }

  /**
   * Get currently open tabs with their pinned state
   */
  async getCurrentOpenTabs(): Promise<TabInfo[]> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) {
      // No workspace, return absolute paths
      return this.getOpenTabsAbsolute();
    }

    const tabs: TabInfo[] = [];
    const workspaceRoot = workspaceFolder.uri.fsPath;
    const seenPaths = new Set<string>();

    for (const tabGroup of vscode.window.tabGroups.all) {
      for (const tab of tabGroup.tabs) {
        const input = tab.input;

        // Only include file tabs (not settings, output, etc.)
        if (input instanceof vscode.TabInputText) {
          const filePath = input.uri.fsPath;

          // Convert to relative path from workspace root
          const relativePath = path.relative(workspaceRoot, filePath);

          // Only include files within workspace and avoid duplicates
          if (!relativePath.startsWith('..') && !seenPaths.has(relativePath)) {
            seenPaths.add(relativePath);
            tabs.push({
              path: relativePath,
              isPinned: tab.isPinned
            });
          }
        }
      }
    }

    return tabs;
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
   * Get currently open tabs as absolute paths with pinned state (fallback when no workspace)
   */
  private getOpenTabsAbsolute(): TabInfo[] {
    const tabs: TabInfo[] = [];
    const seenPaths = new Set<string>();

    for (const tabGroup of vscode.window.tabGroups.all) {
      for (const tab of tabGroup.tabs) {
        const input = tab.input;

        if (input instanceof vscode.TabInputText) {
          const filePath = input.uri.fsPath;
          if (!seenPaths.has(filePath)) {
            seenPaths.add(filePath);
            tabs.push({
              path: filePath,
              isPinned: tab.isPinned
            });
          }
        }
      }
    }

    return tabs;
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
   * Open tabs from file paths and restore pinned state
   * @param tabs - Array of TabInfo with relative paths (from workspace root) or absolute paths
   * @param taskFile - Optional task file (unused, kept for API compatibility)
   * @param activeTab - Optional active tab to focus after opening all tabs
   */
  async openTabs(tabs: TabInfo[], taskFile?: string, activeTab?: string): Promise<void> {
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

    // Helper to open a file and optionally pin it
    const openFile = async (filePath: string, preserveFocus: boolean, shouldPin: boolean): Promise<boolean> => {
      try {
        const absolutePath = toAbsolutePath(filePath);
        const uri = vscode.Uri.file(absolutePath);

        await vscode.window.showTextDocument(uri, {
          preview: false,
          preserveFocus
        });

        // Pin the tab if needed
        if (shouldPin) {
          await vscode.commands.executeCommand('workbench.action.pinEditor');
        }

        return true;
      } catch (error) {
        errors.push(filePath);
        return false;
      }
    };

    // Step 1: Open ALL tabs in their exact saved order (preserves tab ordering)
    for (const tab of tabs) {
      await openFile(tab.path, true, tab.isPinned);  // Don't steal focus yet
    }

    // Step 2: Focus the active tab (if specified) - don't reopen, just focus
    if (activeTab) {
      try {
        const absolutePath = toAbsolutePath(activeTab);
        const uri = vscode.Uri.file(absolutePath);
        await vscode.window.showTextDocument(uri, {
          preview: false,
          preserveFocus: false  // Give it focus
        });
      } catch (error) {
        // Tab might not exist, ignore
      }
    } else if (tabs.length > 0) {
      // No active tab specified, focus the first tab
      try {
        const absolutePath = toAbsolutePath(tabs[0].path);
        const uri = vscode.Uri.file(absolutePath);
        await vscode.window.showTextDocument(uri, {
          preview: false,
          preserveFocus: false  // Give it focus
        });
      } catch (error) {
        // Tab might not exist, ignore
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

  /**
   * Check if current open tabs match the saved task space tabs
   * Compares paths, order, and pinned state
   */
  async tabsMatchSavedState(taskSpace: TaskSpace): Promise<boolean> {
    const currentTabs = await this.getCurrentOpenTabs();
    const savedTabs = taskSpace.tabs;

    // Different number of tabs
    if (currentTabs.length !== savedTabs.length) {
      return false;
    }

    // Compare each tab in order
    for (let i = 0; i < currentTabs.length; i++) {
      const current = currentTabs[i];
      const saved = savedTabs[i];

      // Different path or pinned state
      if (current.path !== saved.path || current.isPinned !== saved.isPinned) {
        return false;
      }
    }

    return true;
  }

  /**
   * Diff-based switch to task space - applies minimal changes to match saved state
   * Only closes/opens/reorders/pins what's necessary
   */
  async diffSwitchToTaskSpace(id: string): Promise<void> {
    const taskSpace = this.data.taskSpaces.find(ts => ts.id === id);
    if (!taskSpace) {
      throw new Error('Task space not found');
    }

    const workspaceFolder = this.getWorkspaceFolder();
    const currentTabs = await this.getCurrentOpenTabs();
    const savedTabs = taskSpace.tabs;

    // Build sets for quick lookup
    const currentPaths = new Set(currentTabs.map(t => t.path));
    const savedPaths = new Set(savedTabs.map(t => t.path));

    // 1. Close tabs that should be removed
    const tabsToClose = currentTabs.filter(t => !savedPaths.has(t.path));
    for (const tab of tabsToClose) {
      await this.closeTabByPath(tab.path, workspaceFolder);
    }

    // 2. Open tabs that should be added (at end initially)
    const tabsToOpen = savedTabs.filter(t => !currentPaths.has(t.path));
    for (const tab of tabsToOpen) {
      await this.openSingleTab(tab.path, workspaceFolder);
    }

    // 3. Reorder tabs to match saved order
    await this.reorderTabsToMatch(savedTabs, workspaceFolder);

    // 4. Fix pin states
    await this.syncPinStates(savedTabs, workspaceFolder);

    // 5. Focus the active tab
    if (taskSpace.activeTab) {
      await this.focusTab(taskSpace.activeTab, workspaceFolder);
    }

    // Update metadata
    this.data.activeTaskSpaceId = id;
    taskSpace.lastAccessed = Date.now();
    await this.save();
  }

  /**
   * Close a specific tab by its path
   */
  private async closeTabByPath(relativePath: string, workspaceFolder: vscode.WorkspaceFolder | undefined): Promise<void> {
    const absolutePath = this.toAbsolutePath(relativePath, workspaceFolder);
    const uri = vscode.Uri.file(absolutePath);

    // Find the tab
    for (const tabGroup of vscode.window.tabGroups.all) {
      for (const tab of tabGroup.tabs) {
        const input = tab.input;
        if (input instanceof vscode.TabInputText && input.uri.fsPath === absolutePath) {
          await vscode.window.tabGroups.close(tab);
          return;
        }
      }
    }
  }

  /**
   * Open a single tab without pinning
   */
  private async openSingleTab(relativePath: string, workspaceFolder: vscode.WorkspaceFolder | undefined): Promise<void> {
    try {
      const absolutePath = this.toAbsolutePath(relativePath, workspaceFolder);
      const uri = vscode.Uri.file(absolutePath);
      await vscode.window.showTextDocument(uri, {
        preview: false,
        preserveFocus: true
      });
    } catch (error) {
      console.log(`Failed to open tab: ${relativePath}`);
    }
  }

  /**
   * Focus a specific tab
   */
  private async focusTab(relativePath: string, workspaceFolder: vscode.WorkspaceFolder | undefined): Promise<void> {
    try {
      const absolutePath = this.toAbsolutePath(relativePath, workspaceFolder);
      const uri = vscode.Uri.file(absolutePath);
      await vscode.window.showTextDocument(uri, {
        preview: false,
        preserveFocus: false
      });
    } catch (error) {
      // Tab might not exist
    }
  }

  /**
   * Reorder tabs to match the target order using move commands
   */
  private async reorderTabsToMatch(targetTabs: TabInfo[], workspaceFolder: vscode.WorkspaceFolder | undefined): Promise<void> {
    // Get current tab order
    const getCurrentOrder = (): string[] => {
      const paths: string[] = [];
      const workspaceRoot = workspaceFolder?.uri.fsPath;

      for (const tabGroup of vscode.window.tabGroups.all) {
        for (const tab of tabGroup.tabs) {
          const input = tab.input;
          if (input instanceof vscode.TabInputText) {
            const filePath = input.uri.fsPath;
            if (workspaceRoot) {
              const relativePath = path.relative(workspaceRoot, filePath);
              if (!relativePath.startsWith('..')) {
                paths.push(relativePath);
              }
            } else {
              paths.push(filePath);
            }
          }
        }
      }
      return paths;
    };

    const targetOrder = targetTabs.map(t => t.path);

    // Use insertion sort approach: for each position, move the correct tab there
    for (let targetPos = 0; targetPos < targetOrder.length; targetPos++) {
      const targetPath = targetOrder[targetPos];
      const currentOrder = getCurrentOrder();
      const currentPos = currentOrder.indexOf(targetPath);

      if (currentPos === -1 || currentPos === targetPos) {
        continue; // Tab not found or already in position
      }

      // Focus the tab we want to move
      await this.focusTab(targetPath, workspaceFolder);

      // Move it to the target position
      if (currentPos > targetPos) {
        // Need to move left
        const moves = currentPos - targetPos;
        for (let i = 0; i < moves; i++) {
          await vscode.commands.executeCommand('workbench.action.moveEditorLeftInGroup');
        }
      } else {
        // Need to move right
        const moves = targetPos - currentPos;
        for (let i = 0; i < moves; i++) {
          await vscode.commands.executeCommand('workbench.action.moveEditorRightInGroup');
        }
      }
    }
  }

  /**
   * Sync pin states to match saved state
   */
  private async syncPinStates(savedTabs: TabInfo[], workspaceFolder: vscode.WorkspaceFolder | undefined): Promise<void> {
    const workspaceRoot = workspaceFolder?.uri.fsPath;

    for (const savedTab of savedTabs) {
      const absolutePath = this.toAbsolutePath(savedTab.path, workspaceFolder);

      // Find the tab and check its current pin state
      for (const tabGroup of vscode.window.tabGroups.all) {
        for (const tab of tabGroup.tabs) {
          const input = tab.input;
          if (input instanceof vscode.TabInputText && input.uri.fsPath === absolutePath) {
            if (tab.isPinned !== savedTab.isPinned) {
              // Focus the tab and toggle pin
              await this.focusTab(savedTab.path, workspaceFolder);
              if (savedTab.isPinned) {
                await vscode.commands.executeCommand('workbench.action.pinEditor');
              } else {
                await vscode.commands.executeCommand('workbench.action.unpinEditor');
              }
            }
            break;
          }
        }
      }
    }
  }

  /**
   * Convert relative path to absolute path
   */
  private toAbsolutePath(relativePath: string, workspaceFolder: vscode.WorkspaceFolder | undefined): string {
    if (path.isAbsolute(relativePath)) {
      return relativePath;
    }
    if (workspaceFolder) {
      return path.join(workspaceFolder.uri.fsPath, relativePath);
    }
    return relativePath;
  }
}
