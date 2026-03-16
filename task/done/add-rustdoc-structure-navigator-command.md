# Plan: Rustdoc Structure Navigator Command

## Overview

Add a new command `r3bl-semantic-config.navigateRustdocs` (keybinding: `Ctrl+Shift+Y`)
that provides quick navigation within and across rustdoc blocks in Rust files using
VSCode's QuickPick UI.

**Two modes of operation:**

1. **Cursor inside a rustdoc block** — Shows headings (`#`, `##`, `###`, etc.) within that
   specific block. Selecting a heading navigates the cursor to that line.
2. **Cursor outside any rustdoc block** — Shows a list of all rustdoc blocks in the file
   (with a summary label for each). Selecting a block navigates to its first line.

This is analogous to `workbench.action.gotoSymbol` (Ctrl+Shift+O) but for rustdoc
structure.

---

## Files to Modify

| File                                                    | Action     | Purpose                                                             |
| ------------------------------------------------------- | ---------- | ------------------------------------------------------------------- |
| `packages/r3bl-semantic-config/src/rustdocFolding.ts`   | **Modify** | Export `findRustdocBlocks` and `RustdocBlock` so they can be reused |
| `packages/r3bl-semantic-config/src/rustdocNavigator.ts` | **Create** | New module with all navigator logic                                 |
| `packages/r3bl-semantic-config/src/extension.ts`        | **Modify** | Register the new command and wire it into activation                |
| `packages/r3bl-semantic-config/package.json`            | **Modify** | Add command definition and keybinding                               |

---

## Step 1: Export shared types from `rustdocFolding.ts`

Currently `findRustdocBlocks()` and `RustdocBlock` are module-private. Export them so the
new navigator module can reuse them.

**Changes:**

```typescript
// Before
interface RustdocBlock { ... }
function findRustdocBlocks(document: vscode.TextDocument): RustdocBlock[] { ... }

// After
export interface RustdocBlock { ... }
export function findRustdocBlocks(document: vscode.TextDocument): RustdocBlock[] { ... }
```

This is a safe refactor — no behavior changes, just visibility.

---

## Step 2: Create `src/rustdocNavigator.ts`

This is the core of the feature. The module will contain:

### 2a. Heading parser

```typescript
interface RustdocHeading {
    line: number; // Line number in the document
    level: number; // 1 for #, 2 for ##, etc.
    text: string; // The heading text (without # prefix)
}

function findHeadingsInBlock(
    document: vscode.TextDocument,
    block: RustdocBlock,
): RustdocHeading[];
```

**Logic:**

- Iterate lines from `block.startLine` to `block.endLine`
- For each line, strip the rustdoc prefix (`///` or `//!`) and any leading whitespace
- Check if the remaining text starts with one or more `#` followed by a space
- Extract the heading level (count of `#` characters) and text
- Return array of `RustdocHeading` objects

**Example parsing:**

```
/// # PTY Primer           → { level: 1, text: "PTY Primer" }
/// ## Child process        → { level: 2, text: "Child process" }
//! ### Implementation      → { level: 3, text: "Implementation" }
```

### 2b. Block label generator

```typescript
function getBlockLabel(document: vscode.TextDocument, block: RustdocBlock): string;
```

**Logic:**

- Look for the first heading in the block → use it as the label
- If no heading found, use the first non-empty content line (trimmed, truncated to ~60
  chars)
- Prefix with block type indicator: `///` or `//!`
- Include line number for reference

**Example labels:**

```
/// # PTY Primer (line 40)
//! Module documentation (line 1)
/// impl Display for Foo (line 250)    ← no heading, uses first content line
```

### 2c. Determine which block the cursor is in

```typescript
function findContainingBlock(
    blocks: RustdocBlock[],
    cursorLine: number,
): RustdocBlock | undefined;
```

**Logic:**

- Iterate through blocks
- Return the block where `block.startLine <= cursorLine <= block.endLine`
- Return `undefined` if cursor is not inside any block

### 2d. Main navigator function

```typescript
export async function navigateRustdocs(): Promise<void>;
```

**Logic:**

1. Get active editor, validate it's a Rust file
2. Call `findRustdocBlocks(document)` to get all blocks
3. If no blocks found, show status bar message "No rustdoc blocks found" and return
4. Get cursor position: `editor.selection.active.line`
5. Call `findContainingBlock(blocks, cursorLine)`

**Mode A: Cursor inside a rustdoc block**

6. Call `findHeadingsInBlock(document, containingBlock)`
7. If headings found:
    - Build QuickPick items with heading indentation based on level:
        ```
        # PTY Primer
          ## Child process perspective
          ## Parent process perspective
        # Controlled side lifecycle
        ```
    - Use `vscode.window.showQuickPick()` with items
    - On selection: move cursor to that heading's line and reveal it
