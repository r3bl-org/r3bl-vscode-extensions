# R3BL Opened Editors

[![Open VSX](https://img.shields.io/open-vsx/v/R3BL/r3bl-opened-editors?label=Open%20VSX)](https://open-vsx.org/extension/R3BL/r3bl-opened-editors)
[![VS Marketplace](https://img.shields.io/badge/VS%20Marketplace-blue?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-opened-editors)

Instant keyboard-driven editor tab switcher and vertical sidebar navigation shortcuts for
VS Code, VS Code Insiders, and VSCodium. Designed to eliminate the friction of horizontal
tab overflow and provide lightning-fast keyboard access to all active files across your
editor groups.

Part of the
**[R3BL Development Pack](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-extension-pack)**.

---

## Table of Contents

- [The Problem It Solves](#the-problem-it-solves)
- [Features](#features)
    - [1. Rapid Keyboard Switcher (Alt+E / Cmd+E)](#1-rapid-keyboard-switcher-alte--cmde)
    - [2. Vertical Open Editors Sidebar Panel Navigation](#2-vertical-open-editors-sidebar-panel-navigation)
- [Security, Privacy & Performance Guarantees](#security-privacy--performance-guarantees)
- [Keyboard Shortcuts & Commands](#keyboard-shortcuts--commands)
- [Part of the R3BL Suite](#part-of-the-r3bl-suite)
- [License](#license)

---

## The Problem It Solves

Modern development workflows often involve keeping dozens of files open simultaneously
across multiple splits and editor groups. As tabs overflow horizontally off the screen:

- Visual tab bars become truncated, hidden, or squished.
- Navigating with `Ctrl+Tab` cycles through MRU history slowly.
- Opening the Command Palette and typing `edt ` requires extra keystrokes.

**R3BL Opened Editors** solves this by uniting two essential keyboard workflows:

1. **Instant Keyboard Switcher (`Alt+E` / `Cmd+E`)**: Press `Alt+E` (or `Cmd+E` on macOS)
   from anywhere to immediately pop open the searchable QuickPick list of all open editors
   across every editor group.
2. **Vertical Sidebar Navigation**: Pair with VS Code's vertical **Open Editors** panel in
   the sidebar to see all open tabs listed vertically in a clean tree, complete with dirty
   indicators, save-all actions, and instant switching. This allows you to work with your
   "working set" of files without worrying about horizontal tab overflow. This pairs
   nicely with the
   **[R3BL Task Management](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-task-management)**
   extension.

---

## Features

### 1. Rapid Keyboard Switcher (Alt+E / Cmd+E)

- Instantly summons VS Code's native Open Editors QuickPick list across all active editor
  groups.
- Allows instant fuzzy-filtering and jumping between open tabs without taking your hands
  off the keyboard.
- Bound by default to `Alt+E` (`Cmd+E` on macOS) for muscle-memory convenience.

### 2. Vertical Open Editors Sidebar Panel Navigation

- Pair seamlessly with the built-in **Open Editors** view in the Primary Side Bar (either
  inside the Explorer panel or dragged into its own dedicated Activity Bar icon).
- Shows all active files listed **vertically**, eliminating the limitation of horizontal
  tab overflow.
- **Focus Command**: Focus the sidebar panel directly using the R3BL wrapper command:
    - Command ID: `r3bl-opened-editors.focusOpenEditorsView` (_"R3BL Opened Editors: Focus
      Open Editors in Sidebar"_)
    - Under the hood, this delegates directly to VS Code's
      `workbench.files.action.focusOpenEditorsView`.
- **Settings Control**: Ensure the panel is always visible with:
    ```json
    "explorer.openEditors.visible": 1
    ```
- Automatically tracks and synchronizes the active file in real time as you switch tabs or
  open new documents.
- Easily manage editor tabs in bulk: save dirty files, close all editors, or close
  individual files directly from the sidebar.

---

## Security, Privacy & Performance Guarantees

- **Privacy-First & Secure**: Zero telemetry, zero analytics, zero network calls, and zero
  filesystem access.
- **Zero Dependencies**: `0` external runtime npm packages (immune to supply-chain
  vulnerabilities).
- **Ultra-Lightweight**: Only ~1.5 KB compiled bundle size with near-instant activation.
- **Pure Native Delegation**: Directly drives VS Code's native APIs without running
  background loops or injecting UI overhead.

---

## Keyboard Shortcuts & Commands

| Shortcut / Trigger          | Command ID                                 | Title in Command Palette                             | Description                                   |
| :-------------------------- | :----------------------------------------- | :--------------------------------------------------- | :-------------------------------------------- |
| `Alt+E` _(Linux / Windows)_ | `r3bl-opened-editors.openedEditors`        | `R3BL Opened Editors: Show Opened Editors`           | Open searchable dropdown of all open editors  |
| `Cmd+E` _(macOS)_           | `r3bl-opened-editors.openedEditors`        | `R3BL Opened Editors: Show Opened Editors`           | Open searchable dropdown of all open editors  |
| _Customizable_              | `r3bl-opened-editors.focusOpenEditorsView` | `R3BL Opened Editors: Focus Open Editors in Sidebar` | Focus the vertical open editors sidebar panel |

_Tip: Search for "R3BL Opened Editors" from the VS Code Command Palette (`Ctrl+Shift+P` /
`Cmd+Shift+P`) to see all available commands._

---

## Part of the R3BL Suite

This extension is built to integrate seamlessly with the R3BL development ecosystem:

- **[R3BL Extension Pack](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-extension-pack)**:
  The complete developer suite including themes, semantic highlighting, and task
  management.
- **[R3BL Theme](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-theme)**:
  Dark theme optimized for Rust and Markdown development.
- **[R3BL Task Management](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-task-management)**:
  Context-preserving task spaces and Dashboard Workflow.
- **[R3BL Copy Selection Path and Range](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-copy-selection-path-and-range)**:
  Copy file paths with selection ranges for Coding Agents and IDEs.
- **[R3BL Fuzzy Search](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-fuzzy-search)**:
  Interactive fuzzy search and git diff inspection powered by `fzf`.

---

## License

Copyright (c) 2026 R3BL LLC. Licensed under the [MIT License](LICENSE).
