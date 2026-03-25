# Add Git Diff Search Editor Command

## Goal

Add a command to `r3bl-fuzzy-search` that opens a Search Editor tab showing uncommitted
git changes in the workspace. The editor has two clearly separated sections: **unstaged
changes** on top, **staged changes** below. Either section is omitted if empty.

The output format uses VSCode's `search-result` language, so users get folding per file
group, click-to-navigate to exact lines, and syntax highlighting -- all for free.

## Example Output

```
# Git Diff: Workspace Changes
# 18 changes - 6 files
#
# ── Unstaged Changes (12 changes - 4 files) ──

packages/r3bl-fuzzy-search/src/extension.ts:
  13  import { SearchPanel } from './searchPanel';
  14: import { GitDiffCommand } from './gitDiffCommand';
  15
  16: export function activate(context: vscode.ExtensionContext) {

packages/r3bl-fuzzy-search/src/searchPanel.ts:
  41      private constructor() {
  42:     const panel = vscode.window.createWebviewPanel(
  43:         'r3blSearchPanel',
  44          'R3BL Search',

src/other-file.rs:
  96  #[rustfmt::skip]
  97: #[derive(Debug, Deserialize, Serialize)]
  98: pub struct AnalyticsEvent {

# ── Staged Changes (6 changes - 2 files) ──

packages/r3bl-fuzzy-search/package.json:
  4      "description": "Fuzzy search in files using fzf",
  5:     "version": "1.2.0",
  6      "publisher": "R3BL",

README.md:
  10      - Added git diff search editor command
  11:     - New keybinding: Ctrl+Shift+G
```

### Format rules

- `#` lines are comments (visual separators, not structural / not foldable)
- `filename:` lines create foldable groups (VSCode `search-result` language feature)
- `  lineNum: content` = added line (highlighted, clickable)
- `  lineNum  content` = context line (plain)
- Removed lines (`-` prefix in diff) are **not shown** -- they don't exist in the current
  file, so there's nothing to navigate to
- Hunks that contain only deletions (no added lines) are **skipped entirely** -- no
  context lines are shown for pure-deletion hunks since there's nothing actionable
- Files where all hunks are pure deletions are **omitted from results** entirely
- A file can appear in both sections if it has both unstaged and staged changes (with
  different line ranges)
- If no unstaged changes exist, the unstaged section is omitted entirely
- If no staged changes exist, the staged section is omitted entirely
- If neither exists, show an info message ("No uncommitted changes") instead of opening an
  empty editor

## Current State

- **r3bl-fuzzy-search** version: `1.1.3`
- **r3bl-extension-pack** version: `1.2.5`
- The extension already generates `search-result` formatted content in
  `searchEditorGenerator.ts` and writes `.code-search` files to `/tmp/`
- The extension already spawns child processes (`rg`, `fzf`) via `searchExecutor.ts`
- Same patterns reusable: spawn `git diff`, parse output, format as `search-result`, open
  in editor

## Design

### Command Registration

- **Command ID**: `r3bl-fuzzy-search.showUnstagedChanges`
- **Title**: `R3BL Fuzzy Search: Show Unstaged Changes`
- **Category**: `R3BL`
- **Keybinding**: `Ctrl+Shift+G` (mnemonic: **G**it)

### New Files

| File                | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `gitDiffParser.ts`  | Parse unified diff output into structured data |
| `gitDiffCommand.ts` | Command handler: run git, format, open editor  |

### How It Works

1. User presses `Ctrl+Shift+G` (or runs command from palette)
2. For each workspace root folder: a. Run `git diff -U3` (unstaged) and
   `git diff --cached -U3` (staged) b. Parse each unified diff output into structured diff
   line entries
3. Format into `search-result` language:
    - Global header: `# Git Diff: Workspace Changes` + total count
    - Unstaged section (if non-empty): `# ── Unstaged Changes ──` header, then file groups
    - Staged section (if non-empty): `# ── Staged Changes ──` header, then file groups
    - Within each file group: context lines with plain numbers, added lines with `:`
