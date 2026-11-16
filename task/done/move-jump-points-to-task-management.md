# Task: Move Jump Point Navigation to `r3bl-task-management` & Persist to `.vscode/jump-points.json`

## Overview

Move the Jump Point Navigation ("Definition Journey Stack", `Alt+U` / `Alt+Shift+U`)
feature from `r3bl-semantic-config` to `r3bl-task-management`, and change its persistence
from IDE-specific `context.workspaceState` to a project-local `.vscode/jump-points.json`
file with `FileSystemWatcher` + checksum-based cross-IDE live sync (matching
`.vscode/task-spaces.json`).

### Why

1. **Cross-IDE sharing:** `workspaceState` is stored per IDE
   (`~/.config/Code/User/workspaceStorage/...` vs Antigravity IDE), so jump points
   recorded in one IDE are invisible in another. Storing
   `{ version, points, currentIndex }` in `<workspace>/.vscode/jump-points.json` makes the
   journey workspace-local and shared across IDEs.
2. **Natural package boundary:** `r3bl-semantic-config` is focused on Rust/semantic
   highlighting and depends on `rust-lang.rust-analyzer`. Jump point navigation is
   language-agnostic (`editor.action.revealDefinition`) and belongs alongside
   `r3bl-task-management`'s `.vscode/` context persistence and `FileSystemWatcher` sync
   infrastructure.

---

## Architecture & Storage Design

### Shared File: `<workspace>/.vscode/jump-points.json`

```json
{
    "version": "1.0",
    "points": [
        {
            "id": "1731687732000-abc123",
            "uriString": "file:///path/to/repo/src/editor.rs",
            "fsPath": "/path/to/repo/src/editor.rs",
            "relativePath": "src/editor.rs",
            "line": 141,
            "character": 16,
            "symbolLabel": "DialogBuffer",
            "linePreview": "let buffer = DialogBuffer::new();"
        }
    ],
    "currentIndex": 0
}
```

- **Workspace open:** Read/write `.vscode/jump-points.json` via `vscode.workspace.fs`
  (creating `.vscode/` if needed).
- **No workspace open:** Fall back to `context.workspaceState` (key
  `"r3bl-task-management.jumpJourney"`).
- **Cross-IDE live sync:**
    - `JumpJourneyManager` computes a SHA-256 `lastSavedChecksum` on `initialize()` and
      after every save.
    - `FileSystemWatcher` on `.vscode/jump-points.json` (`onDidChange`, `onDidCreate`,
      `onDidDelete`) reloads from disk and skips updates whose checksum matches
      `lastSavedChecksum` (`isOwnSave`).
    - `onDidDelete` resets in-memory `points = []`, `currentIndex = -1`, and
      `lastSavedChecksum = null`.
- **Path resolution on open (`openJumpPoint` & `dumpJourneyToCodeSearch`):**
    - If a workspace folder is open and `point.relativePath` is a workspace-relative path
      (i.e., `!path.isAbsolute(point.relativePath)` and does not escape with `..`),
      resolve via `vscode.Uri.joinPath(workspaceFolder.uri, point.relativePath)` so
      journeys work even if the repo is mounted at a different path across environments.
    - Otherwise (e.g., external dependencies like `~/.cargo/registry/...` or stdlib), fall
      back to `vscode.Uri.parse(point.uriString)`.
- **Git hygiene:** Add `.vscode/jump-points.json` to the repo's `.gitignore`.

---

## Implementation Checklist

### 1. Move & Upgrade Jump Point Module in `r3bl-task-management`

- [x] Use `git mv` to move `packages/r3bl-semantic-config/src/jumpPointNavigator.ts` →
      `packages/r3bl-task-management/src/jumpPointNavigator.ts`.
- [x] Update `JumpJourneyManager` to support `.vscode/jump-points.json` persistence
      (`loadFromStorage`, `readDiskFile`, `reloadFromDisk`, `isOwnSave`, `computeChecksum`
      using SHA-256), with `workspaceState` fallback when no workspace folder is open.
