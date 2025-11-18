// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from 'vscode';
import { executeSearchCommand } from './searchCommand';

export function activate(context: vscode.ExtensionContext) {
  console.log('R3BL Fuzzy Search extension is now active');

  // Register the search command
  const disposable = vscode.commands.registerCommand(
    'r3bl-fuzzy-search.searchInFiles',
    executeSearchCommand
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {
  console.log('R3BL Fuzzy Search extension is now deactivated');
}