8. If no headings found in this block:
    - Show status bar message "No headings found in this rustdoc block"

**Mode B: Cursor outside any rustdoc block**

6. Build QuickPick items for each block using `getBlockLabel()`
7. Show QuickPick with all blocks
8. On selection: move cursor to the block's start line and reveal it

### 2e. QuickPick item structure

```typescript
interface RustdocQuickPickItem extends vscode.QuickPickItem {
    targetLine: number;
}
```

- `label`: The heading text (with indentation for level) or block label
- `description`: Line number (e.g., "line 40")
- `detail`: For headings mode — the block type (`///` or `//!`); for blocks mode — block
  type and line range
- `targetLine`: The line to navigate to

### 2f. Navigation action (shared by both modes)

```typescript
function navigateToLine(editor: vscode.TextEditor, line: number): void;
```

**Logic:**

- Create position at the target line, character 0
- Set `editor.selection` to a collapsed selection at that position
- Call `editor.revealRange()` with `InCenter` reveal type so the heading appears centered
  in the viewport

---

## Step 3: Register command in `extension.ts`

Add to the `activate()` function:

```typescript
import { navigateRustdocs } from './rustdocNavigator';

// In activate():
const navigateRustdocsCommand = vscode.commands.registerCommand(
    'r3bl-semantic-config.navigateRustdocs',
    navigateRustdocs,
);

// Add to context.subscriptions.push(...)
context.subscriptions.push(
    // ... existing commands ...
    navigateRustdocsCommand,
);
```

---

## Step 4: Update `package.json`

### 4a. Add command

```json
{
    "command": "r3bl-semantic-config.navigateRustdocs",
    "title": "Navigate Rustdoc Structure",
    "category": "R3BL"
}
```

### 4b. Add keybinding

```json
{
    "command": "r3bl-semantic-config.navigateRustdocs",
    "key": "ctrl+shift+y",
    "when": "editorTextFocus && editorLangId == rust"
}
```

---

## Step 5: Update versions and changelog

Per CLAUDE.md workflow checklist:

1. Bump version in `packages/r3bl-semantic-config/package.json` (1.1.9 → 1.2.0, since this
   is a new feature)
2. Bump version in `packages/r3bl-extension-pack/package.json`
3. Update `CHANGELOG.md` with new entry

---

## Step 6: Build and test

```bash
./build.sh
./install.sh
```

**Manual test plan:**

1. Open a Rust file with multiple rustdoc blocks containing headings
2. Place cursor inside a rustdoc block → press `Ctrl+Shift+Y` → verify headings appear in
   QuickPick with proper indentation → select one → verify cursor jumps to heading line
3. Place cursor outside any rustdoc block → press `Ctrl+Shift+Y` → verify all blocks
   appear in QuickPick → select one → verify cursor jumps to block start
4. Open a Rust file with no rustdoc blocks → press `Ctrl+Shift+Y` → verify status bar
   message
5. Open a non-Rust file → press `Ctrl+Shift+Y` → verify nothing happens (keybinding `when`
   clause prevents it)
6. Test with both `///` and `//!` style blocks
7. Test with blocks that have no headings (cursor inside) → verify fallback message

---

## Design Decisions

### Why a new file (`rustdocNavigator.ts`) instead of adding to `rustdocFolding.ts`?

Separation of concerns. Folding and navigation are distinct features with different VSCode
APIs (`FoldingRangeProvider` vs `QuickPick`). Keeping them in separate modules follows the
existing pattern where each feature has clear boundaries.

### Why QuickPick instead of a TreeView or WebView?

QuickPick is the standard VSCode pattern for "go to" navigation (used by `Ctrl+Shift+O`,
`Ctrl+P`, `Ctrl+Shift+P`). Users already know how to interact with it — type to filter,
arrow keys to navigate, Enter to select. It requires no additional UI infrastructure.

### Why show all blocks when cursor is outside (instead of doing nothing)?

This provides a coarse navigation mechanism. When you're scrolling through a large file
and want to jump to a specific rustdoc block, you don't want to first find a rustdoc block
to put your cursor in. The "show all blocks" mode acts as a file-level table of contents
for documentation.

### Why indent headings by level in the QuickPick?

Visual hierarchy makes it easy to scan the structure at a glance. A flat list of headings
would lose the parent-child relationship that `#` vs `##` vs `###` conveys.

### Heading indentation format

Use spaces to indent sub-headings:

```
# Top Level
  ## Second Level
    ### Third Level
```

This mirrors how `workbench.action.gotoSymbol` indents nested symbols.
