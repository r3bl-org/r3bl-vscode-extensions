<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Implementation plan](#implementation-plan)
  - [Step 0: Create Extension Package Structure](#step-0-create-extension-package-structure)
    - [Step 0.0: Create Directory](#step-00-create-directory)
    - [Step 0.1: Create package.json](#step-01-create-packagejson)
    - [Step 0.2: Create tsconfig.json](#step-02-create-tsconfigjson)
    - [Step 0.3: Create .vscodeignore](#step-03-create-vscodeignore)
    - [Step 0.4: Copy License and Logo Files](#step-04-copy-license-and-logo-files)
  - [Step 1: Implement Extension Logic](#step-1-implement-extension-logic)
    - [Step 1.0: Create src/extension.ts](#step-10-create-srcextensiontsx)
    - [Step 1.1: Implement Path Calculation Logic](#step-11-implement-path-calculation-logic)
    - [Step 1.2: Implement Selection Handling](#step-12-implement-selection-handling)
  - [Step 2: Configure Keybinding](#step-2-configure-keybinding)
  - [Step 3: Integrate into Extension Pack](#step-3-integrate-into-extension-pack)
  - [Step 4: Update Build Infrastructure](#step-4-update-build-infrastructure)
    - [Step 4.0: Update Root package.json](#step-40-update-root-packagejson)
    - [Step 4.1: Update build.sh](#step-41-update-buildsh)
    - [Step 4.2: Update install.sh](#step-42-update-installsh)
    - [Step 4.3: Update script_lib.sh](#step-43-update-script_libsh)
  - [Step 5: Build and Test](#step-5-build-and-test)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Overview

This task creates a new VSCode extension called `r3bl-copy-selection-path-and-range` that allows users to quickly copy the file path with selected line ranges in a specific format suitable for sharing with Claude Code or other tools.

## Purpose

When working with code, users often need to reference a specific file and the lines they're working on. This extension allows them to:
1. Select text in the editor
2. Press `Alt+o`
3. Get a formatted string copied to clipboard in the format: `#file:path/from/cwd/to/file/some_file.rs:165-169`

This format is designed to be understood by Claude Code and other tools to quickly locate and reference code sections.

## Specifications

### Output Format

The extension produces a string with the following formats depending on the selection:

1. **Range of lines** (multi-line selection):
   ```
   tui/src/readline_async/readline_async_impl/integration_tests/pty_ctrl_navigation_test.rs#L331-335
   ```

2. **Single line** (single-line selection):
   ```
   tui/src/readline_async/readline_async_impl/integration_tests/pty_ctrl_navigation_test.rs:331
   ```

3. **No selection** (cursor only, no text selected):
   ```
   tui/src/readline_async/readline_async_impl/integration_tests/pty_ctrl_navigation_test.rs
   ```

Breaking down the formats:
- **No prefix**: Just the relative path from workspace root to the file
- **Range of lines**: Uses `#L<start>-<end>` format (e.g., `#L331-335`)
  - Capital `L` followed by start line number, hyphen, and end line number
  - This format is used by Claude Code ONLY
  - NOT semantically valid for IDEs like VSCode & RustRover (they don't support jumping to a file with a range of lines)
- **Single line**: Uses `:<lineNumber>` format (e.g., `:331`)
  - Colon followed by line number
  - Only when there's an actual selection on a single line
  - Works in VSCode, RustRover, AND Claude Code
- **No selection**: Just the file path with NO line number suffix
  - When cursor is in the file but no text is selected
  - Works in VSCode, RustRover, AND Claude Code

### Line Range Behavior

1. **Multi-line selection**: Format as `#L<startLine>-<endLine>` (e.g., `#L165-169`)
   - Claude Code specific format
   - Allows Claude to select and view a range of lines
2. **Single-line selection**: Format as `:<lineNumber>` (e.g., `:165`)
   - IDE-compatible format that works everywhere
   - Only when there's an actual text selection on that line
3. **No selection (cursor only)**: Just the file path with no line number
   - IDE-compatible format that works everywhere
   - Allows opening the file without jumping to a specific line
4. **Path type**: Always relative to workspace root (not absolute)

### Keyboard Shortcut

- **Key**: `Alt+o` (consistent across Windows, Mac, and Linux)
- **Context**: `editorTextFocus` (only available when focused on editor text)

### User Feedback

After copying, show an information message displaying what was copied so the user confirms the action.

---

# Implementation plan

## Step 0: Create Extension Package Structure

Create the directory structure and configuration files for the new extension.

### Step 0.0: Create Directory

Create the extension directory at `packages/r3bl-copy-selection-path-and-range/` with necessary subdirectories:
- `packages/r3bl-copy-selection-path-and-range/`
- `packages/r3bl-copy-selection-path-and-range/src/`

### Step 0.1: Create package.json

Create `packages/r3bl-copy-selection-path-and-range/package.json` with the following structure:

```json
{
  "name": "r3bl-copy-selection-path-and-range",
  "displayName": "R3BL Copy Selection Path and Range",
  "description": "Copy file path with selected line ranges in Claude Code format (#file:path:range)",
  "version": "1.0.0",
  "publisher": "R3BL",
  "engines": {
    "vscode": "^1.60.0"
  },
  "categories": ["Other"],
  "icon": "r3bl-cube-logo.png",
  "repository": {
    "type": "git",
    "url": "https://github.com/r3bl-org/r3bl-vscode-extensions.git",
    "directory": "packages/r3bl-copy-selection-path-and-range"
  },
  "activationEvents": ["onCommand:r3bl-copy-selection-path-and-range.copyPathAndRange"],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "r3bl-copy-selection-path-and-range.copyPathAndRange",
        "title": "Copy File Path with Selection Range",
        "category": "R3BL"
      }
    ],
    "keybindings": [
      {
        "command": "r3bl-copy-selection-path-and-range.copyPathAndRange",
        "key": "alt+o",
        "when": "editorTextFocus"
      }
    ]
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "@types/vscode": "^1.60.0",
    "typescript": "^5.0.0"
  }
}
```

### Step 0.2: Create tsconfig.json

Create `packages/r3bl-copy-selection-path-and-range/tsconfig.json` with TypeScript compilation settings:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "out",
    "lib": ["ES2020"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true
  },
  "exclude": ["node_modules", ".vscode-test"]
}
```

### Step 0.3: Create .vscodeignore

Create `packages/r3bl-copy-selection-path-and-range/.vscodeignore` to exclude unnecessary files from the VSIX package:

```
.git
.gitignore
src
tsconfig.json
.vscode-test
*.vsix
node_modules
```

### Step 0.4: Copy License and Logo Files

Copy the following files from another extension package:
- Copy `packages/r3bl-semantic-config/LICENSE` → `packages/r3bl-copy-selection-path-and-range/LICENSE`
- Copy `packages/r3bl-semantic-config/r3bl-cube-logo.png` → `packages/r3bl-copy-selection-path-and-range/r3bl-cube-logo.png`

## Step 1: Implement Extension Logic

Create the TypeScript source file that implements the core functionality.

### Step 1.0: Create src/extension.ts

Create `packages/r3bl-copy-selection-path-and-range/src/extension.ts` with the basic extension structure:

```typescript
import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    const copyCommand = vscode.commands.registerCommand(
        'r3bl-copy-selection-path-and-range.copyPathAndRange',
        handleCopyPathAndRange
    );

    context.subscriptions.push(copyCommand);
}

export function deactivate() {}

async function handleCopyPathAndRange() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    const document = editor.document;
    const selection = editor.selection;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
    }

    // Calculate relative path from workspace root
    const absolutePath = document.uri.fsPath;
    const relativePath = path.relative(workspaceFolder.uri.fsPath, absolutePath);

    // Calculate line range
    const lineRange = calculateLineRange(selection);

    // Format the output (no #file: prefix, just relative path + line range)
    const output = `${relativePath}${lineRange}`;

    // Copy to clipboard
    await vscode.env.clipboard.writeText(output);

    // Show confirmation message
    vscode.window.showInformationMessage(`Copied: ${output}`);
}

function calculateLineRange(selection: vscode.Selection): string {
    const startLine = selection.start.line + 1; // Convert to 1-based line numbers
    const endLine = selection.end.line + 1;

    // Check if there's actually a selection (not just cursor position)
    const hasSelection = !selection.isEmpty;

    if (!hasSelection) {
        // No selection - return empty string (just file path)
        return '';
    }

    // If selection is on a single line
    if (startLine === endLine) {
        return `:${startLine}`;
    }

    // If selection spans multiple lines - use Claude Code format
    return `#L${startLine}-${endLine}`;
}
```

### Step 1.1: Implement Path Calculation Logic

The path calculation should:
- Get the absolute file path from the active editor's document
- Get the workspace folder root
- Calculate the relative path from workspace root to the file
- Handle cases where the file is outside the workspace (show error)
- Normalize path separators to forward slashes for consistency

This is implemented in the `handleCopyPathAndRange` function with:
```typescript
const relativePath = path.relative(workspaceFolder.uri.fsPath, absolutePath);
```

### Step 1.2: Implement Selection Handling

The selection handling should:
- Detect if text is selected using `selection.isEmpty` (returns `false` if there's a selection)
- For multi-line selections: use format `#L<startLine>-<endLine>` (Claude Code specific)
- For single-line selections: use format `:<lineNumber>`
- For cursor only (no selection): return empty string (no line number)
- Convert line numbers from 0-based (VSCode) to 1-based (user-friendly)
- Handle edge cases where selection might be backwards (end before start)

This is implemented in the `calculateLineRange` function which returns the appropriate format based on selection state:
- Empty selection (cursor only): `` (empty string - just file path)
- Single-line selection: `:<lineNumber>`
- Multi-line selection: `#L<startLine>-<endLine>`

## Step 2: Configure Keybinding

The keybinding is configured in `package.json` under `contributes.keybindings`:

```json
"keybindings": [
  {
    "command": "r3bl-copy-selection-path-and-range.copyPathAndRange",
    "key": "alt+o",
    "when": "editorTextFocus"
  }
]
```

This configuration:
- Binds the command to `Alt+o` on all platforms (Windows, Mac, Linux)
- Only activates when the editor text area has focus (`editorTextFocus`)
- Prevents conflicts with other global shortcuts

## Step 3: Integrate into Extension Pack

Add the new extension to the R3BL extension pack so it gets installed with other R3BL extensions.

Edit `packages/r3bl-extension-pack/package.json` and add to the `extensionPack` array:

```json
"extensionPack": [
  "R3BL.r3bl-theme",
  "R3BL.r3bl-auto-insert-copyright",
  "R3BL.r3bl-semantic-config",
  "R3BL.r3bl-copy-selection-path-and-range"
]
```

This ensures users who install the R3BL extension pack will get this extension automatically.

## Step 4: Update Build Infrastructure

Update the build scripts and configuration files to include the new extension in the build process.

### Step 4.0: Update Root package.json

Add a build script to the root `package.json` for convenience:

```json
"scripts": {
  ...existing scripts...,
  "build:copy-selection-path": "npm run build --workspace=packages/r3bl-copy-selection-path-and-range"
}
```

This allows developers to build just this extension with `npm run build:copy-selection-path`.

### Step 4.1: Update build.sh

Add build steps to `build.sh` in the root directory. Insert the following before the final summary:

```bash
# Build R3BL Copy Selection Path and Range
echo -e "${BLUE}Building R3BL Copy Selection Path and Range...${NC}"
cd packages/r3bl-copy-selection-path-and-range
npm install
npm run compile
vsce package --no-dependencies
cd ../..
```

This ensures the extension is built and packaged when running the main build script.

### Step 4.2: Update install.sh

Add installation steps to `install.sh`. Add a new section that installs the new extension:

```bash
# Install R3BL Copy Selection Path and Range
echo "Installing R3BL Copy Selection Path and Range..."
code --install-extension packages/r3bl-copy-selection-path-and-range/*.vsix
```

This allows developers to install the extension via the install script.

### Step 4.3: Update script_lib.sh

Update the `script_lib.sh` file to track the new extension:
- Add `r3bl-copy-selection-path-and-range` to the `get_all_versions()` function
- Add it to the `print_built_extensions()` function
- Add it to any other version tracking or extension listing functions

This ensures the new extension appears in build reports and version checks.

## Step 5: Build and Test

After implementation, verify the extension works correctly:

1. **Install dependencies**: Run `npm install` in the extension directory
2. **Compile TypeScript**: Run `npm run compile` to generate the `out/` directory
3. **Package extension**: Run `vsce package` to create the `.vsix` file
4. **Manual testing**:
   - Open a file in VSCode
   - Select some text
   - Press `Alt+o`
   - Verify the clipboard contains the correct format (check with paste)
   - Test with no selection (should copy current line)
   - Test with single line selection
   - Test with multi-line selection
   - Verify the message confirms what was copied
5. **Verify keyboard shortcut**: Make sure `Alt+o` doesn't conflict with other extensions
6. **Test integration**: Verify it appears in the extension pack when installing the meta extension

Expected output examples:
- Multi-line: `src/components/Button.tsx#L45-67`
- Single-line: `utils/helpers.ts:120`
- No selection (cursor only): `README.md`

Note the format differences:
- Multi-line uses `#L<start>-<end>` (Claude Code specific, allows range selection)
- Single-line uses `:<lineNumber>` (IDE-compatible, jumps to specific line)
- No selection returns just file path (IDE-compatible, opens file without jumping to line)
