// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

/**
 * Task Space Switching Architecture
 * ==================================
 *
 * All task space switching uses diff-based restore for minimal UI disruption.
 * The core implementation is private, with two public entry points named by trigger:
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │              diffSwitchToTaskSpace (private)                │
 * │              - Diff-based UI changes only                   │
 * │              - No save                                      │
 * └─────────────────────────────────────────────────────────────┘
 *                     ▲                           ▲
 *                     │                           │
 *         ┌───────────┴───────────┐   ┌───────────┴───────────┐
 *         │ switchToTaskSpace     │   │ switchToTaskSpace     │
 *         │ FromUserAction        │   │ FromFileWatcher       │
 *         │ (public)              │   │ (public)              │
 *         │ - Saves after switch  │   │ - No save             │
 *         │                       │   │ - Suppresses auto-save│
 *         └───────────────────────┘   └───────────────────────┘
 *
 * Why two entry points?
 * - FromUserAction: User clicks UI to switch → must persist the change
 * - FromFileWatcher: External change detected → just apply UI state,
 *   don't write back, and suppress auto-save during sync
 *
 *
 * Checksum-Based Change Detection
 * ===============================
 *
 * When multiple VS Code instances have the same project open, we need to detect
 * whether a file change came from our own save or from another instance.
 *
 * Problem: File watcher fires for ALL changes to task-spaces.json, including
 * our own writes. Without detection, this causes infinite sync loops:
 *   A saves → B's watcher fires → B applies → B saves → A's watcher fires → ...
 *
 * Solution: Track SHA256 checksum of what we last wrote (lastSavedChecksum).
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │                    lastSavedChecksum                        │
 *   │         (in-memory, per VS Code instance)                   │
 *   │                                                             │
 *   │  - Set to null on construction                              │
 *   │  - Set to file's checksum in initialize() at startup        │
 *   │  - Updated after every save()                               │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * When file watcher fires:
 *   1. Load new data from disk
 *   2. Compute checksum of loaded data
 *   3. Compare with lastSavedChecksum:
 *      - Match → We wrote this, skip (isOwnSave returns true)
 *      - Differ → External change, apply it (isOwnSave returns false)
 *
 * Example with two VS Code instances:
 *
 *   VS Code A                              VS Code B
 *   ─────────                              ─────────
 *   lastSavedChecksum = "abc123"           lastSavedChecksum = "xyz789"
 *
 *   A saves → file checksum "def456"
 *   A's lastSavedChecksum = "def456"
 *
 *                                          B's file watcher fires
 *                                          B loads → checksum "def456"
 *                                          "def456" !== "xyz789" → External!
 *                                          B applies changes
 *                                          B's lastSavedChecksum = "def456"
 *
 *   A's file watcher fires
 *   A loads → checksum "def456"
 *   "def456" === "def456" → Own save, skip!
 *
 *
 * Auto-Save Suppression During File Watcher Sync
 * ==============================================
 *
 * Problem: When syncing from file watcher, tab changes trigger onDidChangeTabs,
 * which would trigger auto-save after 500ms, causing another sync loop:
 *   A saves → B syncs → B's tabs change → B auto-saves → A syncs → ...
 *
 * Solution: Track active file watcher syncs with a counter (pendingFileWatcherSyncs).
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │                 pendingFileWatcherSyncs                     │
 *   │         (in-memory counter, per VS Code instance)           │
 *   │                                                             │
 *   │  - Incremented before diffSwitchToTaskSpace in file watcher │
 *   │  - Decremented after diffSwitchToTaskSpace completes        │
 *   │  - Auto-save skips if counter > 0                           │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Flow:
 *   1. File watcher detects external change
 *   2. switchToTaskSpaceFromFileWatcher increments counter
 *   3. diffSwitchToTaskSpace changes tabs → onDidChangeTabs fires
 *   4. Auto-save checks isSyncingFromFileWatcher() → true → skips
 *   5. diffSwitchToTaskSpace completes → counter decremented
 *   6. Future user tab changes → counter is 0 → auto-save works normally
 *
 * Uses a counter (not boolean) to handle theoretical overlapping syncs.
 * No timing-based logic needed - the counter is set/cleared synchronously
 * around the async operation.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { showStatusBarMessage } from 'r3bl-common-code';
import { TabInfo, TaskSpace, TaskSpaceStorage } from './types';
import { Storage } from './storage';
import { randomUUID, createHash } from 'crypto';

export class TaskSpaceManager {
    private storage: Storage;
    private data: TaskSpaceStorage;
    private lastSavedChecksum: string | null = null;

    /**
     * Counter tracking active file watcher sync operations.
     *
     * When syncing from file watcher, tab changes occur which trigger onDidChangeTabs.
     * Without this counter, those tab changes would trigger auto-save, causing a loop:
     *   A saves → B syncs → B's tabs change → B auto-saves → A syncs → ...
     *
     * By incrementing before sync and decrementing after, we can check if tab changes
     * are from file watcher sync (counter > 0) and skip auto-save in that case.
     *
     * Uses a counter (not boolean) to handle theoretical edge case of overlapping syncs.
     */
    private pendingFileWatcherSyncs: number = 0;

    constructor(context: vscode.ExtensionContext) {
        this.storage = new Storage(context);
        this.data = { version: '2.0', taskSpaces: [], activeTaskSpaceId: undefined };
    }

    /**
     * Check if currently syncing from file watcher (to suppress auto-save)
     */
    isSyncingFromFileWatcher(): boolean {
        return this.pendingFileWatcherSyncs > 0;
    }

    /**
     * Compute SHA256 checksum of task space data for change detection
     */
    private computeChecksum(data: TaskSpaceStorage): string {
        const json = JSON.stringify(data);
        return createHash('sha256').update(json).digest('hex');
    }

    /**
     * Check if loaded data matches what we last saved (to detect external changes)
     * Returns true if the data is from our own save, false if it's an external change
     */
    isOwnSave(loadedData: TaskSpaceStorage): boolean {
        if (this.lastSavedChecksum === null) {
            return false; // Never saved, must be external
        }
        const loadedChecksum = this.computeChecksum(loadedData);
        return loadedChecksum === this.lastSavedChecksum;
    }

    /**
     * Initialize manager by loading data from storage
     */
    async initialize(): Promise<void> {
        this.data = await this.storage.loadTaskSpaces();
        // Set initial checksum so we don't treat first load as external change
        this.lastSavedChecksum = this.computeChecksum(this.data);
    }

    /**
     * Reload task spaces from disk (e.g., after git branch switch)
     * Returns the loaded data for checksum comparison
     */
    async reloadFromDisk(): Promise<TaskSpaceStorage> {
        this.data = await this.storage.loadTaskSpaces();
        return this.data;
    }

    /**
     * Save current state to storage and update checksum
     */
    private async save(): Promise<void> {
        await this.storage.saveTaskSpaces(this.data);
        this.lastSavedChecksum = this.computeChecksum(this.data);
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
        return this.data.taskSpaces.find((ts) => ts.id === this.data.activeTaskSpaceId);
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
    async createTaskSpace(
        name: string,
        taskFile?: string,
        setAsActive: boolean = false,
    ): Promise<TaskSpace> {
        // Validate name is unique
        if (this.data.taskSpaces.some((ts) => ts.name === name)) {
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
        };

        this.data.taskSpaces.push(taskSpace);

        // Set as active if requested (atomically with creation)
        if (setAsActive) {
            this.data.activeTaskSpaceId = taskSpace.id;
        }

        // Set lastAccessed in workspace state (stored separately to avoid git noise)
        await this.storage.setLastAccessed(taskSpace.id, Date.now());

        await this.save();

        return taskSpace;
    }

    /**
     * Delete a task space
     */
    async deleteTaskSpace(id: string): Promise<void> {
        const index = this.data.taskSpaces.findIndex((ts) => ts.id === id);
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

        // Clean up lastAccessed metadata from workspace state to prevent memory leaks
        await this.storage.removeLastAccessed(id);

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
                overwrite: false,
            });
        } catch (error) {
            // Log error but don't throw - we still want to delete the task space
            console.error(`Failed to move task file ${taskFile} to done/:`, error);

            // Show warning to user
            showStatusBarMessage(`Task space deleted but file move failed`, 'warning');
        }
    }

    /**
     * Switch to a different task space - triggered by user action (UI click)
     * Saves the change to persist user's intent.
     */
    async switchToTaskSpaceFromUserAction(id: string): Promise<void> {
        await this.diffSwitchToTaskSpace(id);
        await this.save();
    }

    /**
     * Switch to task space - triggered by file watcher (external sync)
     * Does NOT save (just applies external state to UI).
     * Uses pendingFileWatcherSyncs counter to suppress auto-save during sync.
     * Returns true if changes were made, false if tabs already matched.
     */
    async switchToTaskSpaceFromFileWatcher(id: string): Promise<boolean> {
        const taskSpace = this.data.taskSpaces.find((ts) => ts.id === id);
        if (!taskSpace) {
            throw new Error('Task space not found');
        }

        // Check if current tabs already match saved state
        const tabsMatch = await this.tabsMatchSavedState(taskSpace);

        if (!tabsMatch) {
            // Increment counter to suppress auto-save during sync
            this.pendingFileWatcherSyncs++;
            try {
                // Use diff-based restore for minimal UI disruption
                await this.diffSwitchToTaskSpace(id);
            } finally {
                this.pendingFileWatcherSyncs--;
            }
            return true;
        }

        return false;
    }

    /**
     * Rename a task space
     */
    async renameTaskSpace(id: string, newName: string): Promise<void> {
        const taskSpace = this.data.taskSpaces.find((ts) => ts.id === id);
        if (!taskSpace) {
            throw new Error('Task space not found');
        }

        // Validate new name is unique
        if (this.data.taskSpaces.some((ts) => ts.name === newName && ts.id !== id)) {
            throw new Error(`Task space "${newName}" already exists`);
        }

        taskSpace.name = newName;
        await this.save();
    }

    /**
     * Update tabs for a task space
     */
    async updateTaskSpaceTabs(id: string, tabs: TabInfo[]): Promise<void> {
        const taskSpace = this.data.taskSpaces.find((ts) => ts.id === id);
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
                            isPinned: tab.isPinned,
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
                            isPinned: tab.isPinned,
                        });
                    }
                }
            }
        }

        return tabs;
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
                    return (
                        type === vscode.FileType.File &&
                        name.startsWith('task_') &&
                        name.endsWith('.md')
                    );
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
            this.data.taskSpaces.filter((ts) => ts.taskFile).map((ts) => ts.taskFile!),
        );

        return allTaskFiles.filter((file) => !linkedFiles.has(file));
    }

    /**
     * Check if a task file has a linked task space
     */
    hasLinkedTaskSpace(taskFile: string): boolean {
        return this.data.taskSpaces.some((ts) => ts.taskFile === taskFile);
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

        // Compare active tab
        const currentActiveTab = this.getActiveTab();
        if (taskSpace.activeTab !== currentActiveTab) {
            return false;
        }

        return true;
    }

    /**
     * Diff-based switch to task space - applies minimal changes to match saved state
     * Only closes/opens/reorders/pins what's necessary
     * NOTE: Does not save - caller is responsible for saving if needed
     */
    private async diffSwitchToTaskSpace(id: string): Promise<void> {
        const taskSpace = this.data.taskSpaces.find((ts) => ts.id === id);
        if (!taskSpace) {
            throw new Error('Task space not found');
        }

        const workspaceFolder = this.getWorkspaceFolder();
        const currentTabs = await this.getCurrentOpenTabs();
        const savedTabs = taskSpace.tabs;

        // Build sets for quick lookup
        const currentPaths = new Set(currentTabs.map((t) => t.path));
        const savedPaths = new Set(savedTabs.map((t) => t.path));

        // 1. Close tabs that should be removed
        const tabsToClose = currentTabs.filter((t) => !savedPaths.has(t.path));
        for (const tab of tabsToClose) {
            await this.closeTabByPath(tab.path, workspaceFolder);
        }

        // 2. Open tabs that should be added (at end initially)
        const tabsToOpen = savedTabs.filter((t) => !currentPaths.has(t.path));
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

        // Update in-memory metadata (caller saves if needed)
        this.data.activeTaskSpaceId = id;

        // Update lastAccessed in workspace state (stored separately to avoid git noise)
        await this.storage.setLastAccessed(id, Date.now());
    }

    /**
     * Close a specific tab by its path
     */
    private async closeTabByPath(
        relativePath: string,
        workspaceFolder: vscode.WorkspaceFolder | undefined,
    ): Promise<void> {
        const absolutePath = this.toAbsolutePath(relativePath, workspaceFolder);
        const uri = vscode.Uri.file(absolutePath);

        // Find the tab
        for (const tabGroup of vscode.window.tabGroups.all) {
            for (const tab of tabGroup.tabs) {
                const input = tab.input;
                if (
                    input instanceof vscode.TabInputText &&
                    input.uri.fsPath === absolutePath
                ) {
                    await vscode.window.tabGroups.close(tab);
                    return;
                }
            }
        }
    }

    /**
     * Open a single tab without pinning
     */
    private async openSingleTab(
        relativePath: string,
        workspaceFolder: vscode.WorkspaceFolder | undefined,
    ): Promise<void> {
        try {
            const absolutePath = this.toAbsolutePath(relativePath, workspaceFolder);
            const uri = vscode.Uri.file(absolutePath);
            await vscode.window.showTextDocument(uri, {
                preview: false,
                preserveFocus: true,
            });
        } catch (error) {
            console.log(`Failed to open tab: ${relativePath}`);
        }
    }

    /**
     * Focus a specific tab
     */
    private async focusTab(
        relativePath: string,
        workspaceFolder: vscode.WorkspaceFolder | undefined,
    ): Promise<void> {
        try {
            const absolutePath = this.toAbsolutePath(relativePath, workspaceFolder);
            const uri = vscode.Uri.file(absolutePath);
            await vscode.window.showTextDocument(uri, {
                preview: false,
                preserveFocus: false,
            });
        } catch (error) {
            // Tab might not exist
        }
    }

    /**
     * Reorder tabs to match the target order using move commands
     */
    private async reorderTabsToMatch(
        targetTabs: TabInfo[],
        workspaceFolder: vscode.WorkspaceFolder | undefined,
    ): Promise<void> {
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

        const targetOrder = targetTabs.map((t) => t.path);

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
                    await vscode.commands.executeCommand(
                        'workbench.action.moveEditorLeftInGroup',
                    );
                }
            } else {
                // Need to move right
                const moves = targetPos - currentPos;
                for (let i = 0; i < moves; i++) {
                    await vscode.commands.executeCommand(
                        'workbench.action.moveEditorRightInGroup',
                    );
                }
            }
        }
    }

    /**
     * Sync pin states to match saved state
     */
    private async syncPinStates(
        savedTabs: TabInfo[],
        workspaceFolder: vscode.WorkspaceFolder | undefined,
    ): Promise<void> {
        const workspaceRoot = workspaceFolder?.uri.fsPath;

        for (const savedTab of savedTabs) {
            const absolutePath = this.toAbsolutePath(savedTab.path, workspaceFolder);

            // Find the tab and check its current pin state
            for (const tabGroup of vscode.window.tabGroups.all) {
                for (const tab of tabGroup.tabs) {
                    const input = tab.input;
                    if (
                        input instanceof vscode.TabInputText &&
                        input.uri.fsPath === absolutePath
                    ) {
                        if (tab.isPinned !== savedTab.isPinned) {
                            // Focus the tab and toggle pin
                            await this.focusTab(savedTab.path, workspaceFolder);
                            if (savedTab.isPinned) {
                                await vscode.commands.executeCommand(
                                    'workbench.action.pinEditor',
                                );
                            } else {
                                await vscode.commands.executeCommand(
                                    'workbench.action.unpinEditor',
                                );
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
    private toAbsolutePath(
        relativePath: string,
        workspaceFolder: vscode.WorkspaceFolder | undefined,
    ): string {
        if (path.isAbsolute(relativePath)) {
            return relativePath;
        }
        if (workspaceFolder) {
            return path.join(workspaceFolder.uri.fsPath, relativePath);
        }
        return relativePath;
    }

    /**
     * Get lastAccessed timestamp for a task space
     * This is stored in workspace state separately from task-spaces.json to avoid git noise
     */
    async getLastAccessed(taskSpaceId: string): Promise<number | undefined> {
        return await this.storage.getLastAccessed(taskSpaceId);
    }

    /**
     * Get all lastAccessed timestamps for all task spaces
     * This is stored in workspace state separately from task-spaces.json to avoid git noise
     */
    async getAllLastAccessed(): Promise<Record<string, number>> {
        return await this.storage.getAllLastAccessed();
    }
}
