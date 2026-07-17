# Task: Add "Choose a Commit" to Git Diff Search Editor

Expand the git diff search editor functionality to allow users to choose from recent
commits, rather than just showing uncommitted changes.

## Status

- [x] Research and Plan
- [ ] Implementation
    - [x] Extract pure functions for testability:
        - [x] `parseCommitLog(output, cwd, folderName): CommitInfo[]`
        - [x] `buildQuickPickItems(commits, isMultiRoot, limit): CommitQuickPickItem[]`
        - [x] `formatCommitHeader(commitInfo, changeCount, fileCount, isMultiRoot): string`
    - [ ] Add `r3blFuzzySearch.commitHistoryLimit` setting to `package.json`
    - [x] Add `CommitInfo` type and `getRecentCommits` to `gitDiffCommand.ts`
    - [x] Add `runGitShow` to `gitDiffCommand.ts`
    - [x] Update `showGitDiffSearchEditor` to show QuickPick before opening editor
    - [x] Handle multi-root workspaces correctly (capped at limit total, not per repo)
    - [ ] Rename command title in `package.json`
- [x] Unit Tests (`src/__tests__/gitDiffCommand.test.ts`)
    - [x] `parseCommitLog` tests:
        - [x] Parses multiple commits from normal output
        - [x] Returns empty array for empty output (no commits)
        - [x] Handles subject containing `|` characters (validates `\0` delimiter)
        - [x] Handles subject with special characters (quotes, backslashes, unicode)
        - [x] Parses single commit
    - [x] `buildQuickPickItems` tests:
        - [x] "Uncommitted Changes" is always the first item
        - [x] Single-root: no folder prefix on commit labels
        - [x] Multi-root: folder prefix present on commit labels
        - [x] Items are capped at the configured limit
        - [x] Items are sorted by timestamp descending
    - [x] `formatCommitHeader` tests:
        - [x] Produces correct header format with commit info
        - [x] Single-root: no folder prefix in header
        - [x] Multi-root: folder prefix in header
    - [x] `parseUnifiedDiff` with `git show` output (in `gitDiffParser.test.ts`):
        - [x] Skips commit metadata header and parses diff correctly
        - [x] Handles `--first-parent` merge commit diff output
- [ ] Verification (manual)
    - [ ] Build and install
    - [ ] Test with single repo
    - [ ] Test with multi-root (if applicable)
    - [ ] Test selecting "Uncommitted Changes" still works as before
    - [ ] Test selecting a specific commit shows correct diff
    - [ ] Test with a merge commit (verify `--first-parent` works)
    - [ ] Test selecting a commit that has no file changes (empty commit message shown)
    - [ ] Test with a fresh repo that has no commits yet (graceful handling)
- [ ] Documentation
    - [ ] Update `CHANGELOG.md`
    - [ ] Bump versions in `package.json` and `r3bl-extension-pack/package.json`

## Terminology: Multi-root Workspaces

A **Multi-root Workspace** is a VSCode feature that allows you to have multiple root
folders open in a single window.

- In a single-root workspace, there is only one folder at the root of the explorer.
- In a multi-root workspace, `vscode.workspace.workspaceFolders` contains multiple
  folders.
- For the `r3bl-fuzzy-search` extension, this means:
    - We must check each folder to see if it's a Git repository.
    - We aggregate uncommitted changes from all Git-enabled folders.
    - In the search editor, we prefix file paths with the folder name (e.g.,
      `my-folder/src/main.ts`) so that VSCode can correctly resolve the file location.
    - For the "Choose a Commit" feature, we aggregate commits from all Git-enabled folders
      into a single list, capped at the configured total limit.

## Proposed Changes

### 1. `packages/r3bl-fuzzy-search/package.json`

**Rename command title** (the command ID and keybinding stay the same):

```json
{
    "command": "r3bl-fuzzy-search.showUnstagedChanges",
    "title": "R3BL Fuzzy Search: Git Diff Search Editor",
    "category": "R3BL"
}
```

**Add new configuration setting** under `contributes.configuration.properties`:

```json
"r3blFuzzySearch.commitHistoryLimit": {
    "type": "number",
    "default": 10,
    "minimum": 1,
    "maximum": 50,
    "description": "Maximum number of recent commits to show in the Git Diff Search Editor picker"
}
```

### 2. `packages/r3bl-fuzzy-search/src/gitDiffCommand.ts`

**New type:**

```typescript
interface CommitInfo {
    hash: string // Full SHA
    shortHash: string // Abbreviated SHA
    subject: string // Commit message first line
    author: string // Author name
    relativeDate: string // e.g. "2 days ago"
    timestamp: number // Unix timestamp for sorting (%ct)
    cwd: string // Workspace folder path
    folderName: string // Workspace folder display name
}
```

**New function `getRecentCommits`:**

```typescript
async function getRecentCommits(cwd: string, limit: number): Promise<CommitInfo[]>
```

- Uses
  `git log -n <limit> --no-color --pretty=format:"%H%x00%h%x00%s%x00%an%x00%ar%x00%ct"`.
- `%x00` (null byte) is used as the delimiter instead of `|` because commit subjects can
  contain pipe characters.
- Parses each line by splitting on `\0`.
- Returns `CommitInfo[]`.
- **Edge case:** If the repo has no commits yet (`git log` fails with
  `"does not have any commits yet"`), return an empty array — same handling as non-git
  folders.

**New function `runGitShow`:**

```typescript
async function runGitShow(
    cwd: string,
    hash: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }>
```

- Uses `git show --first-parent -U3 --no-color --patch <hash>`.
- `--first-parent` ensures merge commits produce a normal unified diff (not combined
  format), which is compatible with the existing `parseUnifiedDiff()` parser.

**Updated `showGitDiffSearchEditor` flow:**

