# Implementation Plan: r3bl-fuzzy-search Extension

## Project Overview

**Extension Name:** `r3bl-fuzzy-search`

**Purpose:** Fuzzy search across file contents using fzf, displaying results in VS Code's
Search Editor format.

**Key Specifications:**

- ✅ Command: `r3bl-fuzzy-search.searchInFiles`
- ✅ Keybinding: `ctrl+alt+d` (macOS: `cmd+alt+d`) - intentionally shadows built-in
  `search.action.openNewEditor`
- ✅ Keybinding is user-configurable
- ✅ macOS and Linux only (no Windows)
- ✅ Results limit: 500 (user-configurable)
- ✅ Search Editor display format

---

## Search Workflow

Based on the fish script example, here's the execution flow:

```
User Input → Ripgrep (content search) → FZF (fuzzy filter) → Parse Results → Search Editor
```

### Detailed Flow

1. **User triggers command:** `ctrl+alt+d`

2. **Input Collection:**
    - **Step 1:** Quick input box: "Enter search query (fuzzy pattern)"
        - Placeholder: "e.g., console.log, function, import"
        - This is the pattern to search for

    - **Step 2:** Quick input box: "Files to exclude (optional)"
        - Placeholder: "e.g., **/test/**, **/node_modules/**"
        - Comma-separated glob patterns
        - Pre-filled with default excludes from config
        - User can clear or modify

3. **Search Execution Pipeline:**

    ```bash
    rg --line-number --color=always --no-heading . \
       --glob '!**/node_modules/**' \
       --glob '!**/.git/**' \
       --glob '!user-exclude-pattern' \
    | fzf --ansi --filter='<search-query>' --no-sort
    ```

4. **Result Processing:**
    - Parse fzf output (format: `file:line:content`)
    - Limit to 500 results (configurable)
    - Group by file
    - Generate `.code-search` document

5. **Display:**
    - Open as Search Editor with syntax highlighting
    - Results are clickable for navigation

---

## Technical Implementation

### 1. Input Collection

```typescript
interface SearchInput {
    query: string // The fuzzy search pattern
    excludePatterns: string // Comma-separated globs
}

async function collectSearchInput(): Promise<SearchInput | undefined> {
    // Step 1: Search query
    const query = await vscode.window.showInputBox({
        prompt: "Enter search query (fuzzy pattern)",
        placeHolder: "e.g., console.log, function, import",
        ignoreFocusOut: true,
    })

    if (!query) {
        return undefined // User cancelled
    }

    // Step 2: Files to exclude
    const config = vscode.workspace.getConfiguration("r3blFuzzySearch")
    const defaultExcludes = config.get<string>(
        "defaultExcludePattern",
        "**/node_modules/**,**/.git/**,**/.vscode/**",
    )

    const excludePatterns = await vscode.window.showInputBox({
        prompt: "Files to exclude (optional, comma-separated globs)",
        placeHolder: "e.g., **/test/**, **/dist/**",
        value: defaultExcludes,
        ignoreFocusOut: true,
    })

    // User can press Enter with empty value to exclude nothing
    if (excludePatterns === undefined) {
        return undefined // User cancelled
    }

    return { query, excludePatterns: excludePatterns || "" }
}
```

---

### 2. Search Execution

