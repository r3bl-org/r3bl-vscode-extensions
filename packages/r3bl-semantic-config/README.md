# R3BL Semantic Configuration

Automatically applies enhanced semantic highlighting settings optimized for Rust development. This extension is designed as a companion to the [R3BL Theme](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-theme) and provides semantic token color rules that perfectly complement the theme's color palette.

## Features

- **Auto-Activation**: Automatically detects when R3BL Theme is active and applies semantic highlighting
- **Theme Watcher**: Monitors theme changes and prompts to enable settings when switching to R3BL Theme
- **Manual Control**: Use commands to enable or disable semantic highlighting on demand
- **Smart Detection**: Warns about duplicate settings that can cause conflicts
- **Rust-Optimized**: Color rules specifically designed for Rust semantic tokens (functions, methods, structs, enums, lifetimes, etc.)
- **One-Click Setup**: No manual configuration needed - settings are applied automatically

## Screenshots

![Commands Palette](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-semantic-config/images/commands-palette.png)
*Manual enable/disable commands available in the Command Palette*

![Success Notification](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-semantic-config/images/success-notification.png)
*Confirmation message when semantic highlighting is successfully applied*

![Rust Syntax Highlighting](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-semantic-config/images/rust-syntax-highlighting.png)
*Example of semantic highlighting in action. See the [R3BL Theme README](https://github.com/r3bl-org/r3bl-vscode-extensions/tree/main/packages/r3bl-theme#screenshots) for more visual examples*

## Relationship with R3BL Theme

This extension is **automatically installed** when you install the R3BL Theme or the R3BL Extension Pack. It enhances the theme by:

- Providing optimized semantic highlighting for Rust (functions, methods, structs, enums, lifetimes, etc.)
- Auto-detecting and configuring when R3BL Theme is active
- Applying color rules specifically designed to work with the R3BL Theme's palette

**Note:** While this extension can be used independently, it is designed to work best with the R3BL Theme.

## Why This Extension Exists

### The Two-Layer Highlighting System

VS Code uses two separate highlighting systems that work together:

| Layer | Provided By | Customizable Via | Capabilities |
|-------|-------------|------------------|--------------|
| **TextMate Tokens** | Theme files | `.tmTheme` or `colors` in theme package | Basic syntax: keywords, strings, comments, operators |
| **Semantic Tokens** | Language servers (rust-analyzer) | `settings.json` **only** | Context-aware: mutability, lifetimes, trait bounds, self types |

### VS Code Architectural Limitation

Here's the key constraint: **VS Code themes cannot include semantic token customizations**. Semantic token color rules must be defined in your `settings.json` file - they cannot be bundled with a theme package. This is a VS Code architectural limitation, not a design choice.

**This is why we need a separate extension** - to automatically manage those semantic token settings for you, rather than requiring you to manually copy-paste configuration into your settings.

### The rust-analyzer Dependency

Semantic highlighting requires **rust-analyzer** to be installed and running:

1. **rust-analyzer** analyzes your Rust code and provides semantic token information (e.g., "this variable is mutable", "this is a lifetime annotation", "this implements a trait")
2. **This extension** defines what colors to apply to those semantic tokens
3. **R3BL Theme** provides the base TextMate syntax highlighting

All three components work together to create the complete enhanced highlighting experience.

**Without rust-analyzer:** You'll only see basic TextMate syntax highlighting from the theme.

**With rust-analyzer:** You get the full enhanced highlighting with mutable variables in bold italic, distinct colors for lifetimes, trait highlighting, and more.

## Requirements

- VS Code 1.60.0 or higher
- Works best with [R3BL Theme](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-theme)

## How It Works

### Auto-Activation

When you first install the extension or activate R3BL Theme, the extension automatically:

1. Detects that R3BL Theme is active
2. Applies semantic highlighting settings to your global configuration
3. Shows a success notification

### Theme Watcher

The extension continuously monitors your theme settings. When you switch to R3BL Theme, it:

1. Detects the theme change
2. Prompts you with: "R3BL Theme detected! Apply enhanced semantic highlighting?"
3. Applies settings when you click "Yes"

### Manual Control

You can manually enable or disable semantic highlighting using commands:

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "R3BL"
3. Select either:
   - `R3BL: Enable R3BL Semantic Highlighting`
   - `R3BL: Disable R3BL Semantic Highlighting`

### Duplicate Settings Detection

After applying settings, the extension checks for duplicate entries in your `settings.json`. If found, it warns you and offers to open your settings file to consolidate them.

## Semantic Token Rules

This extension applies the following semantic token color customizations optimized for Rust:

| Token Type | Color | Style | Description |
|------------|-------|-------|-------------|
| **Functions & Methods** | `#4B8CDC` | - | Function and method names |
| **Structs** | `#DDE86E` | - | Struct type names |
| **Enums** | `#FCB141` | - | Enum type names |
| **Enum Members** | `#FFCE66` | - | Enum variant names |
| **Variables** | `#E192EF` | - | Variable names |
| **Mutable Variables** | `#E192EF` | Bold Italic | Mutable variable names |
| **Parameters** | `#7c86f4` | - | Function parameters |
| **Properties** | `#ad83da` | - | Struct field access |
| **Lifetimes** | `#c56db599` | - | Lifetime annotations |
| **Keywords** | `#a8709e` | Italic Bold | Rust keywords |
| **Control Flow** | `#d14178` | Bold | if, match, loop, etc. |
| **Type Aliases** | `#ecc68e` | - | Type alias names |
| **Traits** | `#d1de73` | - | Trait names |
| **Unsafe** | `#e02b9d` | - | Unsafe functions/operators |
| **Self** | `#ce55b7` | - | self keyword |
| **Operators** | `#4d6a9f` | Bold | Arithmetic and logical operators |
| **Deprecated** | - | Strikethrough | Deprecated items |
| **Unresolved Reference** | `#ff6edb` | Strikethrough | Unresolved references |

The extension also enables `editor.semanticHighlighting.enabled` globally.

## Commands

- **`R3BL: Enable R3BL Semantic Highlighting`** - Manually apply semantic highlighting settings
- **`R3BL: Disable R3BL Semantic Highlighting`** - Remove semantic highlighting settings

## Settings Modified

When enabled, this extension modifies the following VS Code settings in your **global configuration**:

```json
{
  "editor.semanticHighlighting.enabled": true,
  "editor.semanticTokenColorCustomizations": {
    "rules": {
      // ... extensive semantic token rules (see table above)
    }
  }
}
```

When disabled, these settings are removed from your global configuration.

## Use Cases

### Automatic Setup (Recommended)

Most users will never need to interact with this extension directly:

1. Install R3BL Theme or R3BL Extension Pack
2. Semantic highlighting is automatically applied
3. Start coding with optimized colors

### Manual Control

Use manual commands when you:

- Want to temporarily disable semantic highlighting
- Need to reapply settings after modifying your configuration
- Want to use semantic highlighting with a different theme
- Are troubleshooting color issues

## Release Notes

See [CHANGELOG.md](../../CHANGELOG.md) for detailed release notes and version history.

## License

MIT

## Contributing

Found a bug or have a suggestion for new semantic token rules? Please open an issue at:
https://github.com/r3bl-org/r3bl-vscode-extensions/issues

---

**Enhanced highlighting for enhanced productivity!**