- [x] Update `openJumpPoint` and `dumpJourneyToCodeSearch` to prefer workspace-relative
      path resolution when inside the workspace and fall back to `uriString`.
- [x] Update command IDs referenced in JSDoc/comments
      (`r3bl-task-management.jumpAndRecord`, `r3bl-task-management.showJumpPoints`).

### 2. Move & Expand Unit Tests in `r3bl-task-management`

- [x] Use `git mv` to move
      `packages/r3bl-semantic-config/src/__tests__/jumpPointNavigator.test.ts` →
      `packages/r3bl-task-management/src/__tests__/jumpPointNavigator.test.ts`.
- [x] Add `packages/r3bl-task-management/src/__tests__/__mocks__/vscode.ts` and
      `r3bl-common-code.ts`, and configure `moduleNameMapper` in
      `packages/r3bl-task-management/jest.config.js` (compatible with existing
      `types.test.ts`).
- [x] Add unit tests covering `.vscode/jump-points.json` persistence, `workspaceState`
      fallback, `isOwnSave` checksum detection, `reloadFromDisk` external sync, and
      workspace-relative vs. external `JumpPoint` URI resolution.

### 3. Wire Commands, Keybindings, and FileSystemWatcher in `r3bl-task-management`

- [x] Add `r3bl-task-management.jumpAndRecord` (`Alt+U`, `when: "editorTextFocus"`) and
      `r3bl-task-management.showJumpPoints` (`Alt+Shift+U`) to
      `packages/r3bl-task-management/package.json`.
- [x] In `packages/r3bl-task-management/src/extension.ts`:
    - `await journeyManager.initialize(context)` during `activate()`.
    - Register `r3bl-task-management.jumpAndRecord` and
      `r3bl-task-management.showJumpPoints`.
    - Register `FileSystemWatcher` for `.vscode/jump-points.json` (`onDidChange`,
      `onDidCreate`, `onDidDelete`).

### 4. Remove Jump Points from `r3bl-semantic-config`

- [x] Remove `jumpPointNavigator` import, `journeyManager.initialize(context)`, and
      command registrations from `packages/r3bl-semantic-config/src/extension.ts`.
- [x] Remove `r3bl-semantic-config.jumpAndRecord` and
      `r3bl-semantic-config.showJumpPoints` commands and keybindings from
      `packages/r3bl-semantic-config/package.json`.

### 5. Update `.gitignore`, Documentation, Versions, and Changelog

- [x] Add `.vscode/jump-points.json` to `.gitignore`.
- [x] Move Feature 10 docs from `packages/r3bl-semantic-config/README.md` to
      `packages/r3bl-task-management/README.md` (updating command IDs and
      `.vscode/jump-points.json` storage details).
- [x] Update `packages/r3bl-task-management/AGENTS.md` to document `jumpPointNavigator.ts`
      and `.vscode/jump-points.json`.
- [x] Update `packages/r3bl-extension-pack/README.md` and root `README.md` to attribute
      Jump Point Navigation (`Alt+U` / `Alt+Shift+U`) to `R3BL Task Management`.
- [x] Bump versions in:
    - `packages/r3bl-task-management/package.json` (`1.4.3` → `1.5.0`)
    - `packages/r3bl-semantic-config/package.json` (`1.4.0` → `1.5.0`)
    - `packages/r3bl-extension-pack/package.json` (`1.5.2` → `1.5.3`)
- [x] Update `CHANGELOG.md`.

### 6. Build & Verification

- [x] Run `./build.sh r3bl-semantic-config r3bl-task-management r3bl-extension-pack` and
      verify all Jest tests pass and `.vsix` packages build cleanly.
- [x] Run `npm test` across the monorepo to ensure no regressions.

---

## Future Follow-up (Separate Task)

- Discuss and design **Task Space Stacking** in `r3bl-task-management` after this task is
  complete.