```typescript
import { spawn } from "child_process"
import * as path from "path"

interface SearchResult {
    file: string // Relative path
    line: number // 1-based
    content: string // Line content
}

async function executeSearch(
    input: SearchInput,
    workspaceRoot: string,
): Promise<SearchResult[]> {
    const config = vscode.workspace.getConfiguration("r3blFuzzySearch")
    const rgPath = config.get<string>("ripgrepPath", "rg")
    const fzfPath = config.get<string>("fzfPath", "fzf")
    const resultLimit = config.get<number>("resultLimit", 500)

    // Build ripgrep arguments
    const rgArgs = [
        "--line-number",
        "--color=always",
        "--no-heading",
        "--no-messages", // Suppress error messages
    ]

    // Add exclude patterns
    const excludes = input.excludePatterns
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0)

    for (const exclude of excludes) {
        rgArgs.push("--glob", `!${exclude}`)
    }

    // Search all content
    rgArgs.push(".", workspaceRoot)

    // Build fzf arguments
    const fzfArgs = ["--ansi", "--filter", input.query, "--no-sort", "--delimiter", ":"]

    // Execute pipeline: rg | fzf
    const results = await executePipeline(
        { command: rgPath, args: rgArgs },
        { command: fzfPath, args: fzfArgs },
        resultLimit,
    )

    return parseResults(results, workspaceRoot)
}

interface ProcessConfig {
    command: string
    args: string[]
}

async function executePipeline(
    first: ProcessConfig,
    second: ProcessConfig,
    resultLimit: number,
): Promise<string> {
    return new Promise((resolve, reject) => {
        const rg = spawn(first.command, first.args)
        const fzf = spawn(second.command, second.args)

        let output = ""
        let lineCount = 0
        let limitReached = false

        // Pipe rg stdout to fzf stdin
        rg.stdout.pipe(fzf.stdin)

        // Collect fzf output
        fzf.stdout.on("data", (data) => {
            const chunk = data.toString()
            const lines = chunk.split("\n")

            for (const line of lines) {
                if (line.trim() && lineCount < resultLimit) {
                    output += line + "\n"
                    lineCount++
                } else if (lineCount >= resultLimit) {
                    limitReached = true
                    break
                }
            }

            if (limitReached) {
                rg.kill()
                fzf.kill()
            }
        })

        let errorOutput = ""
        fzf.stderr.on("data", (data) => {
            errorOutput += data.toString()
        })

        fzf.on("close", (code) => {
            if (code === 0 || code === 1) {
                // 0 = matches, 1 = no matches
                if (limitReached) {
                    vscode.window.showWarningMessage(
                        `Search limited to ${resultLimit} results. Consider narrowing your query.`,
                    )
                }
                resolve(output)
            } else {
                reject(new Error(`Search failed: ${errorOutput}`))
            }
        })

        rg.on("error", (err) => {
            reject(new Error(`ripgrep error: ${err.message}`))
        })

        fzf.on("error", (err) => {
            reject(new Error(`fzf error: ${err.message}`))
        })
    })
}
```

---

### 3. Result Parsing

```typescript
function parseResults(output: string, workspaceRoot: string): SearchResult[] {
    const lines = output.trim().split("\n")
    const results: SearchResult[] = []

    for (const line of lines) {
        if (!line.trim()) continue

        // Format from rg: file:line:content
        // We need to handle files with colons carefully
        const match = line.match(/^(.+?):(\d+):(.*)$/)
        if (!match) continue

        const [, filePath, lineNum, content] = match

        // Make path relative to workspace
        const relativePath = path.relative(workspaceRoot, filePath)

        results.push({
            file: relativePath,
            line: parseInt(lineNum, 10),
            content: content,
        })
    }

    return results
}
```

---

### 4. Search Editor Generation

```typescript
function generateSearchEditorContent(
    input: SearchInput,
    results: SearchResult[],
): string {
    // Generate header
    const header = generateHeader(input, results)

    // Generate body
    const body = generateBody(results)

    return `${header}\n\n${body}`
}

function generateHeader(input: SearchInput, results: SearchResult[]): string {
    const lines: string[] = []

    lines.push(`# Query: ${input.query}`)
    lines.push(`# Flags: FuzzyMatch`)

    if (input.excludePatterns) {
        lines.push(`# Excluding: ${input.excludePatterns}`)
    }

    // Count unique files
    const uniqueFiles = new Set(results.map((r) => r.file)).size
    lines.push(`#`)
    lines.push(`# ${results.length} results - ${uniqueFiles} files`)

    return lines.join("\n")
}

