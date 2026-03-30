# Implementation Plan: Refresh Support for Git Diff Search Editor

This plan details the steps to add a refresh feature to the Git Diff Search Editor in
`r3bl-fuzzy-search`. This will allow users to update the contents of an open
`.code-search` tab without having to re-trigger the selection picker.

## User Experience

1.  User opens a Git Diff Search Editor (e.g., `Ctrl+Shift+G` -> "Uncommitted Changes").
2.  User makes changes to files in the workspace.
3.  User presses `Ctrl+R` while the `.code-search` tab is focused.
4.  The content of the tab updates to reflect the latest git diff state.

## Implementation Details

### 1. Add Metadata to Headers

To support refreshing, we need to know the context of the search editor. We'll add hidden
or easily parseable metadata lines to the top of the generated `.code-search` file.

**For Uncommitted Changes:**

```
# Git Diff: Workspace Changes
# Context: uncommitted
```

**For a specific Commit:**

```
# Git Commit: [folder] shortHash — subject ...
# Context: commit, hash: fullHash, cwd: workspacePath, folder: folderName
```

### 2. Implement Refresh Command

Add a new function `refreshGitDiffSearchEditor` in
`packages/r3bl-fuzzy-search/src/gitDiffCommand.ts`:

- Get the active text editor.
- Verify it's a `.code-search` file.
- Read the first few lines to extract the context.
- Re-run the git command:
    - If `uncommitted`, re-run `runGitDiff` for all workspace folders.
    - If `commit`, re-run `runGitShow` using the extracted `hash` and `cwd`.
- Regenerate the document content string.
- Update the active document using `editor.edit()` or `WorkspaceEdit`.

### 3. Update `package.json`

- Register the command `r3bl-fuzzy-search.refreshGitDiff`.
- Add a keybinding for `Ctrl+R`:
    - `command`: `r3bl-fuzzy-search.refreshGitDiff`
    - `key`: `ctrl+r`
    - `mac`: `cmd+r`
    - `when`: `editorTextFocus && editorLangId == 'search-result'`
- Note: This overrides the default "Open Recent" (`Ctrl+R`) only when focused on a search
  results editor, and doesn't conflict with Semantic Config's `Ctrl+R` (which is scoped to
  `editorLangId == rust`).

### 4. Update Documentation

Update the following files to reflect the new refresh feature:

- **`packages/r3bl-fuzzy-search/README.md`**:
    - Add `Ctrl+R` to the "Keyboard Shortcuts" and "Git Diff Search Editor Workflow"
      sections.
- **`packages/r3bl-extension-pack/README.md`**:
    - Add `Ctrl+R` to the "Keyboard Shortcuts" table for Fuzzy Search.
- **`CHANGELOG.md`**:
    - Add a new entry for the refresh support.
    - Increment versions:
        - `r3bl-fuzzy-search`: `1.3.1` -> `1.4.0`
        - `r3bl-extension-pack`: `1.2.11` -> `1.2.12`

### 5. Update `extension.ts`

...

- Register the new command in the `activate` function.

## Verification Plan

1.  Open "Uncommitted Changes" Search Editor.
2.  Modify a file in the workspace.
3.  Press the refresh shortcut in the Search Editor tab.
4.  Verify the changes appear in the tab.
5.  Open a specific commit Search Editor.
6.  Press the refresh shortcut.
7.  Verify it correctly re-shows the same commit diff (it shouldn't change, but it
    confirms the logic works).

## Future Considerations

- This same pattern could be applied to the regular Fuzzy Search editors
  (`r3bl-fuzzy-search.searchInFiles`), but it would require re-running the full `rg | fzf`
  pipeline which might be slower and more complex if the query needs to be re-entered. For
  now, we'll focus on Git Diff.
