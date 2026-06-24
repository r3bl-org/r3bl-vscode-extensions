# Task: Rust Add Link Reference Definition Auto-Insertion

## 1. Overview

We want to add a feature for Rust files that automates inserting repeating link reference
definitions in `rustdoc` comments. When a user selects a link reference like ``[`OSC`]``
and triggers a keyboard shortcut, the extension will search the workspace for existing
definitions (e.g., `//! [`OSC`]: r3bl_tui::core::ansi::osc_codes::OscSequence`), show a
quick pick list of unique matches (up to 5), and insert the chosen definition at the
bottom of the current rustdoc block.

## 2. Extension Architecture

Instead of creating a new extension, this feature will be added to the existing
`r3bl-semantic-config` extension, which already handles Rust-specific features like
rustdoc folding and navigation. This prevents unnecessary fragmentation in the monorepo.

## 3. Core Logic

1.  **Command & Keybinding**:
    - Register command: `r3bl-semantic-config.insertRustdocLinkDef`
    - Default keybinding: TBD (e.g., `Ctrl+Shift+L` or `Cmd+Shift+L`) scoped to
      `editorLangId == 'rust'`.
2.  **Selection Parsing**:
    - Get the currently selected text in the active text editor.
    - **Smart Selection**: If no text is selected, check if the cursor is inside a term
      (e.g., inside ``[`<term>`]`` or `[<term>]`).
        - If it is, automatically extract that term.
        - If no text is selected and the cursor is not inside a recognizable term, use
          `r3bl-common-code`'s `showStatusBarMessage` to show a warning message asking the
          user to select a term, and abort.
    - Strip wrapping brackets/backticks if necessary to get the exact identifier (e.g.,
      `OSC` from ``[`OSC`]``).
3.  **Codebase Search (Ripgrep)**:
    - Construct a regex to search for the definition:
      `^(\s*///|\s*//!)\s*\[${escapedIdentifier}\]:\s*(.+)`
    - Execute `rg` (ripgrep) via `child_process.exec` in the VSCode workspace root.
    - Collect matches and keep up to 5 **unique** definitions.
4.  **User Selection**:
    - If no matches are found, use `r3bl-common-code`'s `showStatusBarMessage` to show an
      info message.
    - If matches are found, display them using `vscode.window.showQuickPick`.
5.  **Rustdoc Block Detection & Insertion**:
    - Once a definition is selected, find the contiguous block of doc comments (`///` or
      `//!`) encompassing or immediately adjacent to the current cursor position.
    - Find the last line of this contiguous block.
    - Insert the selected link reference definition at the end of this block.
    - Ensure proper indentation matching the rest of the block.

## 4. Implementation Steps

- [x] **Step 1:** Update `packages/r3bl-semantic-config/package.json` to register the new
      command `r3bl-semantic-config.insertRustdocLinkDef` and its corresponding
      keybinding.
- [x] **Step 2:** Add the command logic in
      `packages/r3bl-semantic-config/src/extension.ts` (or a new module like
      `rustdocLinkDefs.ts`) handling the Ripgrep search and Quick Pick UI.
- [x] **Step 3:** Implement the rustdoc block detection and text insertion logic. Re-use
      the existing `findRustdocBlocks` function from `rustdocFolding.ts` to locate the
      boundaries of the rustdoc block surrounding the cursor.
- [x] **Step 4:** Ensure it utilizes the existing `r3bl-common-code` utilities for UI
      notifications (e.g., `showStatusBarMessage`) when no definitions are found.
- [x] **Step 5:** Run `./build.sh` and then `./install.sh` to install the extension
      locally into VS Code (`code`). Perform manual testing of the feature.
- [x] **Step 6:** Bump the version numbers in `packages/r3bl-semantic-config/package.json`
      and the meta extension `packages/r3bl-extension-pack/package.json`.
- [x] **Step 7:** Update the `README.md` files for both `r3bl-semantic-config` and
      `r3bl-extension-pack` to document the new feature, and add an entry to
      `CHANGELOG.md`.
- [x] **Step 8:** Run `./build.sh` to package the extensions, then run `./install.sh` to
      install the updated extensions locally. Then make a commit. Review the commit
      message with the user and get their approval before making the commit. Then push it
      to the github remote (origin).
- [ ] **Step 9:** Run `./build.sh` to package the extensions, and then run
      `./publish.sh r3bl-semantic-config r3bl-extension-pack` to publish to both the VS
      Marketplace and Open VSX Registry.

## 5. Security & Constraints

- **Consistent UI Messaging**: All user-facing notifications (info, warning, error, or
  success) MUST be routed through `r3bl-common-code`'s `showStatusBarMessage`. Do not use
  standard `vscode.window.showInformationMessage` or similar API directly, to maintain
  consistency with the rest of the monorepo.
- Follow standard monorepo guidelines: no AI attribution in commits, use `./build.sh` and
  `./install.sh`.
- Ensure the ripgrep subprocess securely handles workspace paths and escapes the regex
  input to prevent command injection.