function generateBody(results: SearchResult[]): string {
    // Group results by file
    const byFile = new Map<string, SearchResult[]>()

    for (const result of results) {
        if (!byFile.has(result.file)) {
            byFile.set(result.file, [])
        }
        byFile.get(result.file)!.push(result)
    }

    const sections: string[] = []

    for (const [file, fileResults] of byFile) {
        sections.push(`${file}:`)

        // Sort by line number
        fileResults.sort((a, b) => a.line - b.line)

        for (const result of fileResults) {
            // Format: "  line: content"
            // Remove ANSI color codes
            const cleanContent = result.content.replace(/\x1b\[[0-9;]*m/g, "")
            sections.push(`  ${result.line}: ${cleanContent.trim()}`)
        }

        sections.push("") // Blank line between files
    }

    return sections.join("\n")
}
```

---

### 5. Display in Editor

```typescript
async function displayResults(content: string) {
    const doc = await vscode.workspace.openTextDocument({
        content: content,
        language: "search-result",
    })

    await vscode.window.showTextDocument(doc, {
        preview: false,
        viewColumn: vscode.ViewColumn.Active,
    })
}
```

---

### 6. Dependency Checking

```typescript
async function checkDependencies(): Promise<boolean> {
    const config = vscode.workspace.getConfiguration("r3blFuzzySearch")
    const rgPath = config.get<string>("ripgrepPath", "rg")
    const fzfPath = config.get<string>("fzfPath", "fzf")

    const [rgInstalled, fzfInstalled] = await Promise.all([
        checkCommand(rgPath),
        checkCommand(fzfPath),
    ])

    if (!rgInstalled) {
        vscode.window
            .showErrorMessage(
                "ripgrep (rg) is not installed. Please install it:\n\n" +
                    "macOS: brew install ripgrep\n" +
                    "Linux: sudo apt install ripgrep (Debian/Ubuntu)\n" +
                    "       sudo dnf install ripgrep (Fedora)\n\n" +
                    "https://github.com/BurntSushi/ripgrep#installation",
                "Open Installation Guide",
            )
            .then((choice) => {
                if (choice) {
                    vscode.env.openExternal(
                        vscode.Uri.parse(
                            "https://github.com/BurntSushi/ripgrep#installation",
                        ),
                    )
                }
            })
        return false
    }

    if (!fzfInstalled) {
        vscode.window
            .showErrorMessage(
                "fzf is not installed. Please install it:\n\n" +
                    "macOS: brew install fzf\n" +
                    "Linux: sudo apt install fzf (Debian/Ubuntu)\n" +
                    "       sudo dnf install fzf (Fedora)\n\n" +
                    "https://github.com/junegunn/fzf#installation",
                "Open Installation Guide",
            )
            .then((choice) => {
                if (choice) {
                    vscode.env.openExternal(
                        vscode.Uri.parse("https://github.com/junegunn/fzf#installation"),
                    )
                }
            })
        return false
    }

    return true
}

async function checkCommand(command: string): Promise<boolean> {
    return new Promise((resolve) => {
        const proc = spawn("which", [command])
        proc.on("close", (code) => {
            resolve(code === 0)
        })
        proc.on("error", () => {
            resolve(false)
        })
    })
}
```

---

## Configuration

```jsonc
{
    "r3blFuzzySearch.fzfPath": {
        "type": "string",
        "default": "fzf",
        "description": "Path to fzf executable",
    },
    "r3blFuzzySearch.ripgrepPath": {
        "type": "string",
        "default": "rg",
        "description": "Path to ripgrep executable",
    },
    "r3blFuzzySearch.defaultExcludePattern": {
        "type": "string",
        "default": "**/node_modules/**,**/.git/**,**/.vscode/**",
        "description": "Default comma-separated glob patterns for files to exclude",
    },
    "r3blFuzzySearch.resultLimit": {
        "type": "number",
        "default": 500,
        "minimum": 1,
        "maximum": 10000,
        "description": "Maximum number of search results to display",
    },
}
```

---

## Package.json

```jsonc
{
    "name": "r3bl-fuzzy-search",
    "displayName": "R3BL Fuzzy Search",
    "version": "1.0.0",
    "publisher": "R3BL",
    "description": "Fuzzy search in files using fzf - fast and smart search with Search Editor results",
    "categories": ["Other"],
    "keywords": ["search", "fzf", "fuzzy", "ripgrep", "find"],
    "repository": {
        "type": "git",
        "url": "https://github.com/r3bl-org/r3bl-vscode-extensions",
    },
    "engines": {
        "vscode": "^1.80.0",
    },
    "activationEvents": [],
    "main": "./dist/extension.js",
    "contributes": {
        "commands": [
            {
                "command": "r3bl-fuzzy-search.searchInFiles",
                "title": "R3BL Fuzzy Search: Search in Files",
            },
        ],
        "keybindings": [
            {
                "command": "r3bl-fuzzy-search.searchInFiles",
                "key": "ctrl+alt+d",
                "mac": "cmd+alt+d",
                "when": "editorTextFocus || !editorTextFocus",
            },
        ],
        "configuration": {
            "title": "R3BL Fuzzy Search",
            "properties": {
                "r3blFuzzySearch.fzfPath": {
                    "type": "string",
                    "default": "fzf",
                    "description": "Path to fzf executable",
                },
                "r3blFuzzySearch.ripgrepPath": {
                    "type": "string",
                    "default": "rg",
                    "description": "Path to ripgrep executable",
                },
                "r3blFuzzySearch.defaultExcludePattern": {
                    "type": "string",
                    "default": "**/node_modules/**,**/.git/**,**/.vscode/**",
                    "description": "Default comma-separated glob patterns for files to exclude",
                },
                "r3blFuzzySearch.resultLimit": {
                    "type": "number",
                    "default": 500,
                    "minimum": 1,
                    "maximum": 10000,
                    "description": "Maximum number of search results to display",
                },
            },
        },
    },
}
```

---

## File Structure

```
packages/r3bl-fuzzy-search/
├── src/
│   ├── extension.ts              # Entry point, activation
│   ├── searchCommand.ts          # Main command orchestration
│   ├── inputCollector.ts         # User input collection
│   ├── searchExecutor.ts         # Execute rg | fzf pipeline
│   ├── resultParser.ts           # Parse search results
│   ├── searchEditorGenerator.ts  # Generate .code-search content
│   ├── dependencyChecker.ts      # Check rg/fzf installation
│   └── types.ts                  # TypeScript interfaces
├── package.json
├── tsconfig.json
├── webpack.config.js
├── .vscodeignore
└── README.md
```

---

## Main Command Flow

```typescript
// src/searchCommand.ts

export async function executeSearchCommand() {
    // 1. Check dependencies
    const depsOk = await checkDependencies()
    if (!depsOk) {
        return
    }

    // 2. Get workspace root
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
    if (!workspaceFolder) {
        vscode.window.showErrorMessage("Please open a folder first")
        return
    }

    const workspaceRoot = workspaceFolder.uri.fsPath

    // 3. Collect input
    const input = await collectSearchInput()
    if (!input) {
        return // User cancelled
    }

    // 4. Execute search
    try {
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "Searching with fzf...",
                cancellable: false,
            },
            async () => {
                const results = await executeSearch(input, workspaceRoot)

                if (results.length === 0) {
                    vscode.window.showInformationMessage(
                        `No results found for "${input.query}"`,
                    )
                    return
                }

                // 5. Generate Search Editor content
                const content = generateSearchEditorContent(input, results)

                // 6. Display results
                await displayResults(content)

                // 7. Show summary
                const uniqueFiles = new Set(results.map((r) => r.file)).size
                vscode.window.showInformationMessage(
                    `Found ${results.length} results in ${uniqueFiles} files`,
                )
            },
        )
    } catch (error) {
        vscode.window.showErrorMessage(
            `Search failed: ${error instanceof Error ? error.message : String(error)}`,
        )
    }
}
```

---

## User Experience

### Example Session

1. User presses `ctrl+alt+d`
2. Input box appears: "Enter search query (fuzzy pattern)"
    - User types: `consle.log` (typo intentional)
3. Input box appears: "Files to exclude (optional)"
    - Pre-filled: `**/node_modules/**,**/.git/**,**/.vscode/**`
    - User adds: `,**/test/**`
4. Progress notification: "Searching with fzf..."
5. Search Editor opens with results showing:
    - All matches for "console.log" (fuzzy matched despite typo)
    - Grouped by file
    - Clickable line numbers
6. Notification: "Found 47 results in 12 files"

---

## Advantages

| Feature          | Built-in Search               | R3BL Fuzzy Search           |
| ---------------- | ----------------------------- | --------------------------- |
| Matching         | Exact/Regex                   | Fuzzy (FZF)                 |
| Typo Tolerance   | No                            | Yes                         |
| Speed            | Fast                          | Fast (rg+fzf)               |
| Result Display   | Sidebar or Editor             | Search Editor               |
| Keybinding       | `ctrl+shift+f` / `ctrl+alt+d` | `ctrl+alt+d` (configurable) |
| Customization    | Limited                       | Extensive                   |
| Exclude Patterns | In UI                         | Quick input                 |

---

## Error Handling

| Error                   | Handling                                                        |
| ----------------------- | --------------------------------------------------------------- |
| No workspace            | "Please open a folder first"                                    |
| rg not installed        | Show install instructions with link                             |
| fzf not installed       | Show install instructions with link                             |
| No results              | "No results found for '{query}'"                                |
| Result limit hit        | "Search limited to 500 results. Consider narrowing your query." |
| Search fails            | "Search failed: {error message}"                                |
| Invalid exclude pattern | rg handles gracefully, shows what it can                        |

---

## Testing Checklist

- [ ] Search with simple query (e.g., "function")
- [ ] Search with fuzzy query (e.g., "consle" finds "console")
- [ ] Search with no results
- [ ] Search with 500+ results (test limit)
- [ ] Search with exclude patterns
- [ ] Search with empty exclude patterns (search all)
- [ ] Search in large codebase (performance)
- [ ] Click results to navigate
- [ ] Test on macOS
- [ ] Test on Linux
- [ ] Test with rg not installed
- [ ] Test with fzf not installed
- [ ] Test with no workspace open
- [ ] Test keybinding `ctrl+alt+d`
- [ ] Test custom keybinding
- [ ] Test configuration changes

---

## Monorepo Integration

Following CLAUDE.md guidelines:

1. Create `packages/r3bl-fuzzy-search/` directory
2. Copy config files from existing extension
3. Implement extension code
4. Update `r3bl-extension-pack/package.json`:
    - Increment version
    - Add `"R3BL.r3bl-fuzzy-search"` to extensionPack
5. Update `script_lib.sh`: Add version detection
6. Update `build.sh`: Add build steps
7. Update `install.sh`: Add install steps
8. Update `README.md`: Add extension documentation
9. Update `CHANGELOG.md`: Add new extension entry
10. Run `./build.sh` to test
11. Run `./install.sh` to install locally
12. Commit all changes

---

## Implementation Order

1. ✅ Setup project structure and files
2. ✅ Implement dependency checker
3. ✅ Implement input collector
4. ✅ Implement search executor (rg | fzf pipeline)
5. ✅ Implement result parser
6. ✅ Implement Search Editor generator
7. ✅ Implement main command orchestration
8. ✅ Add configuration
9. ✅ Add keybinding
10. ✅ Test locally
11. ✅ Update monorepo integration
12. ✅ Documentation and README

---

## Reference: Fish Script Algorithm

The implementation is based on this fish script:

```fish
# Defined in /home/nazmul/.config/fish/functions/utils/code-search.fish @ line 1
function code-search --description 'Fuzzy search with ripgrep and fzf, copy result to clipboard'
    set -l result (rg --line-number --color=always . | fzf --ansi \
        --delimiter : \
        --preview 'bat --color=always --style=numbers {1} --highlight-line {2}' \
        --preview-window '+{2}+3/2' \
        --header 'Fuzzy search code (type to filter)')

    # If user selected something, copy to clipboard and echo
    if test -n "$result"
        set -l file (echo $result | cut -d: -f1)
        set -l line (echo $result | cut -d: -f2)
        set -l location "$file:$line"

        # Copy to clipboard
        echo -n $location | setclip

        # Echo to stdout
        echo $location
    end
end
```

Key differences in VS Code extension:

- Non-interactive fzf (`--filter` instead of interactive mode)
- Input boxes instead of terminal UI
- Search Editor output instead of clipboard
- Two-step input (query, then excludes)

---

## Platform Support

- ✅ **macOS**: Full support
- ✅ **Linux**: Full support (Debian, Ubuntu, Fedora, Arch, etc.)
- ❌ **Windows**: Not supported (simplified path handling)

**Path Handling:**

- Always use forward slashes `/`
- Workspace root from `workspace.workspaceFolders[0].uri.fsPath`
- Relative paths for results
- No need for path normalization between platforms

---

## .code-search Document Format

Search Editor format specification:

```
# Query: <search-query>
# Flags: <flags like CaseSensitive, RegExp, FuzzyMatch>
# Including: <include-patterns>
# Excluding: <exclude-patterns>
# ContextLines: <number>
#
# <number> results - <number> files

<filepath>:
  <line-number>: <line-content>
  <line-number>: <line-content>

<filepath>:
  <line-number>: <line-content>
```

**Example:**

```
# Query: console.log
# Flags: FuzzyMatch
# Excluding: **/node_modules/**,**/.git/**,**/test/**
#
# 15 results - 3 files

src/extension.ts:
  42:     console.log('Extension activated');
  67:     console.log('Search completed');

src/searchExecutor.ts:
  23:   console.log('Executing search pipeline');
```

---

## Notes for Developer

1. **Dependencies**: Extension requires `rg` and `fzf` to be installed on the host system
2. **Result Limit**: Configurable via `r3blFuzzySearch.resultLimit` (default: 500)
3. **Keybinding**: Shadows built-in `search.action.openNewEditor` intentionally
4. **ANSI Color Codes**: Must be stripped from search results before display
5. **Process Management**: Properly handle process cleanup on errors
6. **Error Messages**: Should be user-friendly with installation links
7. **Progress Indicator**: Use `vscode.window.withProgress` for long operations
8. **TypeScript**: Use strict mode and proper typing throughout
9. **Testing**: Test on both macOS and Linux before release
10. **Documentation**: Update README with usage instructions and screenshots