4. Write to `/tmp/git-diff-<timestamp>.code-search` (timestamped, no clobbering)
5. Open the file in a new editor tab
6. VSCode provides folding, highlighting, and click-to-navigate automatically

### Diff Parser Data Model

Each line parsed from `git diff` output becomes a `DiffLine` entry:

```typescript
type DiffLineType = 'added' | 'context';

interface DiffLine {
    file: string; // relative path from workspace root
    line: number; // new-side line number (current file on disk)
    content: string; // the actual text content (without +/- prefix)
    type: DiffLineType; // 'added' or 'context'
}
```

- **`added`** (`+` prefix in diff): new-side line number, formatted with `:` separator
  (e.g., `  14: new content`) -- these are the navigable change lines
- **`context`** (space prefix in diff): new-side line number, formatted with plain number
  (e.g., `  13  unchanged content`) -- surrounding lines for readability
- **Removed lines** (`-` prefix in diff): **skipped entirely** by the parser. They don't
  exist in the current file, so including them would produce lines that can't be navigated
  to. The parser simply does not emit `DiffLine` entries for `-` lines.

### Hunk Filtering

After parsing a hunk, check whether it produced any `added` lines:

- **Hunk has at least one `added` line**: include it (added lines + their context)
- **Hunk has only removals (zero `added` lines)**: discard the entire hunk, including its
  context lines. There's nothing actionable to navigate to.
- **File where all hunks are discarded**: omit the file from results entirely

This ensures every file group in the output has at least one clickable `:` line.

### Line Number Handling

All line numbers come from the new-side (`+`) of the `@@ ... +c,d @@` hunk header. These
correspond to the current file on disk, so click-to-navigate always lands on the exact
correct line.

The old-side line numbers are never used since removed lines are not shown.

### Multi-Root Workspace Support

- Iterate `vscode.workspace.workspaceFolders` and run git commands in each root
- Prefix file paths with the workspace folder name if there are multiple roots (e.g.,
  `my-project/src/file.ts:` instead of just `src/file.ts:`)
- For single-root workspaces, no prefix (keeps output clean for the common case)

### Dependency Check: `git`

The existing `dependencyChecker.ts` uses `spawn('which', [command])` to check for `rg` and
`fzf`. Add a `checkGitDependency()` function following the same pattern:

