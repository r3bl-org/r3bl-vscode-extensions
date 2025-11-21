// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from 'vscode';
import { SearchPanel } from './searchPanel';
import { checkDependencies } from './dependencyChecker';
import { StatusBarMessage, StatusBarMessageType } from '@r3bl/shared';

export function activate(context: vscode.ExtensionContext) {
  console.log('R3BL Fuzzy Search extension is now active');

  // Register the interactive search command
  const searchDisposable = vscode.commands.registerCommand(
    'r3bl-fuzzy-search.searchInFiles',
    async () => {
      // Check dependencies
      const depsOk = await checkDependencies();
      if (!depsOk) {
        return;
      }

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        StatusBarMessage.show('Please open a folder first', StatusBarMessageType.Error);
        return;
      }

      SearchPanel.createOrShow(context.extensionUri, workspaceFolder.uri.fsPath);
    }
  );

  context.subscriptions.push(searchDisposable);
}

export function deactivate() {
  console.log('R3BL Fuzzy Search extension is now deactivated');
  StatusBarMessage.dispose();
}
