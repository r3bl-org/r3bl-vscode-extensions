# R3BL Semantic Configuration

This extension provides three powerful features for Rust development in VS Code:

1. **Enhanced Semantic Highlighting** - Automatically applies optimized color rules for
   Rust semantic tokens
2. **Debounced rust-analyzer Flycheck** - Keeps your IDE responsive by intelligently
   timing `cargo check` runs
3. **Rustdoc Folding** - Fold/unfold all documentation comments (`///` and `//!`) with a
   single command

## Table of Contents

- [Feature 1: Semantic Highlighting](#feature-1-semantic-highlighting)
- [Feature 2: Debounced rust-analyzer Flycheck](#feature-2-debounced-rust-analyzer-flycheck)
- [Feature 3: Rustdoc Folding](#feature-3-rustdoc-folding)
- [Requirements](#requirements)
- [Commands](#commands)
- [Release Notes](#release-notes)

---

## Feature 1: Semantic Highlighting

### What It Does

Automatically applies enhanced semantic token color customizations optimized for Rust
development. This extension is designed as a companion to the
[R3BL Theme](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-theme) and
provides color rules that perfectly complement the theme's palette.

### Why This Feature Exists

VS Code uses two separate highlighting systems:

| Layer               | Provided By                      | Customizable Via         | Capabilities                                 |
| ------------------- | -------------------------------- | ------------------------ | -------------------------------------------- |
| **TextMate Tokens** | Theme files                      | Theme package            | Basic syntax: keywords, strings, comments    |
| **Semantic Tokens** | Language servers (rust-analyzer) | `settings.json` **only** | Context-aware: mutability, lifetimes, traits |

**The key constraint**: VS Code themes cannot include semantic token customizations. These
rules must be defined in your `settings.json` - they cannot be bundled with a theme
package.

**This is why we need a separate extension** - to automatically manage semantic token
settings for you, rather than requiring manual configuration.

### Screenshots

![Commands Palette](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-semantic-config/images/commands-palette.png)
_Manual enable/disable commands in the Command Palette_

![Rust Syntax Highlighting](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-semantic-config/images/rust-syntax-highlighting.png)
_Semantic highlighting in action_

### How It Works

#### Auto-Activation

When installed with R3BL Theme active, the extension automatically:

1. Detects R3BL Theme is active
2. Applies semantic highlighting to global configuration
3. Shows a success notification

#### Theme Watcher

Monitors theme changes. When you switch to R3BL Theme:

1. Detects the change
2. Prompts: "R3BL Theme detected! Apply enhanced semantic highlighting?"
3. Applies settings on confirmation

#### Manual Control

Use commands in Command Palette (`Ctrl+Shift+P`):

- `R3BL: Enable R3BL Semantic Highlighting`
- `R3BL: Disable R3BL Semantic Highlighting`

### Semantic Token Rules

| Token Type               | Color       | Style         | Description                      |
| ------------------------ | ----------- | ------------- | -------------------------------- |
| **Functions & Methods**  | `#4B8CDC`   | -             | Function and method names        |
| **Structs**              | `#DDE86E`   | -             | Struct type names                |
| **Enums**                | `#FCB141`   | -             | Enum type names                  |
| **Enum Members**         | `#FFCE66`   | -             | Enum variant names               |
| **Variables**            | `#E192EF`   | -             | Variable names                   |
| **Mutable Variables**    | `#E192EF`   | Bold Italic   | Mutable variable names           |
| **Parameters**           | `#7c86f4`   | -             | Function parameters              |
| **Properties**           | `#ad83da`   | -             | Struct field access              |
| **Lifetimes**            | `#c56db599` | -             | Lifetime annotations             |
| **Keywords**             | `#a8709e`   | Italic Bold   | Rust keywords                    |
| **Control Flow**         | `#d14178`   | Bold          | if, match, loop, etc.            |
| **Type Aliases**         | `#ecc68e`   | -             | Type alias names                 |
| **Traits**               | `#d1de73`   | -             | Trait names                      |
| **Unsafe**               | `#e02b9d`   | -             | Unsafe functions/operators       |
| **Self**                 | `#ce55b7`   | -             | self keyword                     |
| **Operators**            | `#4d6a9f`   | Bold          | Arithmetic and logical operators |
| **Deprecated**           | -           | Strikethrough | Deprecated items                 |
| **Unresolved Reference** | `#ff6edb`   | Strikethrough | Unresolved references            |

---

## Feature 2: Debounced rust-analyzer Flycheck

### The Problem: IDE Lag During Typing

When you're coding intensely - typing fast, thinking through logic, refactoring - you need
your IDE to be **instantly responsive**. Every keystroke should feel immediate.

**rust-analyzer's `checkOnSave`** runs `cargo check` every time you save a file. While
useful, this creates problems:

- **Heavy CPU usage** during compilation blocks the IDE
- **Lag and stuttering** interrupt your coding flow
- **Constant interruptions** when you're rapidly saving while experimenting
- On large projects, each check can take **several seconds**

The result: your IDE becomes sluggish exactly when you need it most - during active
development.

### The Solution: Intelligent Debouncing

Debounced flycheck solves this by **waiting for you to stop typing** before running
`cargo check`:

```
You type → Timer starts (1 second)
You type again → Timer resets
You stop typing → Timer expires → Flycheck runs
```

**Why this works:**

- While you're actively typing, **no heavy computation** - IDE stays responsive
- After you pause (finished a thought, reviewing code), flycheck runs
- You get compile feedback **exactly when you need it** - during natural pauses
- Your coding flow is never interrupted by background compilation

### Configuration

The feature is **enabled by default**. Customize in `settings.json`:

```json
{
    "r3bl-semantic-config.debouncedFlycheck.enabled": true,
    "r3bl-semantic-config.debouncedFlycheck.delayMs": 1000,
    "r3bl-semantic-config.debouncedFlycheck.languages": ["rust"],
    "r3bl-semantic-config.debouncedFlycheck.autoDisableCheckOnSave": true
}
```

| Setting                  | Type     | Default    | Description                                           |
| ------------------------ | -------- | ---------- | ----------------------------------------------------- |
| `enabled`                | boolean  | `true`     | Enable debounced flycheck                             |
| `delayMs`                | number   | `1000`     | Milliseconds to wait after last keystroke (100-10000) |
| `languages`              | string[] | `["rust"]` | Language IDs to monitor                               |
| `autoDisableCheckOnSave` | boolean  | `true`     | Auto-disable `rust-analyzer.checkOnSave`              |

### How It Works

1. **Text change detected** → Timer starts (or restarts)
2. **Status bar shows countdown** → "⏱️ Flycheck in 0.8s..."
3. **Timer expires** → "🚀 Running flycheck..."
4. **Flycheck completes** → Status bar hides

The timer is **global** - all Rust file changes share one timer since `runFlycheck` checks
the entire workspace.

### Keybinding for Manual Trigger

**Default keybinding:** `Ctrl+R` (when editing a Rust file)

This command:

- Cancels any pending debounced flycheck
- Runs flycheck immediately
- Hides the status bar countdown

To customize the keybinding, add to your `keybindings.json`:

```json
{
    "key": "ctrl+shift+r", // <- Or your preferred shortcut
    "command": "r3bl-semantic-config.runFlycheck",
    "when": "editorTextFocus && !editorReadonly && editorLangId == rust"
}
```

### Auto-Disable checkOnSave

When `autoDisableCheckOnSave` is `true` (default), the extension automatically sets
`rust-analyzer.checkOnSave` to `false`. This prevents redundant checks - debounced
flycheck replaces save-triggered checks.

You'll see: "Disabled rust-analyzer.checkOnSave (debounced flycheck is now handling this)"

---

## Feature 3: Rustdoc Folding

### What It Does

Provides commands to fold (collapse) or unfold (expand) all Rust documentation comments in
a file. This makes it easy to focus on the code by hiding lengthy documentation blocks.

### Comment Types

| Comment Type | Example     | Behavior                         |
| ------------ | ----------- | -------------------------------- |
| `///`        | Item docs   | Folded by these commands         |
| `//!`        | Module docs | Folded by these commands         |
| `//`         | Regular     | **Not affected** (stays visible) |

### Keybindings

| Keybinding | Command             | Description                  |
| ---------- | ------------------- | ---------------------------- |
| `Ctrl+-`   | Fold All Rustdocs   | Collapse all `///` and `//!` |
| `Ctrl+=`   | Unfold All Rustdocs | Expand all rustdoc blocks    |

These keybindings only activate when:

- You're editing a Rust file
- The editor has focus

### Auto-Fold on File Open

By default, rustdoc comments are **automatically folded** when you open a Rust file. This
lets you focus on the code immediately without manual folding.

**Configuration:**

```json
{
    "r3bl-semantic-config.autoFoldRustdocsOnOpen": true
}
```

| Setting                  | Type    | Default | Description                                 |
| ------------------------ | ------- | ------- | ------------------------------------------- |
| `autoFoldRustdocsOnOpen` | boolean | `true`  | Auto-fold rustdocs when opening a Rust file |

Set `autoFoldRustdocsOnOpen` to `false` to disable auto-folding and use manual `Ctrl+-`.

### How It Works

1. Scans the document for consecutive lines starting with `///` or `//!`
2. Groups them into blocks (module-level and item-level separately)
3. Creates folding ranges for each block
4. Manual fold shows status bar feedback: "Folded 5 rustdoc blocks in filename.rs"

### Manual Trigger

Use Command Palette (`Ctrl+Shift+P`):

- `R3BL: Fold All Rustdocs`
- `R3BL: Unfold All Rustdocs`

---

## Requirements

- VS Code 1.60.0 or higher
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
  extension
- Works best with
  [R3BL Theme](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-theme)

### Why rust-analyzer is Required

Both features in this extension depend on **rust-analyzer**:

- **Semantic Highlighting** - rust-analyzer provides token information (e.g., "this
  variable is mutable", "this is a lifetime")
- **Debounced Flycheck** - rust-analyzer's `runFlycheck` command executes `cargo check`

## Commands

| Command                                    | Keybinding | Description                                |
| ------------------------------------------ | ---------- | ------------------------------------------ |
| `R3BL: Enable R3BL Semantic Highlighting`  | -          | Apply semantic highlighting settings       |
| `R3BL: Disable R3BL Semantic Highlighting` | -          | Remove semantic highlighting settings      |
| `R3BL: Run Flycheck (Debounced)`           | `Ctrl+R`   | Manually trigger flycheck, cancels pending |
| `R3BL: Fold All Rustdocs`                  | `Ctrl+-`   | Collapse all `///` and `//!` blocks        |
| `R3BL: Unfold All Rustdocs`                | `Ctrl+=`   | Expand all rustdoc blocks                  |

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

Found a bug or have a suggestion? Please open an issue at:
https://github.com/r3bl-org/r3bl-vscode-extensions/issues

---

**Responsive IDE + Beautiful Highlighting = Enhanced Productivity!**