- Use `which` to check for `git` on PATH (consistent with existing `rg`/`fzf` checks)
- This is Unix-only (`which` doesn't exist on Windows), which is consistent with the rest
  of the extension (the existing `rg`/`fzf` checks and install instructions are also
  Unix-only: macOS `brew` and Linux `apt`/`dnf`)
- On failure, show `vscode.window.showErrorMessage` with:
    - Message: `"git is not installed or not on PATH. Please install git."`
    - Button: `"Open Installation Guide"` -> opens `https://git-scm.com/downloads`
- This follows the exact same UX pattern as the existing `rg`/`fzf` error messages (error
  notification with a button that opens the install page)

### Error Handling

Two git-specific error cases:

1. **`git` not installed** (binary not found on PATH): checked before running any git
   commands via `checkGitDependency()`. Shows `vscode.window.showErrorMessage` with
   install guide button. Command aborts.

2. **Not a git repo** (git is installed but workspace isn't a git repository): `git diff`
   exits with error and stderr contains `fatal: not a git repository`. Catch this from
   exit code / stderr and show
   `vscode.window.showErrorMessage("This workspace is not a git repository")`. No install
   button needed -- just an informational error.

Everything else (no changes, empty diff) is normal flow, not errors.

No new npm dependencies needed (except Jest dev dependencies for testing -- see below).

### Unit Tests for `gitDiffParser.ts`

The parser is pure logic (string in, structured data out) with no VSCode dependencies,
making it ideal for Jest testing. Follow the same pattern as `r3bl-semantic-config`:

**Test infrastructure to add to `r3bl-fuzzy-search`:**

- `jest.config.js` -- copy from `r3bl-semantic-config`, same `ts-jest` preset and module
  name mapper pattern
- `src/__tests__/__mocks__/vscode.ts` -- minimal mock (may not be needed if parser has no
  vscode imports, but include for consistency)
- `src/__tests__/__mocks__/r3bl-common-code.ts` -- mock for `showStatusBarMessage`
- Add `jest`, `ts-jest`, `@types/jest` to devDependencies
- Add `"test": "jest"` script to `package.json` (replacing the current
  `@vscode/test-electron` runner)

**Test file: `src/__tests__/gitDiffParser.test.ts`**

Test cases:

1. **Basic hunk with adds and context** -- added lines get `type: 'added'` with new-side
   line numbers, context lines get `type: 'context'` with new-side line numbers
2. **Pure-deletion hunk (only `-` lines, no `+` lines)** -- entire hunk discarded, returns
   empty array
3. **Mixed hunk (adds + removes)** -- removed lines skipped, only added and context lines
   in result
4. **File with all pure-deletion hunks** -- file omitted entirely from results
5. **Multiple files in one diff** -- correct file path grouping, each file's lines have
   the right `file` field
6. **Renamed file** -- uses new name from `+++ b/new-name.ts`, not old name
7. **Binary file** -- skipped entirely (e.g.,
   `Binary files a/img.png and b/img.png differ`)
8. **Empty diff (empty string input)** -- returns empty array
9. **Multiple hunks in one file** -- line numbers track correctly across hunks (each hunk
   resets from its own `@@ +c,d @@` header)
10. **Context line numbering** -- context lines between two added lines have correct
    sequential new-side line numbers

Each test provides a raw unified diff string as input and asserts on the returned
`DiffLine[]` array. Tests use `describe/it/expect` pattern matching existing
`r3bl-semantic-config` tests.

**Build integration:** `./build.sh` should run `npm test` in `r3bl-fuzzy-search` just like
it does for `r3bl-semantic-config`. Test failures block packaging.

## Implementation Steps

### Phase 1: Core Feature

- [ ] Add Jest test infrastructure to `r3bl-fuzzy-search`
    - Create `jest.config.js` (copy pattern from `r3bl-semantic-config`)
    - Create `src/__tests__/__mocks__/vscode.ts` (minimal mock)
    - Create `src/__tests__/__mocks__/r3bl-common-code.ts` (mock `showStatusBarMessage`)
    - Add `jest`, `ts-jest`, `@types/jest` to devDependencies in `package.json`
    - Update `"test"` script to `"jest"` in `package.json`
- [ ] Create `packages/r3bl-fuzzy-search/src/gitDiffParser.ts`
    - Define `DiffLineType` (`'added' | 'context'`) and `DiffLine` interface
    - Parse unified diff output into `DiffLine[]`
    - Skip removed lines (`-` prefix) entirely -- do not emit DiffLine entries for them
    - After parsing each hunk, discard it if it has zero `added` lines
    - After parsing each file, discard it if all hunks were discarded
    - Only use new-side (`+`) line numbers from `@@ ... +c,d @@` hunk headers
    - Handle renamed files (use new name from `+++ b/...`), binary files (skip), empty
      diffs
- [ ] Create `packages/r3bl-fuzzy-search/src/__tests__/gitDiffParser.test.ts`
    - 10 test cases covering: basic hunks, pure-deletion hunks, mixed hunks, multi-file
      diffs, renamed files, binary files, empty diffs, multi-hunk files, context line
      numbering
    - All tests pass before proceeding
- [ ] Create `packages/r3bl-fuzzy-search/src/gitDiffCommand.ts`
    - Run `git diff -U3` (unstaged) and `git diff --cached -U3` (staged) in each workspace
      root
    - Call parser for each, format into two-section search-result content
    - Format `added` lines with `:` separator, `context` lines with plain numbers
    - Write to `/tmp/git-diff-YYYY-MM-DDTHH-mm-ss.code-search` and open in editor
    - Handle edge cases: no workspace open, not a git repo, no changes at all
- [ ] Register the command in `packages/r3bl-fuzzy-search/src/extension.ts`
- [ ] Add command + keybinding to `packages/r3bl-fuzzy-search/package.json`
- [ ] Add `checkGitDependency()` to `dependencyChecker.ts` using the same `which`-based
      pattern, with `showErrorMessage` + "Open Installation Guide" button linking to
      `https://git-scm.com/downloads`
- [ ] Update `build.sh` to run `npm test` in `r3bl-fuzzy-search` (test failures block
      packaging, same as `r3bl-semantic-config`)

### Phase 2: Polish and Release

- [ ] Update CHANGELOG.md with new feature entry
- [ ] Update `packages/r3bl-fuzzy-search/README.md` with documentation for new command
- [ ] Bump version: `r3bl-fuzzy-search` `1.1.3` -> `1.2.0` (minor bump, new feature)
- [ ] Bump version: `r3bl-extension-pack` `1.2.5` -> `1.2.6`
- [ ] Run `./build.sh` to compile and generate `.vsix` artifacts
- [ ] Force install to VSCodium Insiders for manual testing:
    ```bash
    codium-insiders --install-extension packages/r3bl-fuzzy-search/r3bl-fuzzy-search-1.2.0.vsix --force
    codium-insiders --install-extension packages/r3bl-extension-pack/r3bl-extension-pack-1.2.6.vsix --force
    ```
- [ ] Manual test verification:
    - [ ] Make some unstaged changes, run command, verify unstaged section appears
    - [ ] Stage some changes, run command, verify both sections appear
    - [ ] Stage everything, verify only staged section appears
    - [ ] Clean working tree, verify info message instead of empty editor
    - [ ] Verify folding works on each file group
    - [ ] Verify clicking an added line navigates to correct file and line
    - [ ] Verify pure-deletion hunks are not shown
    - [ ] Verify files with only deletions are omitted entirely
    - [ ] Verify timestamp filenames don't clobber previous results
    - [ ] Verify "not a git repo" case shows error message
    - [ ] Verify "git not installed" case shows error with install guide button
    - [ ] (If multi-root workspace available) Verify multiple roots show prefixed paths
- [ ] After test verification passes, publish to both marketplaces:
    ```bash
    ./publish.sh r3bl-fuzzy-search r3bl-extension-pack
    ```

## Files to Create/Modify

| File                                                                     | Action | Purpose                                          |
| ------------------------------------------------------------------------ | ------ | ------------------------------------------------ |
| `packages/r3bl-fuzzy-search/jest.config.js`                              | Create | Jest configuration                               |
| `packages/r3bl-fuzzy-search/src/__tests__/__mocks__/vscode.ts`           | Create | VSCode module mock                               |
| `packages/r3bl-fuzzy-search/src/__tests__/__mocks__/r3bl-common-code.ts` | Create | Common code mock                                 |
| `packages/r3bl-fuzzy-search/src/__tests__/gitDiffParser.test.ts`         | Create | Parser unit tests (10 cases)                     |
| `packages/r3bl-fuzzy-search/src/gitDiffParser.ts`                        | Create | Parse `git diff` output                          |
| `packages/r3bl-fuzzy-search/src/gitDiffCommand.ts`                       | Create | Command handler                                  |
| `packages/r3bl-fuzzy-search/src/extension.ts`                            | Modify | Register new command                             |
| `packages/r3bl-fuzzy-search/src/dependencyChecker.ts`                    | Modify | Add `checkGitDependency()`                       |
| `packages/r3bl-fuzzy-search/package.json`                                | Modify | Command, keybinding, version, jest deps + script |
| `packages/r3bl-fuzzy-search/README.md`                                   | Modify | Document new command                             |
| `packages/r3bl-extension-pack/package.json`                              | Modify | Version bump                                     |
| `build.sh`                                                               | Modify | Add `npm test` step for `r3bl-fuzzy-search`      |
| `CHANGELOG.md`                                                           | Modify | New feature entry                                |
