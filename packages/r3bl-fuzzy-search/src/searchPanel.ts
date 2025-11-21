// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from 'vscode';
import { executeSearch } from './searchExecutor';
import { SearchInput, SearchResult } from './types';
import { StatusBarMessage, StatusBarMessageType } from '@r3bl/shared';

export class SearchPanel {
  public static currentPanel: SearchPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _workspaceRoot: string;
  private _disposables: vscode.Disposable[] = [];
  private _lastSearchInput: SearchInput | undefined;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, workspaceRoot: string) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._workspaceRoot = workspaceRoot;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'search':
            await this._handleSearch(message.query, message.excludePatterns, message.respectGitignore);
            return;
          case 'openFile':
            await this._handleOpenFile(message.file, message.line);
            return;
          case 'openInTab':
            await this._handleOpenInTab(message.query, message.excludePatterns, message.respectGitignore);
            return;
        }
      },
      null,
      this._disposables
    );
  }

  public static createOrShow(extensionUri: vscode.Uri, workspaceRoot: string) {
    // If we already have a panel, show it and focus the input
    if (SearchPanel.currentPanel) {
      SearchPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
      // Tell webview to focus the input
      SearchPanel.currentPanel._panel.webview.postMessage({ command: 'focusInput' });
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      'r3blFuzzySearch',
      'R3BL Fuzzy Search',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri]
      }
    );

    // Set the webview icon to match the extension
    panel.iconPath = vscode.Uri.joinPath(extensionUri, 'r3bl-cube-logo.png');

    // Explicitly set the title (might help with window title bar)
    panel.title = 'R3BL Fuzzy Search';

    SearchPanel.currentPanel = new SearchPanel(panel, extensionUri, workspaceRoot);
  }

  private async _handleSearch(query: string, excludePatterns: string, respectGitignore: boolean) {
    if (!query.trim()) {
      this._panel.webview.postMessage({
        command: 'searchResults',
        results: [],
        error: null
      });
      return;
    }

    try {
      const input: SearchInput = {
        query: query.trim(),
        excludePatterns,
        respectGitignore
      };

      this._lastSearchInput = input;

      // Show searching status
      this._panel.webview.postMessage({
        command: 'searchStatus',
        status: 'searching'
      });

      const results = await executeSearch(input, this._workspaceRoot);

      // Check if limit was reached
      const config = vscode.workspace.getConfiguration('r3blFuzzySearch');
      const resultLimit = config.get<number>('resultLimit', 100);
      const limitReached = results.length >= resultLimit;

      // Send results back to webview
      this._panel.webview.postMessage({
        command: 'searchResults',
        results: results.map(r => ({
          file: r.file,
          line: r.line,
          content: r.content.replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI codes
        })),
        error: null,
        limitReached: limitReached
      });

      this._panel.webview.postMessage({
        command: 'searchStatus',
        status: 'complete'
      });
    } catch (error) {
      this._panel.webview.postMessage({
        command: 'searchResults',
        results: [],
        error: error instanceof Error ? error.message : String(error)
      });

      this._panel.webview.postMessage({
        command: 'searchStatus',
        status: 'error'
      });
    }
  }

  private async _handleOpenFile(file: string, line: number) {
    try {
      const uri = vscode.Uri.file(file);
      const doc = await vscode.workspace.openTextDocument(uri);
      const lineIndex = line - 1; // Convert to 0-based
      const range = new vscode.Range(lineIndex, 0, lineIndex, 0);

      await vscode.window.showTextDocument(doc, {
        selection: range,
        viewColumn: vscode.ViewColumn.Two,
        preserveFocus: true
      });
    } catch (error) {
      StatusBarMessage.show(`Failed to open file: ${error instanceof Error ? error.message : String(error)}`, StatusBarMessageType.Error);
    }
  }

  private async _handleOpenInTab(query: string, excludePatterns: string, respectGitignore: boolean) {
    try {
      const input: SearchInput = {
        query: query.trim(),
        excludePatterns,
        respectGitignore
      };

      // Run the search to get results
      const results = await executeSearch(input, this._workspaceRoot);

      if (results.length === 0) {
        StatusBarMessage.show(`No results found for "${query}"`, StatusBarMessageType.Info);
        return;
      }

      // Generate search editor content
      const { generateSearchEditorContent } = await import('./searchEditorGenerator');
      const content = generateSearchEditorContent(input, results);

      // Save to /tmp/
      const filename = query.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') + '.code-search';
      const filepath = `/tmp/${filename}`;
      const uri = vscode.Uri.file(filepath);
      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));

      // Close the search panel first
      this._panel.dispose();

      // Open the saved file in the active column (replaces current tab)
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, {
        preview: false,
        viewColumn: vscode.ViewColumn.Active
      });

      // Show summary
      const uniqueFiles = new Set(results.map(r => r.file)).size;
      StatusBarMessage.show(`Found ${results.length} results in ${uniqueFiles} files`, StatusBarMessageType.Success);
    } catch (error) {
      StatusBarMessage.show(`Failed to open results: ${error instanceof Error ? error.message : String(error)}`, StatusBarMessageType.Error);
    }
  }

  public dispose() {
    SearchPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private _update() {
    const config = vscode.workspace.getConfiguration('r3blFuzzySearch');
    const defaultExcludes = config.get<string>(
      'defaultExcludePattern',
      '**/node_modules/**,**/.git/**,**/.vscode/**,**/target/**'
    );
    const defaultRespectGitignore = config.get<boolean>('respectGitignore', true);

    this._panel.webview.html = this._getHtmlForWebview(defaultExcludes, defaultRespectGitignore);
  }

  private _getHtmlForWebview(defaultExcludes: string, defaultRespectGitignore: boolean) {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>R3BL Fuzzy Search</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 16px;
      overflow: hidden;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .search-container {
      flex-shrink: 0;
      margin-bottom: 16px;
    }

    .search-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .search-input {
      flex: 1;
      padding: 6px 12px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
      font-family: var(--vscode-editor-font-family);
      font-size: var(--vscode-editor-font-size);
      line-height: var(--vscode-editor-line-height);
    }

    .search-input:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }

    .search-button {
      padding: 8px 16px;
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    .search-button:hover {
      background-color: var(--vscode-button-hoverBackground);
    }

    .search-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .search-options {
      display: flex;
      gap: 16px;
      align-items: center;
      font-size: 13px;
    }

    .search-options label {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }

    .search-options input[type="checkbox"] {
      cursor: pointer;
    }

    .exclude-input {
      flex: 1;
      padding: 4px 8px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
      font-family: var(--vscode-font-family);
      font-size: 12px;
    }

    .status-bar {
      padding: 10px 12px;
      margin-bottom: 0;
      background-color: var(--vscode-statusBar-background);
      color: var(--vscode-statusBar-foreground);
      font-size: 13px;
      font-weight: 500;
      display: none;
      position: sticky;
      top: 0;
      z-index: 10;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .status-bar.visible {
      display: block;
    }

    .status-bar.searching {
      background-color: var(--vscode-statusBarItem-warningBackground);
      color: var(--vscode-statusBarItem-warningForeground);
    }

    .status-bar.error {
      background-color: var(--vscode-statusBarItem-errorBackground);
      color: var(--vscode-statusBarItem-errorForeground);
    }

    .results-container {
      flex: 1;
      overflow-y: auto;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 2px;
      background-color: var(--vscode-editor-background);
    }

    .result-group {
      margin-bottom: 16px;
    }

    .result-file {
      padding: 4px 8px;
      background-color: var(--vscode-list-hoverBackground);
      font-weight: 600;
      font-size: var(--vscode-font-size);
      font-family: var(--vscode-font-family);
      border-bottom: 1px solid var(--vscode-panel-border);
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .result-line {
      padding: 2px 8px 2px 24px;
      border-bottom: 1px solid var(--vscode-widget-border);
      cursor: pointer;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      transition: background-color 0.1s;
    }

    .result-line:hover {
      background-color: var(--vscode-list-hoverBackground);
    }

    .result-line-number {
      color: var(--vscode-editorLineNumber-foreground);
      font-size: var(--vscode-editor-font-size);
      font-family: var(--vscode-editor-font-family);
      min-width: 35px;
      text-align: right;
      flex-shrink: 0;
      padding-top: 1px;
    }

    .result-content {
      flex: 1;
      font-family: var(--vscode-editor-font-family);
      font-size: var(--vscode-editor-font-size);
      line-height: var(--vscode-editor-line-height);
      white-space: pre-wrap;
      word-break: break-all;
    }

    .no-results {
      padding: 32px;
      text-align: center;
      color: var(--vscode-descriptionForeground);
    }

    .instructions {
      padding: 32px;
      text-align: center;
      color: var(--vscode-descriptionForeground);
    }
  </style>
</head>
<body>
  <div class="search-container">
    <div class="search-header">
      <input
        type="text"
        id="searchInput"
        class="search-input"
        placeholder="Enter search query (e.g., console.log, function, import)"
        autofocus
      />
      <button id="searchButton" class="search-button">Open preview results in tab</button>
    </div>
    <div class="search-options">
      <label>
        <input type="checkbox" id="respectGitignore" ${defaultRespectGitignore ? 'checked' : ''} />
        Respect .gitignore
      </label>
      <label style="flex: 1; display: flex; align-items: center; gap: 6px;">
        <span>Exclude:</span>
        <input
          type="text"
          id="excludePatterns"
          class="exclude-input"
          value="${defaultExcludes}"
          placeholder="e.g., **/test/**, **/dist/**"
        />
      </label>
    </div>
  </div>

  <div id="statusBar" class="status-bar"></div>

  <div class="results-container" id="resultsContainer">
    <div class="instructions">
      <p>💡 Type a search query above and press Enter or click Search</p>
      <p style="margin-top: 8px; font-size: 12px;">Results will appear here with live updates</p>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const excludePatterns = document.getElementById('excludePatterns');
    const respectGitignore = document.getElementById('respectGitignore');
    const resultsContainer = document.getElementById('resultsContainer');
    const statusBar = document.getElementById('statusBar');

    let searchTimeout;

    function performSearch() {
      const query = searchInput.value.trim();
      if (!query) return;

      vscode.postMessage({
        command: 'search',
        query: query,
        excludePatterns: excludePatterns.value,
        respectGitignore: respectGitignore.checked
      });
    }

    searchButton.addEventListener('click', openResultsInTab);

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        // Open results in tab (same as clicking the button)
        openResultsInTab();
      }
    });

    // Debounced live search
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      const query = searchInput.value.trim();

      // If query is empty, clear results immediately
      if (query.length === 0) {
        resultsContainer.innerHTML = \`
          <div class="instructions">
            <p>💡 Type a search query above and press Enter or click Search</p>
            <p style="margin-top: 8px; font-size: 12px;">Results will appear here with live updates</p>
          </div>
        \`;
        statusBar.className = 'status-bar';
        return;
      }

      // Debounce search for queries with 2+ characters
      if (query.length >= 2) {
        searchTimeout = setTimeout(() => {
          performSearch();
        }, 250);
      }
    });

    // Re-run search when exclude patterns change
    excludePatterns.addEventListener('input', () => {
      const query = searchInput.value.trim();
      if (query.length >= 2) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          performSearch();
        }, 250);
      }
    });

    // Re-run search when gitignore checkbox changes
    respectGitignore.addEventListener('change', () => {
      const query = searchInput.value.trim();
      if (query.length >= 2) {
        performSearch();
      }
    });

    function openResultsInTab() {
      const query = searchInput.value.trim();
      if (!query) return;

      vscode.postMessage({
        command: 'openInTab',
        query: query,
        excludePatterns: excludePatterns.value,
        respectGitignore: respectGitignore.checked
      });
    }

    // Handle messages from the extension
    window.addEventListener('message', event => {
      const message = event.data;

      switch (message.command) {
        case 'focusInput':
          searchInput.focus();
          searchInput.select();
          break;

        case 'searchStatus':
          if (message.status === 'searching') {
            statusBar.textContent = '🔍 Searching...';
            statusBar.className = 'status-bar visible searching';
            searchButton.disabled = true;
          } else if (message.status === 'complete') {
            // Don't hide status bar - keep it visible
            searchButton.disabled = false;
          } else if (message.status === 'error') {
            statusBar.textContent = '❌ Search failed';
            statusBar.className = 'status-bar visible error';
            searchButton.disabled = false;
          }
          break;

        case 'searchResults':
          displayResults(message.results, message.error, message.limitReached);
          break;
      }
    });

    function displayResults(results, error, limitReached) {
      if (error) {
        resultsContainer.innerHTML = \`
          <div class="no-results">
            <p>❌ Error: \${error}</p>
          </div>
        \`;
        return;
      }

      if (!results || results.length === 0) {
        resultsContainer.innerHTML = \`
          <div class="no-results">
            <p>No results found</p>
            <p style="margin-top: 8px; font-size: 12px;">Try a different query or modify exclude patterns</p>
          </div>
        \`;
        return;
      }

      // Group results by file
      const byFile = {};
      for (const result of results) {
        if (!byFile[result.file]) {
          byFile[result.file] = [];
        }
        byFile[result.file].push(result);
      }

      // Build HTML
      let html = '';
      const uniqueFiles = Object.keys(byFile).length;

      // Show warning if limit was reached
      if (limitReached) {
        statusBar.textContent = \`⚠️ Search limited to \${results.length} results. Consider narrowing your query.\`;
        statusBar.className = 'status-bar visible searching';
      } else {
        statusBar.textContent = \`✓ Found \${results.length} results in \${uniqueFiles} files\`;
        statusBar.className = 'status-bar visible';
      }

      for (const [file, fileResults] of Object.entries(byFile)) {
        // Get relative path for display
        const displayPath = file.replace('${this._workspaceRoot}/', '');

        html += \`<div class="result-group">\`;
        html += \`<div class="result-file">\${displayPath}</div>\`;

        // Sort by line number
        fileResults.sort((a, b) => a.line - b.line);

        for (const result of fileResults) {
          const escapedContent = escapeHtml(result.content.trim());
          html += \`
            <div class="result-line" data-file="\${result.file}" data-line="\${result.line}">
              <span class="result-line-number">\${result.line}</span>
              <span class="result-content">\${escapedContent}</span>
            </div>
          \`;
        }

        html += \`</div>\`;
      }

      resultsContainer.innerHTML = html;

      // Add click handlers
      document.querySelectorAll('.result-line').forEach(el => {
        el.addEventListener('click', () => {
          vscode.postMessage({
            command: 'openFile',
            file: el.dataset.file,
            line: parseInt(el.dataset.line)
          });
        });
      });
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Focus input on page load
    window.addEventListener('load', () => {
      // Use setTimeout to ensure webview is fully ready
      setTimeout(() => {
        searchInput.focus();
        searchInput.select();
      }, 100);
    });

    // Re-focus input when webview gains focus (e.g., clicking back into VSCode)
    window.addEventListener('focus', () => {
      searchInput.focus();
    });

    // Also handle visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        searchInput.focus();
      }
    });
  </script>
</body>
</html>`;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
