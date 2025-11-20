// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from 'vscode';
import { executeSearch } from './searchExecutor';
import { SearchInput, SearchResult } from './types';

interface SearchResultItem extends vscode.QuickPickItem {
  result?: SearchResult;
}

export async function executeInteractiveSearch(
  workspaceRoot: string
): Promise<void> {
  // Check dependencies first
  const { checkDependencies } = await import('./dependencyChecker');
  const depsOk = await checkDependencies();
  if (!depsOk) {
    return;
  }

  const config = vscode.workspace.getConfiguration('r3blFuzzySearch');
  const defaultExcludes = config.get<string>(
    'defaultExcludePattern',
    '**/node_modules/**,**/.git/**,**/.vscode/**,**/target/**'
  );
  const defaultRespectGitignore = config.get<boolean>('respectGitignore', true);

  const quickPick = vscode.window.createQuickPick<SearchResultItem>();
  quickPick.title = 'R3BL Fuzzy Search (Interactive)';
  quickPick.placeholder = 'Enter search query to see live results...';
  quickPick.matchOnDescription = false;
  quickPick.matchOnDetail = false;
  quickPick.canSelectMany = false;

  let currentExcludes = defaultExcludes;
  let currentRespectGitignore = defaultRespectGitignore;
  let searchTimeout: NodeJS.Timeout | undefined;
  let isSearching = false;
  let currentResults: SearchResult[] = [];
  let currentQuery = '';

  // Add buttons to modify excludes and toggle gitignore
  quickPick.buttons = [
    {
      iconPath: new vscode.ThemeIcon('settings-gear'),
      tooltip: 'Modify Exclude Patterns'
    },
    {
      iconPath: new vscode.ThemeIcon('search-stop'),
      tooltip: `Toggle .gitignore Respect (currently: ${currentRespectGitignore ? 'ON' : 'OFF'})`
    }
  ];

  // Function to perform search
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      quickPick.items = [];
      quickPick.busy = false;
      currentResults = [];
      currentQuery = '';
      return;
    }

    isSearching = true;
    quickPick.busy = true;

    try {
      const input: SearchInput = {
        query: query.trim(),
        excludePatterns: currentExcludes,
        respectGitignore: currentRespectGitignore
      };

      const results = await executeSearch(input, workspaceRoot);

      // Store results for later use
      currentResults = results;
      currentQuery = query.trim();

      // Convert results to QuickPick items
      const items: SearchResultItem[] = results.map(result => {
        // Clean ANSI codes from content
        const cleanContent = result.content.replace(/\x1b\[[0-9;]*m/g, '');

        // Get relative path for display
        const relativePath = result.file.replace(workspaceRoot + '/', '');

        return {
          label: `$(file) ${relativePath}:${result.line}`,
          description: cleanContent.trim().substring(0, 100),
          detail: result.file,
          result: result
        };
      });

      if (items.length === 0) {
        quickPick.items = [{
          label: '$(search) No results found',
          description: `Try a different query or modify exclude patterns`
        }];
      } else {
        const uniqueFiles = new Set(results.map(r => r.file)).size;
        const headerItem: SearchResultItem = {
          label: `$(search) Found ${results.length} results in ${uniqueFiles} files`,
          description: 'Select a result to open',
          kind: vscode.QuickPickItemKind.Separator
        };
        quickPick.items = [headerItem, ...items];
      }
    } catch (error) {
      quickPick.items = [{
        label: '$(error) Search failed',
        description: error instanceof Error ? error.message : String(error)
      }];
    } finally {
      isSearching = false;
      quickPick.busy = false;
    }
  };

  // Handle value changes (debounced search)
  quickPick.onDidChangeValue((value) => {
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Debounce search by 300ms
    searchTimeout = setTimeout(() => {
      performSearch(value);
    }, 300);
  });

  // Handle selection (Enter key)
  quickPick.onDidAccept(async () => {
    const query = quickPick.value.trim();

    // If there are results, save to file and open
    if (currentResults.length > 0 && query) {
      quickPick.hide();

      // Generate search editor content
      const { generateSearchEditorContent } = await import('./searchEditorGenerator');
      const input: SearchInput = {
        query: currentQuery,
        excludePatterns: currentExcludes,
        respectGitignore: currentRespectGitignore
      };
      const content = generateSearchEditorContent(input, currentResults);

      // Save to /tmp/
      const filename = query.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') + '.code-search';
      const filepath = `/tmp/${filename}`;
      const uri = vscode.Uri.file(filepath);
      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));

      // Open the saved file
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, {
        preview: false,
        viewColumn: vscode.ViewColumn.Active
      });

      // Show summary
      const uniqueFiles = new Set(currentResults.map(r => r.file)).size;
      vscode.window.showInformationMessage(
        `Found ${currentResults.length} results in ${uniqueFiles} files`
      );
    }
  });

  // Handle button clicks
  quickPick.onDidTriggerButton(async (button) => {
    const buttonIndex = quickPick.buttons.indexOf(button);

    if (buttonIndex === 0) {
      // Modify exclude patterns
      const newExcludes = await vscode.window.showInputBox({
        prompt: 'Files to exclude (comma-separated globs)',
        value: currentExcludes,
        placeHolder: 'e.g., **/test/**, **/dist/**',
        ignoreFocusOut: true
      });

      if (newExcludes !== undefined) {
        currentExcludes = newExcludes;
        // Re-run search with new excludes
        if (quickPick.value.trim()) {
          performSearch(quickPick.value);
        }
      }
    } else if (buttonIndex === 1) {
      // Toggle gitignore
      currentRespectGitignore = !currentRespectGitignore;

      // Update button tooltip
      quickPick.buttons = [
        quickPick.buttons[0],
        {
          iconPath: new vscode.ThemeIcon('search-stop'),
          tooltip: `Toggle .gitignore Respect (currently: ${currentRespectGitignore ? 'ON' : 'OFF'})`
        }
      ];

      // Re-run search with new gitignore setting
      if (quickPick.value.trim()) {
        performSearch(quickPick.value);
      }
    }
  });

  quickPick.onDidHide(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    quickPick.dispose();
  });

  quickPick.show();
}
