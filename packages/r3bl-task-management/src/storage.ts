// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from 'vscode';
import { TabInfo, TaskSpaceStorage } from './types';

const STORAGE_FILE = '.vscode/task-spaces.json';
const CURRENT_VERSION = '3.0';

/**
 * Manages task space storage using a split architecture:
 *
 * 1. Task Space Definitions (.vscode/task-spaces.json):
 *    - Stored in workspace files (can be version controlled)
 *    - Contains: name, id, tabs, taskFile, activeTab, createdAt
 *    - Only changes when spaces are created/deleted/renamed
 *
 * 2. Per-Instance State (VSCode Workspace State):
 *    - Stored in VSCode's internal database (NOT version controlled)
 *    - Contains:
 *      - activeTaskSpaceId: Which task space is active in THIS window
 *      - lastAccessed timestamps for each task space (for sorting)
 *    - Updated frequently (every task space switch)
 *    - Location: ~/.config/Code/User/workspaceStorage/<workspace-id>/state.vscode.*
 *
 * This split:
 * - Prevents git noise from frequent timestamp updates
 * - Allows multiple VSCode instances to have different task spaces active simultaneously
 * - Keeps task space definitions clean and shareable
 */
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
     * Get lastAccessed timestamp for a task space from workspace state
     * This is stored separately from the task-spaces.json file to avoid git noise
     * @param taskSpaceId The task space ID
     * @returns The lastAccessed timestamp, or undefined if not found
     */
    async getLastAccessed(taskSpaceId: string): Promise<number | undefined> {
        const metadata = this.context.workspaceState.get<
            Record<string, { lastAccessed: number }>
        >('taskSpaceMetadata', {});
        return metadata[taskSpaceId]?.lastAccessed;
    }

    /**
     * Set lastAccessed timestamp for a task space in workspace state
     * This is stored separately from the task-spaces.json file to avoid git noise
     * @param taskSpaceId The task space ID
     * @param timestamp The timestamp to set
     */
    async setLastAccessed(taskSpaceId: string, timestamp: number): Promise<void> {
        const metadata = this.context.workspaceState.get<
            Record<string, { lastAccessed: number }>
        >('taskSpaceMetadata', {});
        metadata[taskSpaceId] = { lastAccessed: timestamp };
        await this.context.workspaceState.update('taskSpaceMetadata', metadata);
    }

    /**
     * Get all lastAccessed timestamps for all task spaces
     * Used for sorting and displaying in the UI
     * @returns A map of task space IDs to lastAccessed timestamps
     */
    async getAllLastAccessed(): Promise<Record<string, number>> {
        const metadata = this.context.workspaceState.get<
            Record<string, { lastAccessed: number }>
        >('taskSpaceMetadata', {});
        const result: Record<string, number> = {};
        for (const [id, meta] of Object.entries(metadata)) {
            result[id] = meta.lastAccessed;
        }
        return result;
    }

    /**
     * Remove lastAccessed metadata for a deleted task space
     * This prevents orphaned metadata from accumulating in workspace state
     * @param taskSpaceId The task space ID to remove
     */
    async removeLastAccessed(taskSpaceId: string): Promise<void> {
        const metadata = this.context.workspaceState.get<
            Record<string, { lastAccessed: number }>
        >('taskSpaceMetadata', {});
        delete metadata[taskSpaceId];
        await this.context.workspaceState.update('taskSpaceMetadata', metadata);
    }

    /**
     * Get activeTaskSpaceId from workspaceState (per-instance, not shared)
     * This allows multiple VSCode windows to have different task spaces active
     */
    getActiveTaskSpaceId(): string | undefined {
        return this.context.workspaceState.get<string>('activeTaskSpaceId');
    }

    /**
     * Set activeTaskSpaceId in workspaceState (per-instance, not shared)
     * @param id The task space ID to set as active, or undefined to clear
     */
    async setActiveTaskSpaceId(id: string | undefined): Promise<void> {
        await this.context.workspaceState.update('activeTaskSpaceId', id);
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
        };
    }

    /**
     * Migrate storage to current version if needed
     */
    private migrateIfNeeded(data: TaskSpaceStorage): TaskSpaceStorage {
        // Handle missing version (very old files)
        if (!data.version) {
            data.version = '1.0';
        }

        // Migrate from 1.0 to 2.0: Convert tabs from string[] to TabInfo[]
        if (data.version === '1.0') {
            for (const taskSpace of data.taskSpaces) {
                // Check if tabs are in old format (string[])
                if (taskSpace.tabs.length > 0 && typeof taskSpace.tabs[0] === 'string') {
                    // Cast to unknown first to handle the type mismatch during migration
                    const oldTabs = taskSpace.tabs as unknown as string[];
                    const newTabs: TabInfo[] = oldTabs.map((path) => ({
                        path,
                        isPinned: false, // Default to not pinned for migrated tabs
                    }));
                    taskSpace.tabs = newTabs;
                }
            }
            data.version = '2.0';
        }

        // Migrate from 2.0 to 3.0: Move activeTaskSpaceId to workspaceState
        if (data.version === '2.0') {
            // Extract legacy activeTaskSpaceId before removing it
            // In 2.0, activeTaskSpaceId was stored in the JSON file
            const legacyData = data as TaskSpaceStorage & { activeTaskSpaceId?: string };
            const legacyActiveId = legacyData.activeTaskSpaceId;

            // Migrate to workspaceState (only if workspaceState doesn't already have a value)
            if (legacyActiveId && !this.getActiveTaskSpaceId()) {
                // Note: Using sync update since migrateIfNeeded is called during load
                this.context.workspaceState.update('activeTaskSpaceId', legacyActiveId);
            }

            // Remove from data structure (TypeScript doesn't know about the old field)
            delete legacyData.activeTaskSpaceId;

            data.version = '3.0';
        }

        return data;
    }
}
