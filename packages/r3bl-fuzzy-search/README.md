# R3BL Fuzzy Search

Fuzzy search across file contents using fzf, displaying results in VS Code's Search Editor format.

## Features

- **Fuzzy Search**: Smart search using [fzf](https://github.com/junegunn/fzf) that tolerates typos
- **Fast Results**: Powered by [ripgrep](https://github.com/BurntSushi/ripgrep) for lightning-fast file content search
- **Search Editor Format**: Results displayed in VS Code's native Search Editor with clickable navigation
- **Customizable Excludes**: Configure which files and directories to exclude from search
- **Result Limit**: Configurable maximum number of results (default: 500)

## Requirements

This extension requires the following command-line tools to be installed:

- **ripgrep (rg)**: Fast file content search
  - macOS: `brew install ripgrep`
  - Linux: `sudo apt install ripgrep` (Debian/Ubuntu) or `sudo dnf install ripgrep` (Fedora)
  - More: https://github.com/BurntSushi/ripgrep#installation

- **fzf**: Fuzzy finder
  - macOS: `brew install fzf`
  - Linux: `sudo apt install fzf` (Debian/Ubuntu) or `sudo dnf install fzf` (Fedora)
  - More: https://github.com/junegunn/fzf#installation

**Platform Support**: macOS and Linux only (Windows is not supported)

## Usage

### Keyboard Shortcut

Press `Ctrl+Alt+D` (macOS: `Cmd+Alt+D`) to start a fuzzy search.

> **Note**: This shortcut intentionally shadows the built-in `search.action.openNewEditor` command. You can customize the keybinding in VS Code settings if desired.

### Search Workflow

1. **Enter search query**: Type your fuzzy search pattern (e.g., `consle.log` will find `console.log`)
2. **Configure excludes** (optional): Specify comma-separated glob patterns for files to exclude
   - Pre-filled with default patterns from your configuration
   - You can clear or modify as needed
3. **View results**: Results open in a Search Editor with clickable line numbers for easy navigation

### Example

Search for `consle.log` (with a typo):
- Finds: `console.log`, `console.error`, etc.
- Results grouped by file
- Click any result to jump to that location

## Extension Settings

This extension contributes the following settings:

- `r3blFuzzySearch.fzfPath`: Path to fzf executable (default: `fzf`)
- `r3blFuzzySearch.ripgrepPath`: Path to ripgrep executable (default: `rg`)
- `r3blFuzzySearch.defaultExcludePattern`: Default comma-separated glob patterns for files to exclude (default: `**/node_modules/**,**/.git/**,**/.vscode/**,**/target/**`)
- `r3blFuzzySearch.resultLimit`: Maximum number of search results to display (default: 500, range: 1-10000)

> **Future Enhancement**: Support for automatically reading `.gitignore` patterns is planned for a future release.

## Commands

- `R3BL Fuzzy Search: Search in Files` - Start a fuzzy search in the current workspace

## Advantages Over Built-in Search

| Feature | Built-in Search | R3BL Fuzzy Search |
|---------|----------------|-------------------|
| Matching | Exact/Regex | Fuzzy (FZF) |
| Typo Tolerance | No | Yes |
| Speed | Fast | Fast (rg+fzf) |
| Result Display | Sidebar or Editor | Search Editor |
| Keybinding | `Ctrl+Shift+F` / `Ctrl+Alt+D` | `Ctrl+Alt+D` (configurable) |

## Known Issues

- Results are limited to the configured maximum (default 500). If you hit this limit, consider narrowing your search query.
- Windows is not supported due to simplified path handling for Unix-like systems.

## Release Notes

### 1.0.0

Initial release of R3BL Fuzzy Search:
- Fuzzy search using fzf
- Integration with ripgrep for fast content search
- Search Editor results display
- Configurable exclude patterns and result limits
- macOS and Linux support

## License

MIT

## Contributing

Found a bug or have a feature request? Please open an issue at:
https://github.com/r3bl-org/r3bl-vscode-extensions/issues

---

**Enjoy fuzzy searching!**
