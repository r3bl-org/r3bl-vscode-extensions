# Feature: Git History for a File

## Objective
Add a new command to `r3bl-fuzzy-search` that displays the complete git history of the currently active file, including diffs and following renames, in a searchable and navigable editor tab.

## Design
- **Command ID**: `r3bl-fuzzy-search.showFileGitHistory`
- **Trigger**: 
    - Default Keybinding: `Ctrl+Shift+H` (Mac: `Cmd+Shift+H`)
    - Editor Context Menu: "R3BL: Show File Git History"
- **CLI Command**: `git log --follow -p -n <limit> -- <file-path>`
- **Configuration**: `r3blFuzzySearch.fileHistoryLimit` (default: 50) to prevent performance issues on large files.
- **Parsing Strategy**: 
    - Raw output from `git log` must be split into per-commit chunks (using the `commit [SHA]` header as a delimiter).
    - Each chunk is then passed to the existing `parseUnifiedDiff()` logic.
- **Navigation (The "Landing" Problem)**:
    - To allow clicking on historical lines that no longer exist in the current workspace, implement a `TextDocumentContentProvider` with a custom URI scheme (e.g., `r3bl-history:`).
    - Format: `r3bl-history:/[SHA]/[RELATIVE_PATH]`
    - When a user clicks a line in the history tab, the extension will serve the content of that file at that specific SHA via the provider.
- **Output Format**: Use the `.code-search` format (Search Editor) but with the custom virtual URIs for historical sections.

## Implementation Steps

1. **Update `package.json`**:
   - Register the new command and keybinding.
   - Register the `r3bl-history` URI scheme.
   - Add `editor/context` menu contribution.
   - Add `r3blFuzzySearch.fileHistoryLimit` setting.

2. **Source Code Changes (`packages/r3bl-fuzzy-search/src/`)**:
   - **`extension.ts`**: Register the new command handler and the `VirtualDocumentProvider`.
   - **`historyProvider.ts` (New File)**:
     - Implement `vscode.TextDocumentContentProvider`.
     - Logic for `provideTextDocumentContent`: Execute `git show <sha>:<path>` and return results.
   - **`gitHistoryCommand.ts` (New File)**:
     - Execute `git log --follow -p`.
     - Parse patches and generate the `.code-search` content.
     - For each commit section, use the `r3bl-history` URI for the file links.

3. **User Experience**:
   - If no file is open, show an info message.
   - If the file is not tracked by git, show an error.
   - The resulting tab should be named `history-<filename>.code-search`.

## Verification & Testing
- Test with a file that has been renamed.
- Test with a file that has many commits (ensure performance is acceptable).
- Verify that clicking lines in the history tab navigates to the correct file.
