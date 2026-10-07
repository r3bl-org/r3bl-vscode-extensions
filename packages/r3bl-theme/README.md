# R3BL Themes

[![Open VSX](https://img.shields.io/open-vsx/v/R3BL/r3bl-theme?label=Open%20VSX)](https://open-vsx.org/extension/R3BL/r3bl-theme)
[![VS Marketplace](https://img.shields.io/badge/VS%20Marketplace-blue?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-theme)

A suite of carefully crafted dark themes for VS Code—**R3BL Theme** and **R3BL 2026
Theme**, available in both standard (italic) and **No Italic** variants—optimized for Rust
and Markdown development with enhanced readability and visual appeal.

### Available Themes

1. **R3BL Theme** — Classic dark theme with italic styling for emphasis, markdown quotes,
   and semantic keywords/references.
2. **R3BL Theme (No Italic)** — Clean non-italic variant of the classic theme for
   developers who prefer straight typography.
3. **R3BL 2026 Theme** — Modernized 2026 dark palette with deep `#0e0f10` editor and
   sidebar background and italic styling.
4. **R3BL 2026 Theme (No Italic)** — Modernized 2026 dark palette with deep `#0e0f10`
   editor and sidebar background and non-italic typography.

## Features

- **Selectable Comment Brightness**: Choose between 3 comment brightness levels (`dim`,
  `medium`, `bright`) via `R3BL: Set Comment Brightness...` (defaults to soft slate gray
  `dim` out of the box)
- **Rust-Optimized Colors**: Specially designed syntax highlighting for Rust code with
  distinct colors for keywords, types, functions, and macros
- **Italic & Non-Italic Variants**: Choose the typography style that fits your workflow
  and font preferences
- **Dark Theme Excellence**: Professional dark color scheme that reduces eye strain during
  long coding sessions
- **Rich Markdown Support**: Beautiful rendering of documentation comments and markdown
  tables
- **Semantic Highlighting**: Automatically installs
  [R3BL Semantic Configuration](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-semantic-config)
  for enhanced Rust highlighting
- **Consistent UI**: Carefully selected colors for sidebar, tabs, status bar, and
  terminals
- **Bracket Pair Colorization**: Clear visual distinction for nested code blocks
- **Selection & Search**: High-contrast selection and search highlighting

## Screenshots

![Editor Overview](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-theme/images/editor-overview.png)
_Full editor view with sidebar, tabs, and Rust code highlighting_

![Rust Syntax Highlighting](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-theme/images/rust-syntax-highlighting.png)
_Rust-specific syntax highlighting with distinct keyword, type, and function colors_

![Documentation Comments](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-theme/images/documentation-comments.png)
_Beautiful rendering of documentation comments with code examples_

![Markdown Tables](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-theme/images/markdown-tables.png)
_Markdown-style tables in comments with clear formatting_

![Test Functions](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-theme/images/test-functions.png)
_Rust-specific syntax highlighting with distinct keyword, type, and function colors_

![Variable Highlighting](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-theme/images/variable-highlighting.png)
_Clear variable and parameter highlighting_

![Async Functions](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-theme/images/async-functions.png)
_Async function highlighting with type parameters and trait bounds_

![Type Annotations](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-theme/images/type-annotations.png)
_Complex type annotations with clear visual hierarchy_

![Selection Highlighting](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-theme/images/selection-highlighting.png)
_Selection highlighting with bracket pair colorization_

## Installation

### From Extension Pack (Recommended)

Install the
[R3BL Extension Pack](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-extension-pack)
which includes this theme along with other R3BL tools.

### Standalone Installation

1. Open VS Code
2. Press `Ctrl+P` (or `Cmd+P` on macOS)
3. Type: `ext install R3BL.r3bl-theme`
4. Press Enter

### From VSIX File

```bash
code --install-extension r3bl-theme-x.x.x.vsix
```

## Usage

### Activate the Theme

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "Color Theme"
3. Select "Preferences: Color Theme"
4. Choose any of the 4 R3BL themes:
    - `R3BL Theme`
    - `R3BL Theme (No Italic)`
    - `R3BL 2026 Theme`
    - `R3BL 2026 Theme (No Italic)`

**Or use the keyboard shortcut:**

- Press `Ctrl+K Ctrl+T` (or `Cmd+K Cmd+T` on macOS)
- Select your preferred R3BL theme variant

### Enhanced Semantic Highlighting

This theme **automatically installs** the R3BL Semantic Configuration extension, which
provides enhanced semantic highlighting specifically designed to complement this theme's
color palette.

The semantic configuration extension:

- Automatically detects when any of the R3BL themes is active
- Dynamically applies matching semantic highlighting (italic rules for standard themes,
  non-italic rules for No Italic variants)
- Can be enabled/disabled via commands: `R3BL: Enable/Disable Semantic Highlighting`

**No additional setup required** - just activate any of the R3BL themes and enjoy enhanced
syntax highlighting!

### Color Palette

The themes use a carefully selected color palette:

| Element       | Color                  | Usage                                        |
| ------------- | ---------------------- | -------------------------------------------- |
| **Keywords**  | Purple (`#c586c0`)     | `fn`, `let`, `mut`, `pub`, etc.              |
| **Types**     | Teal (`#4ec9b0`)       | Struct names, type parameters                |
| **Functions** | Yellow (`#dcdcaa`)     | Function names and calls                     |
| **Strings**   | Orange (`#ce9178`)     | String literals                              |
| **Numbers**   | Green (`#b5cea8`)      | Numeric literals                             |
| **Comments**  | Slate Gray (`#8B949E`) | Single and multi-line comments (dim default) |
| **Macros**    | Cyan (`#4fc1ff`)       | Rust macros like `println!`                  |

### Comment Brightness Levels

All 4 R3BL themes support 3 comment brightness levels managed dynamically via the
companion
[R3BL Semantic Configuration](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-semantic-config)
extension:

| Level                 | Color     | Description                               |
| :-------------------- | :-------- | :---------------------------------------- |
| **`dim`** _(Default)_ | `#8B949E` | Cool slate gray for maximum eye comfort   |
| **`medium`**          | `#ABACAC` | Neutral silver gray for balanced contrast |
| **`bright`**          | `#E8DCF4` | Vibrant lavender for high contrast        |

To change brightness at any time:

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Run `R3BL: Set Comment Brightness...`.
3. Choose **Dim**, **Medium**, or **Bright**.

Or set `"r3bl.commentBrightness": "dim"` in your `settings.json`.

### Recommended Settings

For the best experience with these themes:

```json
{
    "editor.semanticHighlighting.enabled": true,
    "editor.bracketPairColorization.enabled": true,
    "editor.guides.bracketPairs": "active",
    "workbench.colorTheme": "R3BL Theme"
}
```

## Optimized For

### Primary Languages

- **Rust** - Enhanced syntax highlighting for keywords, types, macros, and test functions
- **Markdown** - Beautiful rendering of documentation and README files

### Also Works Great With

- TypeScript/JavaScript
- Python
- Go
- JSON/YAML
- Shell scripts
- And more!

## What Makes It Different

### Rust-First Design

Unlike generic themes, R3BL themes are built specifically for Rust developers:

- Distinct colors for `pub`, `fn`, `impl`, `trait`, and other Rust keywords
- Clear visual distinction between owned types, references, and lifetimes
- Macro highlighting that stands out
- Test function backgrounds for easy test identification

### Semantic Awareness

Works with VS Code's semantic highlighting to provide context-aware colors based on the
language server's understanding of your code, not just regex patterns.

### Eye Comfort

- Carefully calibrated contrast ratios
- No harsh whites or overly bright colors
- Consistent darkness across all UI elements
- Reduced blue light in the color palette

## Comparison with Other Themes

| Feature              | R3BL Theme       | Generic Dark Themes |
| -------------------- | ---------------- | ------------------- |
| Rust Optimization    | ✅ Purpose-built | ❌ Generic patterns |
| Semantic Support     | ✅ Full support  | ⚠️ Varies           |
| Markdown in Comments | ✅ Rendered      | ⚠️ Basic            |
| Eye Comfort          | ✅ Optimized     | ⚠️ Varies           |

## Customization

Want to tweak the themes? Add to your `settings.json`:

```json
{
    "workbench.colorCustomizations": {
        "[R3BL Theme]": {
            "editor.background": "#1e1e1e",
            "editor.foreground": "#d4d4d4"
        },
        "[R3BL Theme (No Italic)]": {
            "editor.background": "#1e1e1e",
            "editor.foreground": "#d4d4d4"
        },
        "[R3BL 2026 Theme]": {
            "editor.background": "#1e1e1e",
            "editor.foreground": "#d4d4d4"
        },
        "[R3BL 2026 Theme (No Italic)]": {
            "editor.background": "#1e1e1e",
            "editor.foreground": "#d4d4d4"
        }
    },
    "editor.tokenColorCustomizations": {
        "[R3BL Theme]": {
            "textMateRules": [
                {
                    "scope": "keyword.control.rust",
                    "settings": {
                        "foreground": "#YOUR_COLOR"
                    }
                }
            ]
        },
        "[R3BL Theme (No Italic)]": {
            "textMateRules": [
                {
                    "scope": "keyword.control.rust",
                    "settings": {
                        "foreground": "#YOUR_COLOR"
                    }
                }
            ]
        },
        "[R3BL 2026 Theme]": {
            "textMateRules": [
                {
                    "scope": "keyword.control.rust",
                    "settings": {
                        "foreground": "#YOUR_COLOR"
                    }
                }
            ]
        },
        "[R3BL 2026 Theme (No Italic)]": {
            "textMateRules": [
                {
                    "scope": "keyword.control.rust",
                    "settings": {
                        "foreground": "#YOUR_COLOR"
                    }
                }
            ]
        }
    }
}
```

## Release Notes

See
[CHANGELOG.md](https://github.com/r3bl-org/r3bl-vscode-extensions/blob/main/CHANGELOG.md)
for detailed release notes and version history.

## License

MIT

## Contributing

Found a color that doesn't look quite right? Have a suggestion for improvement? Please
open an issue at: https://github.com/r3bl-org/r3bl-vscode-extensions/issues

---

**Code in color, code in style!**
