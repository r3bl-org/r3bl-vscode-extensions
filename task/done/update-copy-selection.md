# Task: Update Copy Selection Path and Range to Standard Compiler Syntax

## Objective

Update the `r3bl-copy-selection-path-and-range` extension to use standard compiler syntax
(`path:line` or `path:start-end`) without the `@` prefix for copied file paths and
selection ranges.

---

## Background & Specifications

### Current Behavior

- Multi-line selection: `@path/to/file.rs#L500-506`
- Single-line or no selection: `path/to/file.rs:500`

### New Behavior

Standard compiler syntax:

- Multi-line selection: `path/to/file.rs:500-506`
- Single-line or no selection: `path/to/file.rs:500`
- Outside workspace multi-line: `/abs/path/to/file.rs:500-506`
- Outside workspace single-line: `/abs/path/to/file.rs:500`

No `@` prefix is used in any mode.

---

## Files to Modify

| File                                                           | Changes                                                                   |
| :------------------------------------------------------------- | :------------------------------------------------------------------------ |
| `packages/r3bl-copy-selection-path-and-range/src/extension.ts` | Update `calculateLineRange` and `handleCopyPathAndRange` formatting logic |
| `packages/r3bl-copy-selection-path-and-range/package.json`     | Increment version (`1.4.1` → `1.5.0`) and update description              |
| `packages/r3bl-extension-pack/package.json`                    | Increment version (`1.3.29` → `1.3.30`)                                   |
| `packages/r3bl-copy-selection-path-and-range/README.md`        | Update documentation and examples to match compiler syntax                |
| `packages/r3bl-extension-pack/README.md`                       | Update table description if needed                                        |
| `CHANGELOG.md`                                                 | Document changes under `[2026-10-01]`                                     |

---

## Implementation Steps

### Step 1: Update Extension Logic (`src/extension.ts`)

- [x] Update `calculateLineRange(selection: vscode.Selection)`:
    - If `startLine !== endLine`: return `:${startLine}-${endLine}`
    - If `startLine === endLine`: return `:${startLine}`
- [x] Update `handleCopyPathAndRange()`:
    - Format output string as `${normalizedPath}${lineRange}` without `@` prefix.
- [x] Confirm `showCopyHistory()` continues to function with new format.

### Step 2: Update Package Metadata

- [x] In `packages/r3bl-copy-selection-path-and-range/package.json`:
    - Bump `version` from `1.4.1` to `1.5.0`.
    - Update `description` to reflect standard compiler syntax (`path:line` or
      `path:start-end`).
- [x] In `packages/r3bl-extension-pack/package.json`:
    - Bump `version` from `1.3.29` to `1.3.30`.

### Step 3: Update Documentation

- [x] In `packages/r3bl-copy-selection-path-and-range/README.md`:
    - Replace `@path#Lstart-end` examples and descriptions with `path:start-end`.
    - Update features list to highlight standard compiler syntax.
- [x] In `packages/r3bl-extension-pack/README.md`:
    - Update table/features description for `r3bl-copy-selection-path-and-range`.
- [x] In `CHANGELOG.md`:
    - Add new entry for `[2026-10-01]` with version bumps and detailed changes.

### Step 4: Build & Packaging

- [x] Run `./build.sh r3bl-copy-selection-path-and-range r3bl-extension-pack`.
- [x] Verify that webpack compiles cleanly without warnings or errors.
- [x] Verify that new `.vsix` packages are generated and old `.vsix` files are removed.

### Step 5: Verification & Installation

- [x] Run `./install.sh` to install updated extensions locally.
- [x] Test in editor:
    - Single-line selection / cursor copy (`Alt+O`).
    - Multi-line selection copy (`Alt+O`).
    - Copy history display and navigation (`Alt+Shift+O`).
