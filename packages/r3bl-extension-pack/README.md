# R3BL Development Pack

[![Open VSX](https://img.shields.io/open-vsx/v/R3BL/r3bl-extension-pack?label=Open%20VSX)](https://open-vsx.org/extension/R3BL/r3bl-extension-pack)
[![VS Marketplace](https://img.shields.io/badge/VS%20Marketplace-blue?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-extension-pack)

The complete R3BL development experience in one install. Get a carefully crafted dark
theme, enhanced Rust syntax highlighting, task management, and productivity tools - all
configured to work together seamlessly.

## Included Extensions

### R3BL Core Extensions

These extensions are maintained and published by R3BL.

| Extension                                                                                                                                          | Description                                                              |
| :------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------- |
| **[R3BL Theme](https://github.com/r3bl-org/r3bl-vscode-extensions/tree/main/packages/r3bl-theme)**                                                 | Dark theme optimized for Rust and Markdown with eye comfort              |
| **[R3BL Semantic Configuration](https://github.com/r3bl-org/r3bl-vscode-extensions/tree/main/packages/r3bl-semantic-config)**                      | Enhanced Rust highlighting, auto-folding, and structure navigation       |
| **[R3BL Task Management](https://github.com/r3bl-org/r3bl-vscode-extensions/tree/main/packages/r3bl-task-management)**                             | Task space management with Coding Agent integration and tab organization |
| **[R3BL Fuzzy Search](https://github.com/r3bl-org/r3bl-vscode-extensions/tree/main/packages/r3bl-fuzzy-search)**                                   | Fast fuzzy search and Git Diff Search Editor for reviewing changes       |
| **[R3BL Copy Selection Path and Range](https://github.com/r3bl-org/r3bl-vscode-extensions/tree/main/packages/r3bl-copy-selection-path-and-range)** | Copy file paths with line ranges for Coding Agents                       |
| **[R3BL Auto Insert Copyright](https://github.com/r3bl-org/r3bl-vscode-extensions/tree/main/packages/r3bl-auto-insert-copyright)**                 | Automatic copyright header insertion with multiple license templates     |
| **[R3BL Shared](https://github.com/r3bl-org/r3bl-vscode-extensions/tree/main/packages/r3bl-shared)**                                               | Shared services for R3BL extensions (automatically installed)            |

### Third-Party Dependencies

These extensions are required for full functionality and are automatically installed.

| Extension                                                       | Description                               |
| :-------------------------------------------------------------- | :---------------------------------------- |
| **[rust-analyzer](https://github.com/rust-lang/rust-analyzer)** | Official Rust language server (3rd party) |

## What You Get

- **Beautiful Dark Theme**: Carefully crafted theme optimized for long coding sessions and
  high-contrast syntax highlighting.
- **Enhanced Rust Experience**: Beyond syntax highlighting, get auto-folding for `use`
  statements and `rustdoc`, plus a dedicated Structure Navigator for large files.
- **Task Space Management**: Organize multiple work contexts, save/restore open tabs, and
  integrate with Coding Agents via a custom slash command.
- **High-Efficiency Code Review**: Use the Git Diff Search Editor to review uncommitted
  changes or recent commits in a single, searchable tab—perfect for AI-generated diffs.
- **Fast Fuzzy Search**: Lightning-fast file content search powered by `rg` and `fzf` with
  live preview.
- **AI-Ready Copying**: Quick file path copying with line ranges in `@path#L1-10` format
  for AI assistant prompts. Supports both relative paths (within workspace) and absolute
  paths (outside workspace).
- **Automated Compliance**: Automatic copyright headers for new files with support for
  MIT, Apache 2.0, GPLv3, and more.
- **Full Rust Support**: Official `rust-analyzer` integration out of the box.

## Requirements

- VS Code 1.60.0 or higher
- For fuzzy search: `fzf` and `ripgrep` must be installed on your system
- For git features: `git` must be installed

## Installation

1. Install this extension pack from the VS Code Marketplace
2. All included extensions are automatically installed
3. Restart VS Code

## Quick Start

1. **Activate the theme**: Press `Ctrl+K Ctrl+T` → Select "R3BL Theme"
2. **Enable semantic highlighting**: Click "Yes" when prompted
3. Start coding with the full R3BL experience!

## Keyboard Shortcuts

The most common shortcuts for the R3BL suite. All shortcuts can be customized in VS Code's
Keyboard Shortcuts settings.

| Shortcut        | Extension       | Action                                             |
| :-------------- | :-------------- | :------------------------------------------------- |
| `Alt+Shift+T`   | Task Management | Open task spaces dialog                            |
| `Alt+Shift+F`   | Task Management | Finish current task (archive and jump to next)     |
| `Alt+Shift+J`   | Task Management | Pause current task and jump to next in queue       |
| `Alt+Shift+D`   | Fuzzy Search    | Start interactive fuzzy search                     |
| `Ctrl+Shift+G`  | Fuzzy Search    | Open Git Diff Search Editor (Uncommitted/Commits)  |
| `Ctrl+R`        | Fuzzy Search    | Refresh Git Diff Search Editor (while tab focused) |
| `Alt+O`         | Copy Selection  | Copy file path with line range (AI-ready)          |
| `Alt+Shift+O`   | Copy Selection  | Show session copy history and navigation           |
| `Ctrl+Shift+Y`  | Semantic Config | Open Rustdoc Structure Navigator                   |
| `Ctrl+R`        | Semantic Config | Run Flycheck (manual debounced `cargo check`)      |
| `Ctrl+-`        | Semantic Config | Fold all Rustdocs in current file                  |
| `Ctrl+=`        | Semantic Config | Unfold all Rustdocs in current file                |
| `Ctrl+M`        | Semantic Config | Scroll current line to top                         |
| `Ctrl+K Ctrl+T` | Theme           | Change Color Theme                                 |

## Configuration Highlights

Configure the R3BL suite to match your workflow. Open `settings.json` or use the Settings
UI.

### Feedback & UI (Shared)

These settings apply to all R3BL extensions via the R3BL Shared service.

```json
{
    "r3bl.transientFeedbackMechanism": "statusbar", // "statusbar", "notification", or "none"
    "r3bl.statusbarMessageMaxLength": 50, // Max characters in status bar messages
    "r3bl.statusbarMessage.successDuration": 3000 // ms to show success messages
}
```

### Rust Development

Enhanced defaults for the R3BL Semantic Configuration.

```json
{
    "r3bl-semantic-config.autoFoldRustdocsOnOpen": false, // Auto-hide /// comments
    "r3bl-semantic-config.autoFoldUseStatementsOnOpen": false, // Auto-hide use imports
    "r3bl-semantic-config.debouncedFlycheck.enabled": true // Run cargo check on idle
}
```

### Task & Tab Management

```json
{
    "r3bl-task-management.autoSaveCurrentTaskSpace": true, // Sync tabs automatically
    "r3bl-task-management.showStatusBar": true, // Show active task in status bar
    "r3bl-task-management.restoreTabsOnStartup": true // Resume last context on startup
}
```

### Search & Copyright

```json
{
    "r3blFuzzySearch.respectGitignore": true, // Skip gitignored files
    "copyrighter.author": "Your Name", // Copyright holder name
    "copyrighter.license": "MIT" // MIT, Apache2, GPL3, or none
}
```

## Use Cases

### AI-Assisted Development

Optimized for working with Coding Agents (Claude Code, Gemini CLI, Cursor, etc.):

- **Context Gathering**: Use `Alt+O` to quickly grab correctly formatted file references
  (`@path#L10-20`) for your prompts.
- **Change Review**: Use `Ctrl+Shift+G` (Git Diff Search Editor) to review large numbers
  of changes Coding Agents make in a single turn. It's the most efficient way to be
  thorough without leaving your IDE.
- **Task Integration**: Use Task Management with the `/r3bl-task` custom command for AI
  Coding Agents (Claude Code, Gemini CLI, etc.) to coordinate implementation plans in
  `task/*.md` files.

### High-Performance Rust Coding

The pack is a power-user's dream for Rust. It enhances `rust-analyzer` with:

- **Intelligent Folding**: Auto-hiding long `use` blocks and `rustdoc` to focus on logic.
- **Structure Navigator**: Use `Ctrl+Shift+Y` to jump between functions, traits, and impl
  blocks in large files.
- **Live Diagnostics**: Debounced Flycheck runs `cargo check` in the background after you
  stop typing, without the "save to check" friction.

### Multi-Task Workflows (Context Switching)

Use task spaces to manage multiple features or bug fixes simultaneously on the same
branch. Switch contexts instantly with `Alt+Shift+T`—the extension remembers exactly which
files you had open (and their pinned state) for each task.

### Multi-IDE Workflows (Side-by-Side)

Open the same project folder in VS Code and VS Code Insiders simultaneously. Each IDE can
maintain its own **active** task space (e.g., VS Code for implementation, Insiders for
research), while both IDEs stay in sync for the actual task definitions.

## Release Notes

See
[CHANGELOG.md](https://github.com/r3bl-org/r3bl-vscode-extensions/blob/main/CHANGELOG.md)
for detailed release notes and version history.

## License

MIT

## Contributing

Found a bug or have a suggestion? Please open an issue at:
https://github.com/r3bl-org/r3bl-vscode-extensions/issues

---

**Rebels race on! 🏁**