1. Validate workspace folders (unchanged).
2. Read `r3blFuzzySearch.commitHistoryLimit` from settings (default 10).
3. For each workspace folder (in parallel):
    - Check if it's a git repo.
    - Collect recent commits via `getRecentCommits(cwd, limit)`.
4. Aggregate commits from all repos, sort by `timestamp` (most recent first), and **cap at
   the configured limit total** (not per repo).
5. Build QuickPick items:
    - First item: `$(diff) Uncommitted Changes (Staged & Unstaged)`
    - Then each commit: `$(git-commit) shortHash — subject (author, relativeDate)`
    - In multi-root workspaces, prefix with folder name:
      `$(git-commit) [folderName] shortHash — subject (author, relativeDate)`
6. Show
   `vscode.window.showQuickPick(items, { matchOnDescription: true, matchOnDetail: true })`.
7. If user cancels (Escape), return early.
8. **If "Uncommitted Changes" is picked**:
    - Run `git diff` + `git diff --cached` for all folders.
    - Prefix file paths with folder name in multi-root workspaces.
    - Header: `# Git Diff: Workspace-wide Uncommitted Changes`
9. **If a commit is picked**:
    - Run `runGitShow(cwd, hash)` for the selected commit's repo.
    - Parse with existing `parseUnifiedDiff()`.
    - **Always prefix file paths with folder name if in a multi-root workspace**, ensuring
      navigation works.
    - Format with a **single section** (no staged/unstaged split).
    - **Header format:**
        ```
        # Git Commit: [folderName] abc1234 — Fix the bug (John, 2 days ago)
        # 15 changes - 3 files
        #
        ```
    - **Section label:** `Commit abc1234`
    - **Empty commit handling:** If `parseUnifiedDiff()` returns no lines (empty commit,
      or `--first-parent` merge with no diff), show a status bar message
      `"No changes in this commit"` and return — do not open an empty editor.
    - Write to `/tmp/git-diff-{timestamp}.code-search` and open (same as current).

**New `CommitQuickPickItem` type** (extends `vscode.QuickPickItem`):

```typescript
interface CommitQuickPickItem extends vscode.QuickPickItem {
    type: "uncommitted" | "commit"
    commitInfo?: CommitInfo // Present when type === 'commit'
}
```

This lets the selection handler know which path to take and which commit's `hash`/`cwd` to
use.

### 3. Extractable pure functions (for testability)

These functions contain no VSCode or subprocess calls, making them unit-testable:

**`parseCommitLog(output: string, cwd: string, folderName: string): CommitInfo[]`**

- Receives the raw stdout from `git log`.
- Splits on `\n`, then each line on `\0`.
- Returns `CommitInfo[]` (empty array if output is empty/whitespace).
- Called by `getRecentCommits` after spawning git.

**`buildQuickPickItems(commits: CommitInfo[], isMultiRoot: boolean, limit: number): CommitQuickPickItem[]`**

- Sorts `commits` by `timestamp` descending.
- Caps at `limit`.
- Prepends the "Uncommitted Changes" item.
- Adds `[folderName]` prefix when `isMultiRoot` is true.
- Returns `CommitQuickPickItem[]`.

**`formatCommitHeader(commitInfo: CommitInfo, changeCount: number, fileCount: number, isMultiRoot: boolean): string`**

- Produces the header block for commit diffs:
    ```
    # Git Diff: abc1234 — Fix the bug (John, 2 days ago)
    # 15 changes - 3 files
    #
    ```
- Includes `[folderName]` in multi-root workspaces.

### 4. Unit tests

**New file: `packages/r3bl-fuzzy-search/src/__tests__/gitDiffCommand.test.ts`**

Tests for the three pure functions above. Uses the same Jest + `ts-jest` infrastructure
and `__mocks__/` setup as the existing `gitDiffParser.test.ts`.

**Additional tests in `packages/r3bl-fuzzy-search/src/__tests__/gitDiffParser.test.ts`**

Two new tests for `parseUnifiedDiff()`:

- Parses `git show` output (skips commit metadata header before `diff --git`)
- Parses `--first-parent` merge commit diff output

### 5. Versioning

- `r3bl-fuzzy-search`: `1.2.0` -> `1.3.0`
- `r3bl-extension-pack`: `1.2.7` -> `1.2.8`

## Verification Plan

1. Open a git repository in VSCode.
2. Run command `R3BL Fuzzy Search: Git Diff Search Editor` (or use `Ctrl+Shift+G`).
3. Verify that a QuickPick appears with "Uncommitted Changes" and recent commits.
4. Verify the number of commits shown respects `r3blFuzzySearch.commitHistoryLimit`.
5. Select "Uncommitted Changes" and verify it works exactly as before (staged + unstaged
   sections).
6. Run the command again and select a specific commit.
7. Verify a `.code-search` editor opens with header like:
   `# Git Diff: abc1234 — Fix the bug (John, 2 days ago)`
8. Verify the changes shown match `git show <hash>`.
9. Test with a merge commit — verify it shows a normal diff (not combined format).
10. Press Escape on the QuickPick — verify nothing happens (clean cancel).
11. Change `r3blFuzzySearch.commitHistoryLimit` in settings and verify the QuickPick
    reflects the new limit.
12. Test in a multi-root workspace with at least two Git repositories.
    - Verify that commits from both repos are shown with folder prefixes.
    - Verify that total commits are capped at the configured limit.
    - Verify that file navigation works correctly for a selected commit.
13. Select a commit with no file changes — verify status bar message
    `"No changes in this commit"` appears and no editor opens.
14. Test with a fresh git repo (no commits) — verify it's handled gracefully (shows only
    "Uncommitted Changes" in QuickPick, or appropriate error for single-root).
