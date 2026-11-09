# Task: Add "Toggle Inlay Hints" Command in `r3bl-semantic-config`

## Overview

VS Code does not provide a native built-in command to toggle editor inlay hints (`editor.inlayHints.enabled`) on and off with a single keystroke. By default, users either configure modifier keys (`offUnlessPressed` / `onUnlessPressed`) or install third-party extensions.

This feature adds a first-class toggle command (`r3bl-semantic-config.toggleInlayHints`) with a default keybinding to switch inlay hints globally between `"on"` and `"off"`.

---

## Specifications

### 1. Command & Keybinding Contribution (`package.json`)
- **Command ID**: `r3bl-semantic-config.toggleInlayHints`
- **Title**: `Toggle Inlay Hints`
- **Category**: `R3BL`
- **Default Keybinding**:
  - `ctrl+alt+i` (All platforms: Windows, Linux, macOS)
  - When clause: `"editorTextFocus"`

### 2. Toggle Logic (`src/inlayHints.ts`)
- Inspect `editor.inlayHints.enabled` from `vscode.workspace.getConfiguration("editor")`.
- State transition rules:
  - If current value is `"on"` or boolean `true` $\rightarrow$ set to `"off"`.
  - If current value is `"off"`, boolean `false`, `"offUnlessPressed"`, `"onUnlessPressed"`, `undefined`, or any other value $\rightarrow$ set to `"on"`.
- Persist globally:
  ```typescript
  await config.update("inlayHints.enabled", nextValue, vscode.ConfigurationTarget.Global);
  ```
- Notify user via status bar message:
  ```typescript
  showStatusBarMessage(`Inlay hints: ${nextValue}`, "info");
  ```

---

## Files to Create / Modify

| File | Action | Description |
| :--- | :--- | :--- |
| `task/add-toggle-inlay-hint-feature.md` | **Create** | This task specification and tracking checklist |
| `packages/r3bl-semantic-config/src/inlayHints.ts` | **Create** | Pure helper `getNextInlayHintsState` and `toggleInlayHints` implementation |
| `packages/r3bl-semantic-config/src/__tests__/inlayHints.test.ts` | **Create** | Unit tests for toggle logic and state transitions |
| `packages/r3bl-semantic-config/src/extension.ts` | **Modify** | Import `toggleInlayHints`, register command, and push to `context.subscriptions` |
| `packages/r3bl-semantic-config/package.json` | **Modify** | Add command and keybinding contributions; increment version |
| `packages/r3bl-semantic-config/README.md` | **Modify** | Document the new toggle command and shortcut |
| `packages/r3bl-extension-pack/package.json` | **Modify** | Increment version to reflect updated dependency |
| `packages/r3bl-extension-pack/README.md` | **Modify** | Add new shortcut and feature description |
| `CHANGELOG.md` | **Modify** | Document the new feature and version bumps |

---

## Todo List

### Phase 1: Implementation
- [x] Create `packages/r3bl-semantic-config/src/inlayHints.ts` with `getNextInlayHintsState` and `toggleInlayHints`.
- [x] Create unit tests in `packages/r3bl-semantic-config/src/__tests__/inlayHints.test.ts` to test state transitions.
- [x] Update `packages/r3bl-semantic-config/src/extension.ts` to register `r3bl-semantic-config.toggleInlayHints`.
- [x] Update `packages/r3bl-semantic-config/package.json` to contribute the command and default keybinding (`ctrl+alt+i` for all OSes).

### Phase 2: Verification
- [x] Run test suite (`npm test` in `packages/r3bl-semantic-config`) to ensure all tests pass.
- [x] Verify build via `./build.sh r3bl-semantic-config`.

### Phase 3: Versioning & Documentation
- [x] Increment version in `packages/r3bl-semantic-config/package.json`.
- [x] Increment version in `packages/r3bl-extension-pack/package.json`.
- [x] Update `packages/r3bl-semantic-config/README.md`.
- [x] Update `packages/r3bl-extension-pack/README.md`.
- [x] Add entry to `CHANGELOG.md`.

### Phase 4: Final Build & Packaging
- [x] Run `./build.sh` (or `./build.sh r3bl-semantic-config r3bl-extension-pack`) to verify full package build and artifact generation.
