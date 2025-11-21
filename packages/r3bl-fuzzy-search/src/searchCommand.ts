// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from 'vscode';
import { checkDependencies } from './dependencyChecker';
import { collectSearchInput } from './inputCollector';
import { executeSearch } from './searchExecutor';
import { generateSearchEditorContent } from './searchEditorGenerator';
import { StatusBarMessage, StatusBarMessageType } from '@r3bl/shared';

async function displayResults(content: string, query: string) {
  // Create filename from query (replace spaces with underscores)
  const filename = query.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') + '.code-search';
  const filepath = `/tmp/${filename}`;

  // Save to /tmp/
  const uri = vscode.Uri.file(filepath);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));

  // Open the saved file
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc, {
    preview: false,
    viewColumn: vscode.ViewColumn.Active
  });
}

export async function executeSearchCommand() {
  // 1. Check dependencies
  const depsOk = await checkDependencies();
  if (!depsOk) {
    return;
  }

  // 2. Get workspace root
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    StatusBarMessage.show('Please open a folder first', StatusBarMessageType.Error);
    return;
  }

  const workspaceRoot = workspaceFolder.uri.fsPath;

  // 3. Collect input
  const input = await collectSearchInput();
  if (!input) {
    return; // User cancelled
  }

  // 4. Execute search
  try {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Searching with fzf...',
      cancellable: false
    }, async () => {
      const results = await executeSearch(input, workspaceRoot);

      if (results.length === 0) {
        StatusBarMessage.show(`No results found for "${input.query}"`, StatusBarMessageType.Info);
        return;
      }

      // 5. Generate Search Editor content
      const content = generateSearchEditorContent(input, results);

      // 6. Display results (save to /tmp/)
      await displayResults(content, input.query);

      // 7. Show summary
      const uniqueFiles = new Set(results.map(r => r.file)).size;
      StatusBarMessage.show(`Found ${results.length} results in ${uniqueFiles} files`, StatusBarMessageType.Success);
    });
  } catch (error) {
    StatusBarMessage.show(`Search failed: ${error instanceof Error ? error.message : String(error)}`, StatusBarMessageType.Error);
  }
}
