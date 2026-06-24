# Task: Add "Scroll Current Line to Top" feature

## Description

Implement a feature in `r3bl-semantic-config` that scrolls the editor viewport so that the
current cursor line is at the top of the screen when `Ctrl+M` is pressed.

## Todo List

### Implementation

- [x] Implement `r3bl-semantic-config.scrollToTop` command in
      `packages/r3bl-semantic-config/src/extension.ts`.
- [x] Register the command in `packages/r3bl-semantic-config/package.json`.
- [x] Add `Ctrl+M` keybinding in `packages/r3bl-semantic-config/package.json` with
      `when: "editorTextFocus"`.

### Documentation

- [x] Update `packages/r3bl-semantic-config/README.md` to document the new feature.
- [x] Update `CHANGELOG.md` with the new version and changes.

### Verification & Packaging

- [x] Build the project using `./build.sh`.
- [x] Verify functionality manually (requires `./install.sh`).

### Finalization (After manual verification)

- [x] Bump version in `packages/r3bl-semantic-config/package.json`.
- [x] Bump version in `packages/r3bl-extension-pack/package.json`.
- [x] Update `packages/r3bl-extension-pack/README.md` to document the new `Ctrl+M`
      shortcut.
- [x] Final build with bumped versions using `./build.sh`.
