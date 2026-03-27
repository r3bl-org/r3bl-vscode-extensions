# R3BL Copy Selection Path and Range

Quickly copy file paths with selected line ranges in formats optimized for AI coding
agents (Claude Code, Gemini CLI, etc.) and IDE navigation. Perfect for sharing code
references in prompts, documentation, or team communication.

## Features

- **AI Agent Format**: Multi-line selections use `@path#L<start>-<end>` format
- **IDE Format**: Single-line selections use `path:<line>` format for IDE compatibility
- **Keyboard Shortcuts**: Quick copy with `Alt+O`, view history with `Alt+Shift+O`
- **Copy History**: Session-based history of recent copies (last 20 items)
- **Quick Navigation**: Select from history to jump to any previously copied location
- **Smart Paths**:
    - **Relative Paths**: Automatically uses workspace-relative paths for files inside the
      workspace
    - **Absolute Paths**: Fallback to full absolute paths for files outside the workspace
- **Cross-Platform**: Normalizes path separators for consistency

## Screenshots

![Single Line Copy](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-copy-selection-path-and-range/images/copy-notification-single-line.png)
_Single-line selection with auto-dismissing notification_

![Multi-Line Copy](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-copy-selection-path-and-range/images/copy-notification-multi-line.png)
_Multi-line selection in AI agent format with @ prefix_

![Copy History](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-copy-selection-path-and-range/images/copy-history.png)
_Copy history (Alt+Shift+O) showing recent copies with timestamps_

## Output Formats

The extension automatically chooses the best format based on your selection:

### Multi-Line Selection (AI Agent Format)

When you select multiple lines, the output includes an `@` prefix for AI coding agents:

```
@packages/r3bl-copy-selection-path-and-range/src/extension.ts#L6-14
```

This format is optimized for use in AI coding agent prompts (Claude Code, Gemini CLI,
etc.) where the `@` symbol tells the agent to reference that specific file and line range.

### Single-Line Selection (IDE Format)

When you have a single line selected or cursor on a line:

```
packages/r3bl-copy-selection-path-and-range/src/extension.ts:6
```

This format is compatible with most IDEs and terminals that support `file:line`
navigation.

### Outside Workspace (Absolute Path)

When you copy a path for a file outside of the VS Code workspace, the extension provides
the full absolute path:

```
@/home/user/Downloads/script.py#L10-25
```

It still maintains the `@` prefix and line range formatting for consistency.

## Requirements

- VS Code 1.95.0 or higher

## Usage

### Copy Path (Alt+O)

1. Select lines in your editor (or just place cursor on a line)
2. Press `Alt+O`
3. Path with line range is copied to clipboard
4. Notification shows what was copied (auto-dismisses)

### View Copy History (Alt+Shift+O)

1. Press `Alt+Shift+O` to open copy history
2. Browse your recent copies (up to 20 items)
3. Select any item to jump to that file and line range
4. History shows relative timestamps ("just now", "5 minutes ago", etc.)

### Command Palette

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "Copy File Path with Selection Range" or "Show Copy History"
3. Press Enter

## Use Cases

### AI Coding Agent Prompts

Share specific code sections in your prompts:

```
Can you review the error handling in @src/services/api.ts#L45-67?
```

The AI coding agent will automatically reference that exact section of your code.

### Code Reviews

Share precise locations with team members:

```
Please check the logic in src/utils/parser.ts:123
```

### Documentation

Reference specific implementations in your docs:

```
See the authentication flow in @src/auth/oauth.ts#L15-42
```

### Issue Tracking

Link to exact code locations in bug reports:

```
The bug occurs in src/components/Form.tsx:89
```

## Commands

- **`R3BL: Copy File Path with Selection Range`** - Copy the current file path with
  selection range to clipboard
- **`R3BL: Show Copy History`** - Show history of recently copied paths and navigate to
  any location

## Keyboard Shortcuts

| Shortcut      | Command                             | When             |
| ------------- | ----------------------------------- | ---------------- |
| `Alt+O`       | Copy File Path with Selection Range | Editor has focus |
| `Alt+Shift+O` | Show Copy History                   | Always           |

You can customize these shortcuts in VS Code's Keyboard Shortcuts settings.

## How It Works

1. **Path Calculation**:
    - Gets relative path from workspace root if file is inside workspace
    - Falls back to full absolute path if file is outside workspace
2. **Line Detection**: Determines if selection spans multiple lines
3. **Format Selection**:
    - Multi-line → AI agent format with `@` prefix
    - Single-line → IDE format
4. **Clipboard**: Copies formatted string
5. **History Storage**: Adds to in-memory session history (last 20 items)
6. **Notification**: Shows confirmation (auto-dismisses)

### Copy History

- Stored in memory (session-only, cleared on reload)
- Keeps last 20 copied items
- Shows file path, line range, and relative timestamp
- Quick pick interface for easy navigation
- Press `Alt+Shift+O` to access anytime

## Shared Infrastructure

This extension uses the **R3BL Shared** extension for centralized services across all R3BL
extensions (message queuing, global configuration, and more).

See the
[R3BL Shared documentation](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-shared)
for available services, API usage, and configuration options.

## Release Notes

See
[CHANGELOG.md](https://github.com/r3bl-org/r3bl-vscode-extensions/blob/main/CHANGELOG.md)
for detailed release notes and version history.

## License

MIT

## Contributing

Found a bug or have a feature suggestion? Please open an issue at:
https://github.com/r3bl-org/r3bl-vscode-extensions/issues

---

**Copy and share context with AI coding agents effortlessly!**
