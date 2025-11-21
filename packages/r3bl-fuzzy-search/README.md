# R3BL Fuzzy Search

Interactive fuzzy search across file contents using fzf, with live preview and instant
results.

## Features

- **Interactive Search Panel**: Always-editable search box with live preview as you type
- **Fuzzy Search**: Smart search using [fzf](https://github.com/junegunn/fzf) that
  tolerates typos and is case-insensitive
- **Fast Results**: Powered by [ripgrep](https://github.com/BurntSushi/ripgrep) for
  lightning-fast file content search
- **Live Preview**: See results update in real-time as you type (250ms debounce)
- **Dual View Modes**:
    - Preview results in interactive panel with clickable navigation
    - Press Enter to open full results in a code editor tab
- **Customizable Excludes**: Configure which files and directories to exclude from search
  on-the-fly
- **Gitignore Support**: Toggle `.gitignore` respect on/off during search
- **Result Limit**: Configurable maximum number of results (default: 100) with visual
  warning
- **Respects VS Code Settings**: Font size, line height, and editor settings automatically
  applied
- **Smart Result Ranking**: Best matches appear first, sorted by relevance

## Screenshots

![Interactive Search Panel](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-fuzzy-search/images/1.png)
_Interactive search panel with live preview and always-editable search box_

![Live Results](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-fuzzy-search/images/2.png)
_Live preview shows results as you type with 250ms debounce_

![Clickable Navigation](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-fuzzy-search/images/3.png)
_Click any result to jump directly to that location in your code_

![Results in Editor Tab](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-fuzzy-search/images/4.png)
_Press Enter to open full results in a Search Editor tab with clickable line numbers_

![Configure Settings](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-fuzzy-search/images/5.png)
_Configure exclude patterns and .gitignore respect with interactive buttons_

## Requirements

This extension requires the following command-line tools to be installed:

- **ripgrep (rg)**: Fast file content search
    - macOS: `brew install ripgrep`
    - Linux: `sudo apt install ripgrep` (Debian/Ubuntu) or `sudo dnf install ripgrep`
      (Fedora)
    - More: https://github.com/BurntSushi/ripgrep#installation

- **fzf**: Fuzzy finder
    - macOS: `brew install fzf`
    - Linux: `sudo apt install fzf` (Debian/Ubuntu) or `sudo dnf install fzf` (Fedora)
    - More: https://github.com/junegunn/fzf#installation

**Platform Support**: macOS and Linux only (Windows is not supported)

## Usage

### Keyboard Shortcut

Press `Alt+Shift+D` to start a fuzzy search (same shortcut for both macOS and Linux).

### Search Workflow

1. **Open search panel**: Press `Alt+Shift+D` to open the interactive search panel
2. **Type your query**: Start typing your fuzzy search pattern (e.g., `exprt` will find
   `export`)
3. **See live results**: Results appear in real-time as you type (250ms debounce)
4. **Navigate instantly**: Click any result in the panel to jump directly to that location
5. **Modify and re-search**: Edit your query anytime to refine results
6. **Open full results** (optional): Press Enter to save results to `/tmp/` and open in a
   Search Editor tab
7. **Configure settings**: Use icon buttons to toggle .gitignore respect or modify exclude
   patterns
    - Gear icon: Modify exclude patterns
    - Search-stop icon: Toggle .gitignore respect on/off

### Example

Search for `exprt activate` (with a typo):

- Type in the interactive panel
- Live results show: `export function activate`, `export const activate`, etc.
- Click any result to navigate instantly
- Press Enter to open full results in editor tab
- Results saved to: `/tmp/exprt_activate.code-search`

## Extension Settings

This extension contributes the following settings:

- `r3blFuzzySearch.fzfPath`: Path to fzf executable (default: `fzf`)
- `r3blFuzzySearch.ripgrepPath`: Path to ripgrep executable (default: `rg`)
- `r3blFuzzySearch.defaultExcludePattern`: Default comma-separated glob patterns for files
  to exclude (default: `**/node_modules/**,**/.git/**,**/.vscode/**,**/target/**`)
- `r3blFuzzySearch.resultLimit`: Maximum number of search results to display (default:
  100, range: 1-10000)
- `r3blFuzzySearch.respectGitignore`: Automatically respect .gitignore files when
  searching (default: true)

## Commands

- `R3BL Fuzzy Search: Interactive Search` - Open interactive search panel with live
  preview

## Keyboard Shortcuts

| Shortcut      | Command ID                        | When   |
| ------------- | --------------------------------- | ------ |
| `Alt+Shift+D` | `r3bl-fuzzy-search.searchInFiles` | Always |

You can customize this shortcut in VS Code's Keyboard Shortcuts settings by searching for
the command ID above.

## Advantages Over Built-in Search

| Feature            | Built-in Search   | R3BL Fuzzy Search          |
| ------------------ | ----------------- | -------------------------- |
| Matching           | Exact/Regex       | Fuzzy (FZF)                |
| Typo Tolerance     | No                | Yes                        |
| Speed              | Fast              | Fast (rg+fzf)              |
| Live Preview       | No                | Yes (250ms debounce)       |
| Result Display     | Sidebar or Editor | Interactive Panel + Editor |
| Instant Navigation | No                | Click to jump              |
| Re-query           | Must start over   | Edit anytime               |
| Keybinding         | `Ctrl+Shift+F`    | `Alt+Shift+D`              |
| Gitignore          | Always respected  | Toggleable                 |
| Result Ranking     | Basic             | Smart (by relevance)       |

## Known Issues

- Results are limited to the configured maximum (default 100). If you hit this limit,
  consider narrowing your search query.
- Windows is not supported due to simplified path handling for Unix-like systems.

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

Found a bug or have a feature request? Please open an issue at:
https://github.com/r3bl-org/r3bl-vscode-extensions/issues

---

**Enjoy fuzzy searching!**
