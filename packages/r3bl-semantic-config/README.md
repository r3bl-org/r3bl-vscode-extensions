# R3BL Semantic Configuration

Automatically applies enhanced semantic highlighting settings for Rust development. This extension is designed as a companion to the [R3BL Theme](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-theme) and provides semantic highlighting rules that perfectly complement the theme's color palette.

## Relationship with R3BL Theme

This extension is **automatically installed** when you install the R3BL Theme. It exists to enhance the theme by providing:
- Optimized semantic highlighting for Rust (functions, methods, structs, enums, lifetimes, etc.)
- Automatic detection and configuration when R3BL Theme is active
- Color rules specifically designed to work with the R3BL Theme's palette

**Note:** While this extension can be used independently, it is designed to work best with the R3BL Theme.

## How It Works

- **Auto-activation**: Detects when R3BL Theme is active and offers to apply semantic highlighting
- **Theme watcher**: Monitors theme changes and prompts to enable settings when switching to R3BL Theme
- **Manual control**: Use commands `R3BL: Enable/Disable Semantic Highlighting` for manual control

## Documentation

For comprehensive documentation including features, configuration options, and usage instructions, see the [R3BL VSCode Extensions Repository](https://github.com/r3bl-org/r3bl-vscode-extensions#r3bl-semantic-configuration).

## License

MIT
