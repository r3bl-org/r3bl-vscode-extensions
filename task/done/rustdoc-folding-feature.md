# Plan: Add Rustdoc Folding Feature to r3bl-semantic-config

## Overview

Add a command to collapse all rustdoc blocks (`///` and `//!`) in Rust files while leaving
regular comments (`//`) and code uncollapsed. Triggered via `Ctrl+Alt+-`.

## Target Extension

`packages/r3bl-semantic-config/` - Already Rust-focused, handles semantic highlighting.

## Files to Modify

1. **`packages/r3bl-semantic-config/package.json`**
    - Add new command: `r3bl-semantic-config.foldRustdocs`
    - Add keybinding: `Ctrl+Alt+-` for Rust files
    - Bump version: `1.1.4` → `1.1.5`

2. **`packages/r3bl-semantic-config/src/extension.ts`**
    - Register the new command
    - Import the folding module

3. **`packages/r3bl-semantic-config/src/rustdocFolding.ts`** (NEW)
    - Implement rustdoc detection and folding logic

4. **`packages/r3bl-extension-pack/package.json`**
    - Bump version to reflect updated extension

5. **`CHANGELOG.md`**
    - Document the new feature

## Implementation Details

### 1. Rustdoc Detection Algorithm

Parse document line-by-line to identify rustdoc blocks:

```typescript
interface RustdocBlock {
    startLine: number
    endLine: number
    type: "module" | "item" // //! vs ///
}
```

**Detection rules:**

- `//!` at line start (with optional leading whitespace) → module-level doc
- `///` at line start (with optional leading whitespace) → item-level doc
- `//` (single slash, not followed by `/` or `!`) → regular comment, SKIP
- Consecutive lines of same type form a block

**Edge cases:**

- Mixed `///` and `//!` should be separate blocks
- Single-line rustdocs still get folded (become collapsed)
- Empty lines break blocks

### 2. Folding Mechanism

VSCode's folding approach:

1. Use `editor.fold` command with `{ selectionLines: [lineNumber] }`
2. This folds the region containing that line
3. Rust-analyzer already provides folding regions for doc comments

**Fallback:** If rust-analyzer doesn't provide folding, register a FoldingRangeProvider.

### 3. Command Implementation

```typescript
async function foldAllRustdocs(): Promise<void> {
    const editor = vscode.window.activeTextEditor
    if (!editor || editor.document.languageId !== "rust") {
        showStatusBarMessage("Not a Rust file", "warning")
        return
    }

    const blocks = findRustdocBlocks(editor.document)
    if (blocks.length === 0) {
        showStatusBarMessage("No rustdocs found", "info")
        return
    }

    // Fold from bottom to top to preserve line numbers
    for (const block of blocks.reverse()) {
        await foldRange(editor, block.startLine)
    }

    showStatusBarMessage(`Folded ${blocks.length} rustdoc blocks`, "success")
}
```

### 4. package.json Changes

```json
"commands": [
    // ... existing commands ...
    {
        "command": "r3bl-semantic-config.foldRustdocs",
        "title": "Fold All Rustdocs",
        "category": "R3BL"
    }
],
"keybindings": [
    // ... existing keybindings ...
    {
        "command": "r3bl-semantic-config.foldRustdocs",
        "key": "ctrl+alt+-",
        "when": "editorTextFocus && editorLangId == rust"
    }
]
```

## Execution Order

1. Create `src/rustdocFolding.ts` with detection and folding logic
2. Update `src/extension.ts` to register the command
3. Update `package.json` with command, keybinding, and version
4. Update extension pack version
5. Update CHANGELOG.md
6. Build and test

## Testing Scenarios

- File with multiple `///` doc blocks
- File with `//!` module-level docs at top
- File with mixed `///` and `//!`
- File with regular `//` comments (should NOT fold)
- File with no rustdocs (show info message)
- Non-Rust file (show warning)

## Build, Test & Verify

```bash
# Build all extensions
./build.sh

# Install locally for testing
./install.sh
```

**Manual verification:**

1. Open a Rust file with rustdocs
2. Press `Ctrl+Alt+-`
3. Verify `///` and `//!` blocks fold
4. Verify `//` comments remain unfolded
5. Verify code remains unfolded

## Publish to Marketplaces

After successful build, test, and verification:

```bash
# Publish r3bl-semantic-config and extension pack to both marketplaces
./publish.sh r3bl-semantic-config r3bl-extension-pack
```

This publishes to:

- **VS Marketplace** (using `VSCE_PAT` from `~/.profile`)
- **Open VSX** (using `OVSX_PAT` from `~/.profile`)

---

# Additional Task: Remove task\_ Prefix Requirement

## Overview

Update the `/r3bl-task` Claude Code command to remove the requirement that task files must
have a `task_` prefix. Task files should just be `.md` files - no prefix needed.

## File to Modify

**`packages/r3bl-task-management/templates/r3bl-task-command.md`**

## Changes

1. Remove any mention of `task_` prefix requirement
2. When loading a task, do NOT automatically prepend `task_` to the filename
3. Task files are simply `*.md` files in the task directory

## After Changes

- Bump `packages/r3bl-task-management/package.json` version
- Bump `packages/r3bl-extension-pack/package.json` version
- Update `CHANGELOG.md`
- Build and test
- Publish both `r3bl-task-management` and `r3bl-extension-pack`
