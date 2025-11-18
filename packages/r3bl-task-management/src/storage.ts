// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from 'vscode';
import { TaskSpaceStorage } from './types';

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
