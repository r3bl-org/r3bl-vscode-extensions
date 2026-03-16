# Task: Add Rust Use Statements Folding Provider and Unit Tests

## Summary

Add a new feature to r3bl-semantic-config that detects all `use` statements at the top of
Rust files and exposes them as a single foldable region. Also set up Jest test
infrastructure and add unit tests for all pure functions in the extension.

## Scope

### New Feature: Rust Use Statements Folding

**Goal:** Collapse all `use`/import statements at the very top of each Rust file into one
foldable section.

**Detection logic — `findImportBlock(document)` function:**

- Scan from line 0, skipping preamble:
    - Blank lines
    - Module-level doc comments (`//!`)
    - Inner attributes (`#![...]`)
    - Regular comments (`//`)
- Once the first `use` line is found, mark it as block start
- Continue through:
    - Single-line `use foo::bar;`
    - Multi-line `use` with braces spanning lines (track brace depth)
    - Blank lines between use groups (common Rust formatting)
- Block ends at the first non-use, non-blank, non-comment line after seeing `use`
- **Minimum 2 lines** to create a fold region (single `use` line is not worth folding)
- **Top-of-file only** — `use` statements in inner modules or test blocks are ignored

**Provider:** `RustUseStatementsFoldingProvider` implements `FoldingRangeProvider`, uses
`FoldingRangeKind.Imports`.

**Integration with existing commands:**

- `foldAllRustdocs` (`Ctrl+-`) also folds the import block
- `unfoldAllRustdocs` (`Ctrl+=`) also unfolds the import block
- Status message updates: "Folded 5 rustdoc blocks + imports in filename.rs"
- Auto-fold on open also folds imports (when enabled)

**No new commands or keybindings needed** — imports fold/unfold together with rustdocs via
existing commands, and VSCode's native folding handles the gutter arrow.

### New Test Infrastructure: Jest

**Setup:**

- Add `jest`, `ts-jest`, `@types/jest` as devDependencies
- Add `jest.config.js` with `moduleNameMapper` to mock the `vscode` module
- Add `"test"` script to `package.json`

**Shared helper:** `src/__tests__/unitTestFixtures.ts`

- `mockDocument(lines: string[])` — creates a fake `TextDocument` with `lineCount` and
  `lineAt(n).text`

### Unit Tests for All Pure Functions

**Test files:**

```
src/__tests__/
├── unitTestFixtures.ts                    # shared mockDocument helper
├── rustUseStatementsFolding.test.ts       # new import block detection
├── rustdocFolding.test.ts                 # existing rustdoc block detection
└── rustdocNavigator.test.ts               # headings, labels, link ref defs, containing block
```

**`rustUseStatementsFolding.test.ts`** — tests for `findImportBlock`:

- Standard contiguous `use` block
- Multi-line `use` with braces spanning lines
- `use` after `//!` module docs
- `use` after `#![...]` inner attributes
- Blank lines between `use` groups
- File with no `use` statements → returns null
- Single `use` line → returns null (minimum 2 lines)
- `use` statements mid-file (inner modules) → ignored, returns only top-of-file block
- `use` after regular `//` comments in preamble

**`rustdocFolding.test.ts`** — tests for `findRustdocBlocks`:

- `///` item-level blocks
- `//!` module-level blocks
- Mixed `///` and `//!` blocks (separate blocks)
- Regular `//` comments ignored
- Consecutive vs separated blocks
- Empty file → empty array

**`rustdocNavigator.test.ts`** — tests for navigator pure functions:

- `findHeadingsInBlock`: `#` through `######`, `///` vs `//!` prefix, lines with no
  heading, empty blocks
- `getBlockLabel`: block with heading, block without heading (falls back to first
  content), empty block, truncation at 60 chars
- `findLinkRefDefsStart`: link ref defs at bottom, indented continuations, no link ref
  defs, mixed content
- `findContainingBlock`: cursor inside, cursor outside, cursor between blocks, empty
  blocks array

**Export changes:** `findHeadingsInBlock`, `getBlockLabel`, `findLinkRefDefsStart`, and
`findContainingBlock` in `rustdocNavigator.ts` need `export` added (currently
module-private).

## Files to Create

