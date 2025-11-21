# R3BL Development Pack

The complete R3BL development experience in one install. Get a carefully crafted dark
theme, enhanced Rust syntax highlighting, task management, and productivity tools - all
configured to work together seamlessly.

## Included Extensions

| Extension                                                                                                                             | Description                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **[R3BL Theme](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-theme)**                                                 | Dark theme optimized for Rust and Markdown with eye comfort   |
| **[R3BL Semantic Configuration](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-semantic-config)**                      | Enhanced semantic highlighting for Rust (auto-configured)     |
| **[R3BL Task Management](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-task-management)**                             | Task space management for context switching                   |
| **[R3BL Fuzzy Search](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-fuzzy-search)**                                   | Fast fuzzy file search powered by fzf and ripgrep             |
| **[R3BL Copy Selection Path and Range](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-copy-selection-path-and-range)** | Copy file paths with line ranges for Claude Code              |
| **[R3BL Auto Insert Copyright](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-auto-insert-copyright)**                 | Automatic copyright header insertion                          |
| **[R3BL Shared](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-shared)**                                               | Shared services for R3BL extensions (automatically installed) |
| **[rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)**                                      | Official Rust language server (3rd party)                     |

## What You Get

- Beautiful, carefully crafted dark theme optimized for long coding sessions
- Enhanced semantic highlighting for Rust (functions, structs, lifetimes, traits, etc.)
- Task space management for organizing multiple work contexts
- Fast fuzzy search across your entire codebase
- Quick file path copying with line ranges for AI assistants
- Automatic copyright headers for new files
- Full Rust language support via rust-analyzer
- Zero manual configuration required

## Requirements

- VS Code 1.60.0 or higher
- For fuzzy search: `fzf` and `ripgrep` must be installed on your system

## Installation

1. Install this extension pack from the VS Code Marketplace
2. All included extensions are automatically installed
3. Restart VS Code

## Quick Start

1. **Activate the theme**: Press `Ctrl+K Ctrl+T` → Select "R3BL Theme"
2. **Enable semantic highlighting**: Click "Yes" when prompted
3. Start coding with the full R3BL experience!

## Keyboard Shortcuts

Quick reference for all R3BL extension shortcuts:

| Shortcut      | Extension       | Action                         |
| ------------- | --------------- | ------------------------------ |
| `Alt+Shift+T` | Task Management | Open task spaces dialog        |
| `Alt+Shift+D` | Fuzzy Search    | Start fuzzy search             |
| `Alt+O`       | Copy Selection  | Copy file path with line range |

All shortcuts can be customized in VS Code's Keyboard Shortcuts settings.

## Use Cases

### Rust Development

The pack is optimized for Rust with enhanced semantic highlighting, rust-analyzer
integration, and a theme designed for Rust syntax.

### Multi-Task Workflows

Use task spaces to manage multiple features or bug fixes simultaneously, switching
contexts without losing your place.

### AI-Assisted Development

Copy Selection extension outputs paths in Claude Code format (`@path#L1-10`), making it
easy to reference code in AI prompts.

## Configuration

All R3BL extensions share a common configuration for user feedback and notifications.
These settings apply globally across all R3BL extensions.

### Feedback Mechanism

Control how R3BL extensions display transient feedback messages (success, info, warning,
error):

```json
"r3bl.transientFeedbackMechanism": "statusbar"
```

**Options:**

- `"statusbar"` (default) - Shows auto-dismissing messages in the status bar (less
  intrusive)
- `"notification"` - Shows messages as VS Code notifications (classic behavior, may
  linger)
- `"none"` - Disables all transient feedback messages

**Note:** This setting does NOT affect interactive notifications with action buttons (like
confirmations or prompts).

### Status Bar Message Settings

When using `"statusbar"` feedback mechanism, you can customize the display:

#### Message Length

```json
"r3bl.statusbarMessageMaxLength": 50
```

Maximum characters to display before truncating with "...". Full message visible in
tooltip.

- **Default:** 50
- **Range:** 20-200

#### Message Durations

Customize how long each message type displays (in milliseconds):

```json
"r3bl.statusbarMessage.successDuration": 3000,
"r3bl.statusbarMessage.infoDuration": 3000,
"r3bl.statusbarMessage.warningDuration": 4000,
"r3bl.statusbarMessage.errorDuration": 5000
```

**Defaults:**

- Success: 3000ms (3 seconds)
- Info: 3000ms (3 seconds)
- Warning: 4000ms (4 seconds)
- Error: 5000ms (5 seconds)

**Range:** 500-10000ms per message type

### Example Configuration

For a completely silent experience with no transient messages:

```json
{
    "r3bl.transientFeedbackMechanism": "none"
}
```

For longer-lasting messages with extended display:

```json
{
    "r3bl.transientFeedbackMechanism": "statusbar",
    "r3bl.statusbarMessageMaxLength": 80,
    "r3bl.statusbarMessage.successDuration": 5000,
    "r3bl.statusbarMessage.errorDuration": 8000
}
```

### Which Extensions Use These Settings?

All R3BL extensions that display transient feedback messages use these global settings:

- ✅ R3BL Auto Insert Copyright
- ✅ R3BL Copy Selection Path and Range
- ✅ R3BL Fuzzy Search
- ✅ R3BL Semantic Configuration
- ✅ R3BL Task Management

**Infrastructure:** R3BL Shared provides the centralized message queue and configuration
management that ensures a consistent feedback experience across all R3BL tools.

## Release Notes

See [CHANGELOG.md](../../CHANGELOG.md) for detailed release notes and version history.

## License

MIT

## Contributing

Found a bug or have a suggestion? Please open an issue at:
https://github.com/r3bl-org/r3bl-vscode-extensions/issues

---

**Rebels race on! 🏁**
