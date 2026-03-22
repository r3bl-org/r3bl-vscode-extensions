# Plan: Markdown Heading Folding and Navigator (Merged into Semantic Config)

## Overview

Instead of creating a new extension, we will add enhanced Markdown folding and
navigation capabilities to the existing `r3bl-semantic-config` extension. This creates a
unified documentation and navigation experience for both Rust and Markdown.

### Added Features:
1. **Markdown Hierarchical Folding**: Precise control over folding regions based on
   Markdown heading levels (H1-H6).
2. **Global Markdown Commands**: `Ctrl+-` and `Ctrl+=` to fold/unfold all Markdown
   headings instantly.
3. **Markdown Structure Navigator**: A QuickPick-based TOC navigator (`Ctrl+Shift+Y`) for
   Markdown files, identical in UX to the Rustdoc Structure Navigator.

---

## Configuration & Setting Resilience

In some environments, built-in Markdown heading folding is missing because of the
following setting in `settings.json`:

```json
"editor.foldingStrategy": "indentation"
```

This strategy ignores language-aware folding (like headings) and only folds based on
indentation. Since headings are typically at column 0, they are never folded.

### Technical Note on Setting Dependency:
- **Gutter Arrows**: VSCode's visual folding controls (arrows) still depend on the
  `auto` strategy to correctly display for headings.
- **R3BL Commands**: The `Ctrl+-` and `Ctrl+=` commands are **imperative**—they
  calculate ranges and force the editor to fold them. This means the R3BL commands will
  work **even if the user has the "wrong" setting**, providing a resilient way to
  access a TOC view in any environment.

---

## Files to Modify in `packages/r3bl-semantic-config/`

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | **Modify** | Add Markdown commands, keybindings, and activation events |
| `src/extension.ts` | **Modify** | Register Markdown providers and commands |
| `src/markdownFolding.ts` | **Create** | Logic for parsing Markdown headings and creating folding ranges |
| `src/markdownNavigator.ts` | **Create** | Logic for the Markdown TOC QuickPick navigator |
| `src/__tests__/markdownFolding.test.ts` | **Create** | Unit tests for Markdown heading parsing and range calculation |

---

## Step 1: Update `package.json`

### 1a. Activation Events
Add `onLanguage:markdown` to ensure features work immediately upon opening a `.md` file.

### 1b. Commands
```json
{
    "command": "r3bl-semantic-config.foldMarkdownHeadings",
    "title": "Fold All Markdown Headings",
    "category": "R3BL"
},
{
    "command": "r3bl-semantic-config.unfoldMarkdownHeadings",
    "title": "Unfold All Markdown Headings",
    "category": "R3BL"
},
{
    "command": "r3bl-semantic-config.navigateMarkdown",
    "title": "Navigate Markdown Structure",
    "category": "R3BL"
}
```

### 1c. Keybindings
- `Ctrl+-` for `foldMarkdownHeadings` (when `editorLangId == markdown`)
- `Ctrl+=` for `unfoldMarkdownHeadings` (when `editorLangId == markdown`)
- `Ctrl+Shift+Y` for `navigateMarkdown` (when `editorLangId == markdown`)

---

## Step 2: Implement Logic

### 2a. `src/markdownFolding.ts`
- **Parser**: Detects `#` headings while ignoring those inside fenced code blocks.
- **Provider**: Registers a `FoldingRangeProvider` for Markdown.
- **Commands**: Implements `foldAllMarkdownHeadings` and `unfoldAllMarkdownHeadings`.

### 2b. `src/markdownNavigator.ts`
- **QuickPick**: Builds an indented list of headings.
- **Navigation**: Jumps to the selected line and reveals it.

---

## Step 3: Registration in `extension.ts`

```typescript
// Register Markdown Folding
context.subscriptions.push(
    vscode.languages.registerFoldingRangeProvider(
        { language: 'markdown' },
        new MarkdownFoldingProvider()
    )
);

// Register Commands
context.subscriptions.push(
    vscode.commands.registerCommand('r3bl-semantic-config.foldMarkdownHeadings', foldAllMarkdownHeadings),
    vscode.commands.registerCommand('r3bl-semantic-config.unfoldMarkdownHeadings', unfoldAllMarkdownHeadings),
    vscode.commands.registerCommand('r3bl-semantic-config.navigateMarkdown', navigateMarkdownHeadings)
);
```

---

## Step 4: Verification Plan

1. **Unit Tests**: Verify that the parser correctly identifies H1-H6 and ignores code blocks.
2. **Manual Test**:
   - Open a Rust file → `Ctrl+Shift+Y` shows Rustdoc TOC.
   - Open a Markdown file → `Ctrl+Shift+Y` shows Markdown TOC.
   - Verify `Ctrl+-` works in both contexts with appropriate status bar feedback.

---

## Design Decisions

- **Why merge?** Rust and Markdown are fundamentally linked in the developer workflow (docs, readmes, books). A unified extension provides a more cohesive "Language & Doc Configuration" experience.
- **Dependency Note**: While `r3bl-semantic-config` depends on `rust-analyzer`, this is acceptable in this monorepo's context as users of the R3BL suite typically have the full toolchain installed.