| File                                             | Purpose                                                  |
| ------------------------------------------------ | -------------------------------------------------------- |
| `src/rustUseStatementsFolding.ts`                | `findImportBlock()` + `RustUseStatementsFoldingProvider` |
| `src/__tests__/unitTestFixtures.ts`              | Shared `mockDocument` helper                             |
| `src/__tests__/rustUseStatementsFolding.test.ts` | Tests for import block detection                         |
| `src/__tests__/rustdocFolding.test.ts`           | Tests for rustdoc block detection                        |
| `src/__tests__/rustdocNavigator.test.ts`         | Tests for navigator pure functions                       |
| `jest.config.js`                                 | Jest config with vscode module mock                      |

## Files to Modify

| File                                        | Change                                                          |
| ------------------------------------------- | --------------------------------------------------------------- |
| `src/rustdocFolding.ts`                     | Fold/unfold functions also handle import block                  |
| `src/rustdocNavigator.ts`                   | Add `export` to 4 pure functions for testability                |
| `src/extension.ts`                          | Register `RustUseStatementsFoldingProvider`                     |
| `package.json`                              | Version bump 1.2.3 → 1.2.4, add Jest devDeps, add test script   |
| `README.md`                                 | Document import folding behavior                                |
| `CHANGELOG.md`                              | New entry                                                       |
| `packages/r3bl-extension-pack/package.json` | Version bump                                                    |
| `build.sh`                                  | Add `npm test` step for r3bl-semantic-config before packaging   |
| `CLAUDE.md`                                 | Add unit testing to workflow checklists and build documentation |

## Build Pipeline Integration

### `build.sh` changes

Add `npm test` to the r3bl-semantic-config build section, **after compile and before
packaging**. Tests must pass or the build fails (`set -e` is already in effect).

Current:

```bash
cd packages/r3bl-semantic-config
npm install
npm run compile
vsce package --no-dependencies
```

Updated:

```bash
cd packages/r3bl-semantic-config
npm install
npm run compile
npm test
vsce package --no-dependencies
```

This ensures broken detection logic is caught before a `.vsix` is ever produced.

### `CLAUDE.md` changes

**1. "Build and Package Commands" section** — add test commands:

```bash
# Run unit tests (for extensions that have them):
npm run test:semantic-config

# Or from within the extension directory:
cd packages/r3bl-semantic-config && npm test
```

**2. "Quick Workflow Checklist — When modifying an extension"** — add test step:

```
- [ ] Run `npm test` in the extension directory (if tests exist)
```

**3. "For Maintainers" section** — mention that `./build.sh` now runs tests automatically
for extensions that have them.

**4. "Modifying Existing Extensions" section** — add a note after "Build and Generate
Artifacts" mentioning that `./build.sh` runs tests as part of the build, and failures
block packaging.

## Implementation Order

### Phase 1: Implement and test

1. Set up Jest infrastructure (config, devDeps, mock helper)
2. Add `export` to 4 functions in `rustdocNavigator.ts`
3. Write tests for existing pure functions (`rustdocFolding.test.ts`,
   `rustdocNavigator.test.ts`) — verify they pass
4. Implement `findImportBlock()` + `RustUseStatementsFoldingProvider` in
   `src/rustUseStatementsFolding.ts`
5. Write tests for `findImportBlock` (`rustUseStatementsFolding.test.ts`) — verify they
   pass
6. Integrate into `rustdocFolding.ts` fold/unfold functions
7. Register provider in `extension.ts`
8. Update `build.sh` — add `npm test` step for r3bl-semantic-config
9. Update `CLAUDE.md` — add unit testing to workflow checklists and build docs
10. Build the extension and force install into VSCode Insiders for manual testing

**Alert user for manual testing:** Run `fish -c "beep"` to notify that Phase 1 is complete
and manual testing is needed.

### Phase 2: After manual testing passes

11. Bump versions in `packages/r3bl-semantic-config/package.json` (1.2.3 → 1.2.4) and
    `packages/r3bl-extension-pack/package.json`
12. Update `CHANGELOG.md`
13. Update `README.md`
14. Run `./build.sh` and `./install.sh` to build and install all extensions locally into
    all 4 IDEs
15. Commit changes (no AI attribution)
16. Run `fish -c "beep"` to alert user, then ask for permission before publishing
    `r3bl-semantic-config` and `r3bl-extension-pack` to both marketplaces (Microsoft VS
    Marketplace and Open VSX)
17. Run `fish -c "beep"` to alert user, then prompt to push the commit to GitHub
