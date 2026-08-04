# Task: Git Diff Search Editor Enhancements and Command Label Cleanups

## Objective

1. Update command titles in `r3bl-fuzzy-search` to eliminate duplicate "R3BL" prefixes in
   the Command Palette (e.g. change `"R3BL Fuzzy Search: Git Diff Search Editor"` to
   `"Fuzzy Search: Git Diff Search Editor"`).
2. Enhance `r3bl-fuzzy-search.showUnstagedChanges` command to:
    - Collapse staged file entries by default when the search editor opens.
    - Limit changed lines displayed per file hunk to `<n>` lines (configurable via
      `r3blFuzzySearch.gitDiffMaxLinesPerFile`).
    - Include untracked files for uncommitted changes (previewing up to `<n>` lines for
      each untracked text file).
    - Enforce section order for uncommitted changes: `Unstaged Changes`, `Staged Changes`,
      `Untracked Files`.
3. Fix and robustify Refresh behavior (`r3bl-fuzzy-search.refreshGitDiff`):
    - Unify document content generation between initial show and refresh into a shared
      helper function `buildGitDiffDocumentContent()`.
    - Scan top 20 lines (instead of 5) for `# Context:` header to prevent refresh failures
      when header comments grow.
    - Re-apply staged entries folding after a refresh.

---

## Detailed Implementation Plan

### Step 1: Update Command Titles & Configuration (`package.json`)

- In `packages/r3bl-fuzzy-search/package.json`:
    - Update `title` for `r3bl-fuzzy-search.searchInFiles` to
      `"Fuzzy Search: Interactive Search"`.
    - Update `title` for `r3bl-fuzzy-search.showUnstagedChanges` to
      `"Fuzzy Search: Git Diff Search Editor"`.
    - Update `title` for `r3bl-fuzzy-search.refreshGitDiff` to
      `"Fuzzy Search: Refresh Git Diff Search Editor"`.
    - Add configuration property `r3blFuzzySearch.gitDiffMaxLinesPerFile`:
        ```json
        "r3blFuzzySearch.gitDiffMaxLinesPerFile": {
            "type": "number",
            "default": 5,
            "minimum": 1,
            "maximum": 100,
            "description": "Maximum number of changed lines/preview lines displayed per file in the Git Diff Search Editor"
        }
        ```

### Step 2: Implement Code Changes (`gitDiffCommand.ts` & `gitDiffParser.ts`)

- **Unified Document Builder**:
    - Implement `buildGitDiffDocumentContent()` to serve both initial document creation
      and refresh operations.
    - Implement line capping per file (`<n>` lines).
    - Implement section ordering: `Unstaged Changes` -> `Staged Changes` ->
      `Untracked Files`.
    - (Historical commits render a single section: `# ── Commit <hash> (...) ──`).
- **Untracked Files Discovery**:
    - Execute `git ls-files --others --exclude-standard` per workspace folder for
      uncommitted changes.
    - For each untracked file, read the first `<n>` text lines (skipping binary files).
- **Robust Context Parsing**:
    - Scan the top 20 lines of the `.code-search` file for `# Context:` header during
      refresh.
- **Staged File Folding**:
    - Calculate the line range of the `Staged Changes` section in the generated
      `.code-search` document.
    - Issue VS Code editor fold commands (`editor.fold`) on the staged line range after
      opening or refreshing.

### Step 3: Unit Testing Suite (`src/__tests__/gitDiffCommand.test.ts`)

Add unit tests specifically validating `buildGitDiffDocumentContent()` and helper
routines:

1. `buildGitDiffDocumentContent` section ordering (`Unstaged Changes` -> `Staged Changes`
   -> `Untracked Files`).
2. Line cap enforcement (`<n>` lines per file).
3. Untracked files output formatting and line numbering.
4. Historical commit diff output (ensuring no untracked section appears).
5. Line range calculation for staged changes folding.
6. `# Context:` parsing when header spans up to 20 lines.

### Step 4: Release Readiness, Versioning & Documentation Updates

1. **Version Bumps**:
    - `packages/r3bl-fuzzy-search/package.json`: Increment version `1.4.2` $\rightarrow$
      `1.4.3`.
    - `packages/r3bl-extension-pack/package.json`: Increment version `1.3.24`
      $\rightarrow$ `1.3.25`.
2. **CHANGELOG.md Update**:
    - Add new entry at the top of `CHANGELOG.md` detailing:
        - Cleaner command labels (`R3BL: Fuzzy Search: ...`).
        - Support for untracked files in Git Diff Search Editor.
        - Automatic folding of staged file entries.
        - Configurable max diff lines per file (`r3blFuzzySearch.gitDiffMaxLinesPerFile`).
        - Fixed refresh reliability and state persistence.
3. **README.md Updates**:
    - Update `packages/r3bl-fuzzy-search/README.md` and
      `packages/r3bl-extension-pack/README.md` with new setting details
      (`r3blFuzzySearch.gitDiffMaxLinesPerFile`) and updated command label names.
4. **Build & Package**:
    - Run `./build.sh` to compile TypeScript, run unit tests, package `.vsix` files, and
      clean old artifacts.
5. **Local Installation & Manual Testing**:
    - Run `./install.sh` to install updated `.vsix` packages into the local IDE
      environment.
    - Perform manual verification in editor context.

---

## Verification & Release Checklist

- [x] Unit tests pass via `npm test`.
- [x] User manually tests the extension in VSCode and confirms that all new features and
      fixes work as expected before moving any further.
    - [x] Command Palette titles show `R3BL: Git Diff Search Editor` and
          `R3BL: Interactive Search` cleanly without double R3BL.
    - [x] Section order for uncommitted changes is `Unstaged Changes` -> `Staged Changes`
          -> `Untracked Files`.
    - [x] Staged file entries are automatically collapsed upon editor open and refresh.
    - [x] Diff/preview lines per file are capped at `<n>` lines.
    - [x] Untracked files appear in uncommitted view showing up to `<n>` lines.
    - [x] Historical commit view renders single commit section without untracked files.
    - [x] Refresh (`Ctrl+R` / `Cmd+R`) correctly updates untracked files, staged/unstaged
          changes, and historical commit views.
- [x] Versions incremented in both `r3bl-fuzzy-search` and `r3bl-extension-pack`.
- [x] `CHANGELOG.md` and `README.md` updated.
- [x] `./build.sh` succeeds cleanly.
- [x] `./install.sh` installs the extension pack locally for final manual testing.
- [x] Move `task/git-diff-search-editor-enhancements.md` to `done/` folder.
- [x] Make a commit
- [x] Publish the 2 changed extensions
