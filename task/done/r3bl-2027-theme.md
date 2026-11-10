# Task Plan: R3BL 2027 Theme, Bundled Icons & Shared Theme Build Pipeline

## Overview

This task introduces the **R3BL 2027 Theme** family (frozen from the user's configured Catppuccin Mocha setup + R3BL hybrid customizations), bundles the **R3BL 2027 Icons** file icon theme inside `r3bl-theme`, adds programmatic icon theme activation in `r3bl-semantic-config`, and refactors our theme architecture to eliminate manual duplication across all 3 theme editions (6 generated JSON variants).

### Key Goals

1. **R3BL 2027 Theme & R3BL 2027 Theme (No Italic)**:
   - Freeze the user's compiled Catppuccin Mocha setup (`italicComments: false`, `italicKeywords: false`, `workbenchMode: "default"`, `bracketMode: "neovim"` rainbow brackets).
   - Overlay R3BL's pill-tinted **Inlay Hint** colors, **ErrorLens** foreground colors, default **Dim** (`#8B949E`) comment foreground, and **R3BL Semantic Token** rules (italic and non-italic variants).
2. **Bundled `R3BL 2027 Icons` + Programmatic Switching**:
   - Vendor Catppuccin Mocha's static SVG icon theme (`theme.json` + SVGs) into `packages/r3bl-theme/icons/r3bl-2027-icons/` under id `r3bl-2027-icons` (`R3BL 2027 Icons`), with full MIT attribution.
   - When the user selects `R3BL 2027 Theme` or `R3BL 2027 Theme (No Italic)`, `r3bl-semantic-config` automatically sets `workbench.iconTheme` to `"r3bl-2027-icons"`. When switching away to any other theme, `workbench.iconTheme` is left untouched.
3. **Comment Brightness Across All 6 Themes**:
   - Extend `r3bl.commentBrightness` (`dim`, `medium`, `bright`) and `R3BL: Set Comment Brightness...` to manage all 3 theme families (6 variants total).
4. **Maintainable Single-Source-of-Truth Pipeline**:
   - Centralize shared theme names, icon IDs, inlay hint colors, ErrorLens colors, comment scopes/colors, and semantic token rules in `packages/r3bl-common-code/src/themeConstants.ts`.
   - Store the 3 full source editions in `packages/r3bl-theme/src/editions/` and generate all 6 `packages/r3bl-theme/themes/*.json` files deterministically during `./build.sh` via `generateThemes.ts` (with Jest unit tests).

---

## Architecture & Pipeline

```text
  packages/r3bl-theme/src/editions/ (3 full source themes — edited by humans)
  ├── r3bl-theme.edition.jsonc   (Classic R3BL Theme)
  ├── r3bl-2026.edition.json     (R3BL 2026 Theme)
  └── r3bl-2027.edition.json     (Frozen Catppuccin Mocha + Neovim rainbow brackets)
                 │
                 │  +  packages/r3bl-common-code/src/themeConstants.ts (Shared R3BL overlays)
                 │     • SHARED_INLAY_HINT_COLORS (6 editorInlayHint.* keys)
                 │     • SHARED_ERROR_LENS_COLORS (4 errorLens.* keys)
                 │     • COMMENT_COLORS.dim (#8B949E) + COMMENT_SCOPES
                 │     • SEMANTIC_RULES_ITALIC / SEMANTIC_RULES_NO_ITALIC
                 ▼
        generateThemes.ts  (stamps shared overlays + strips italics for No-Italic twin)
                 │
        ┌────────┴────────────────────────────────────────┐
        ▼                                                 ▼
  themes/ (Italic outputs)                         themes/ (No-Italic outputs)
  • r3bl-theme-color-theme.json                    • r3bl-theme-no-italic-color-theme.json
  • r3bl-2026-theme.json                           • r3bl-2026-theme-no-italic.json
  • r3bl-2027-theme.json                           • r3bl-2027-theme-no-italic.json
```

### Shared Color Specifications (`themeConstants.ts`)

#### 1. Shared Inlay Hint Colors (Applied to all 6 generated themes)

| Key | Hex | Purpose |
| :--- | :--- | :--- |
| `editorInlayHint.background` | `#4cb2a933` | General inlay hint pill background |
| `editorInlayHint.foreground` | `#ced491ee` | General inlay hint text |
| `editorInlayHint.parameterBackground` | `#3068ab33` | Parameter inlay hint pill background |
| `editorInlayHint.parameterForeground` | `#48acccee` | Parameter inlay hint text |
| `editorInlayHint.typeBackground` | `#6b356c33` | Type inlay hint pill background |
| `editorInlayHint.typeForeground` | `#f2d1f2cc` | Type inlay hint text |

#### 2. Shared ErrorLens Colors (Applied to all 6 generated themes)

| Key | Hex |
| :--- | :--- |
| `errorLens.errorForeground` | `#febbf3` |
| `errorLens.warningForeground` | `#f4d29f` |
| `errorLens.infoForeground` | `#96dcff` |
| `errorLens.hintForeground` | `#c1ffc1` |

#### 3. Neovim Rainbow Bracket Colors (Frozen in `r3bl-2027.edition.json`)

| Key | Hex |
| :--- | :--- |
| `editorBracketHighlight.foreground1` | `#f38ba8` |
| `editorBracketHighlight.foreground2` | `#94e2d5` |
| `editorBracketHighlight.foreground3` | `#f9e2af` |
| `editorBracketHighlight.foreground4` | `#89b4fa` |
| `editorBracketHighlight.foreground5` | `#f5c2e7` |
| `editorBracketHighlight.foreground6` | `#f2cdcd` |
| `editorBracketHighlight.unexpectedBracket.foreground` | `#eba0ac` |

*(Note: Bracket behavior settings `editor.bracketPairColorization.independentColorPoolPerBracketType` and `editor.guides.bracketPairs` are intentionally **not** placed in `configurationDefaults` to avoid global side effects across non-R3BL themes; they will be documented as an optional snippet in `packages/r3bl-theme/README.md`.)*

---

## Files to Create / Modify

| File | Action | Description |
| :--- | :--- | :--- |
| `task/r3bl-2027-theme.md` | **Create** | This task specification and tracking checklist |
| `packages/r3bl-common-code/src/themeConstants.ts` | **Create** | Pure-data shared theme names, icon ID, inlay hint colors, ErrorLens colors, comment constants, and semantic token rules (zero `vscode` imports) |
| `packages/r3bl-common-code/src/index.ts` | **Modify** | Re-export `themeConstants` for VS Code extensions |
| `packages/r3bl-common-code/package.json` | **Modify** | Bump version (`1.0.0` → `1.1.0`) |
| `packages/r3bl-theme/src/editions/r3bl-theme.edition.jsonc` | **Create** | Source edition for Classic R3BL Theme |
| `packages/r3bl-theme/src/editions/r3bl-2026.edition.json` | **Create** | Source edition for R3BL 2026 Theme |
| `packages/r3bl-theme/src/editions/r3bl-2027.edition.json` | **Create** | Source edition frozen from compiled Catppuccin Mocha `mocha.json` |
| `packages/r3bl-theme/src/generateThemes.ts` | **Create** | Build-time generator stamping shared constants & emitting all 6 Italic / `(No Italic)` JSONs |
| `packages/r3bl-theme/src/__tests__/generateThemes.test.ts` | **Create** | Jest tests validating generated themes, shared overlays, zero italics in `(No Italic)`, sync check, and bundled icon paths |
| `packages/r3bl-theme/tsconfig.json` & `jest.config.js` | **Create** | TypeScript & Jest configuration for `r3bl-theme` generator and tests |
| `packages/r3bl-theme/icons/r3bl-2027-icons/**` | **Create** | Frozen Catppuccin Mocha `theme.json` + SVG icons |
| `packages/r3bl-theme/themes/r3bl-2027-theme.json` | **Create** | Generated R3BL 2027 Theme |
| `packages/r3bl-theme/themes/r3bl-2027-theme-no-italic.json` | **Create** | Generated R3BL 2027 Theme (No Italic) |
| `packages/r3bl-theme/themes/r3bl-*.json` (existing 4) | **Modify** | Regenerated deterministically via `generateThemes.ts` |
| `packages/r3bl-theme/package.json` | **Modify** | Add 2027 themes, `r3bl-2027-icons` iconTheme, `build`/`test` scripts, devDependencies; bump version (`1.0.43` → `1.1.0`) |
| `packages/r3bl-theme/.vscodeignore` | **Modify** | Include `!icons/` & `!icons/**`; exclude `src/`, `dist/`, `tsconfig.json`, `jest.config.js`, `node_modules/` |
| `packages/r3bl-theme/LICENSE` & `README.md` | **Modify** | Add MIT attributions for Catppuccin Mocha & Catppuccin Icons; document 2027 theme, icons, and optional bracket settings |
| `packages/r3bl-semantic-config/src/commentBrightness.ts` | **Modify** | Import shared constants from `r3bl-common-code` (supporting all 6 themes) |
| `packages/r3bl-semantic-config/src/extension.ts` | **Modify** | Import shared constants; programmatically set `workbench.iconTheme` to `r3bl-2027-icons` when switching to `R3BL 2027 Theme` or `(No Italic)` |
| `packages/r3bl-semantic-config/src/__tests__/commentBrightness.test.ts` | **Modify** | Update tests from 4 to 6 R3BL themes |
| `packages/r3bl-semantic-config/src/__tests__/iconThemeSwitch.test.ts` | **Create** | Unit tests for `isR3BL2027Theme` and programmatic `workbench.iconTheme` switching |
| `packages/r3bl-semantic-config/package.json` | **Modify** | Bump version (`1.3.2` → `1.4.0`) |
| `packages/r3bl-extension-pack/package.json` | **Modify** | Bump version (`1.4.6` → `1.5.0`) |
| `build.sh` | **Modify** | Compile `r3bl-common-code` first; run `npm install`, `npm run build`, and `npm test` for `r3bl-theme` |
| `README.md`, `packages/r3bl-extension-pack/README.md`, `CHANGELOG.md` | **Modify** | Document new 2027 themes, bundled icons, and version bumps (no TOCs) |

---

## Implementation Checklist

### Phase 1: Shared Constants in `r3bl-common-code` & Build Script Setup
- [x] Create `packages/r3bl-common-code/src/themeConstants.ts` with zero `vscode` imports:
  - `ITALIC_THEMES`, `NO_ITALIC_THEMES`, `ALL_R3BL_THEMES` (all 6 theme names)
  - `R3BL_2027_THEMES` and `R3BL_2027_ICON_THEME_ID` (`"r3bl-2027-icons"`)
  - `SHARED_INLAY_HINT_COLORS` and `SHARED_ERROR_LENS_COLORS`
  - `COMMENT_COLORS`, `COMMENT_DESCRIPTIONS`, `COMMENT_SCOPES`, `CommentBrightnessLevel`
  - `BASE_SEMANTIC_RULES`, `SEMANTIC_RULES_ITALIC`, `SEMANTIC_RULES_NO_ITALIC`
- [x] Re-export `./themeConstants` from `packages/r3bl-common-code/src/index.ts` and compile `r3bl-common-code`.
- [x] Update `build.sh`:
  - Compile `packages/r3bl-common-code` at the start of the build so `dist/` is never stale.
  - Update the `r3bl-theme` build step to run `[ ! -d "node_modules" ] && npm install`, `npm run build`, and `npm test` before `vsce package`.

### Phase 2: Theme Generator, 2027 Theme & Bundled Icons in `r3bl-theme`
- [x] Copy existing `themes/r3bl-theme-color-theme.json` → `src/editions/r3bl-theme.edition.jsonc`.
- [x] Copy existing `themes/r3bl-2026-theme.json` → `src/editions/r3bl-2026.edition.json`.
- [x] Copy compiled Catppuccin Mocha `mocha.json` → `src/editions/r3bl-2027.edition.json`.
- [x] Vendor Catppuccin Mocha icons (`dist/mocha/theme.json` + `dist/mocha/icons/`) → `packages/r3bl-theme/icons/r3bl-2027-icons/`.
- [x] Configure `tsconfig.json`, `jest.config.js`, and `package.json` (`r3bl-common-code` dependency + TypeScript/Jest devDependencies, `build` and `test` scripts, `contributes.themes` and `contributes.iconThemes`).
- [x] Implement `packages/r3bl-theme/src/generateThemes.ts`:
  - Parse JSON/JSONC source editions.
  - Stamp `SHARED_INLAY_HINT_COLORS` and `SHARED_ERROR_LENS_COLORS` onto `colors`.
  - Normalize default comment rule in `tokenColors` to `COMMENT_COLORS.dim` (`#8B949E`, `fontStyle: ""`).
  - Merge `SEMANTIC_RULES_ITALIC` / `SEMANTIC_RULES_NO_ITALIC` onto `semanticTokenColors`.
  - Strip all `italic` tokens from `fontStyle` across `tokenColors` and `semanticTokenColors` for each `(No Italic)` output.
  - Write all 6 files into `packages/r3bl-theme/themes/`.
- [x] Update `packages/r3bl-theme/.vscodeignore` so `.vsix` includes `themes/**` and `icons/**` and excludes build/test sources (`src/`, `dist/`, `node_modules/`, configs).
- [x] Add MIT license notices for `catppuccin/vscode` and `catppuccin/vscode-icons` to `packages/r3bl-theme/LICENSE`.
- [x] Write Jest tests in `packages/r3bl-theme/src/__tests__/generateThemes.test.ts` verifying:
  - All 6 generated theme files match generator output (drift check).
  - Shared inlay hints, ErrorLens colors, and default comment rules are present in all 6 files.
  - Zero `"italic"` fontStyles appear anywhere in the 3 `(No Italic)` files.
  - `R3BL 2027 Theme` preserves Mocha workbench & Neovim rainbow bracket colors.
  - All icon definitions in `icons/r3bl-2027-icons/theme.json` point to existing `.svg` files.

### Phase 3: `r3bl-semantic-config` Updates & Unit Tests
- [x] Update `packages/r3bl-semantic-config/src/commentBrightness.ts` to consume shared constants from `r3bl-common-code` (supporting all 6 themes).
- [x] Update `packages/r3bl-semantic-config/src/extension.ts`:
  - Consume theme lists and semantic rules from `r3bl-common-code`.
  - Add helper to programmatically set `workbench.iconTheme` to `"r3bl-2027-icons"` when activating or switching to `R3BL 2027 Theme` or `R3BL 2027 Theme (No Italic)` (and leave `workbench.iconTheme` unchanged when switching to other themes).
- [x] Update `commentBrightness.test.ts` for all 6 themes and add `iconThemeSwitch.test.ts`.

### Phase 4: Local Build, Install & Manual Verification in VS Code
- [x] Run `./build.sh` and verify all unit tests pass and `.vsix` contents are clean (`unzip -l` check on `r3bl-theme`).
- [x] Run `./install.sh` to install locally across editors.
- [x] **Pause for User Manual Testing in VS Code**:
  - Verify `R3BL 2027 Theme` and `R3BL 2027 Theme (No Italic)` visuals (Mocha UI, Neovim rainbow brackets, R3BL inlay hints, ErrorLens colors, R3BL semantic tokens).
  - Verify selecting `R3BL 2027 Theme` (or `No Italic`) automatically switches `workbench.iconTheme` to `R3BL 2027 Icons`, and switching to `R3BL 2026 Theme` leaves `workbench.iconTheme` untouched.
  - Verify `R3BL: Set Comment Brightness...` (`dim` / `medium` / `bright`) works across all 6 themes (`R3BL Theme`, `R3BL 2026 Theme`, `R3BL 2027 Theme`, and their `(No Italic)` variants).

### Phase 5: Version Bumps, Documentation & Final Rebuild
- [x] Bump package versions (after manual testing passes):
  - `packages/r3bl-common-code/package.json`: `1.0.0` → `1.1.0`
  - `packages/r3bl-theme/package.json`: `1.0.43` → `1.1.0`
  - `packages/r3bl-semantic-config/package.json`: `1.3.2` → `1.4.0`
  - `packages/r3bl-extension-pack/package.json`: `1.4.6` → `1.5.0`
- [x] Update documentation (no Table of Contents / never run `doctoc` or `mktoc`):
  - `packages/r3bl-theme/README.md` (document 2027 themes, `R3BL 2027 Icons`, Catppuccin attributions, and optional rainbow bracket guide settings snippet)
  - `packages/r3bl-semantic-config/README.md` (document 2027 theme support & automatic icon theme activation)
  - `packages/r3bl-extension-pack/README.md` (update included theme/icon features)
  - Root `README.md`
  - `CHANGELOG.md` (prepend release entry with old → new versions and user-facing summary)
- [x] Re-run `./build.sh` and `./install.sh` so versioned `.vsix` artifacts match the bumped `package.json` versions and old `.vsix` files are cleaned up.

### Phase 6: Git Commit, Push to Origin & Marketplace Publishing
- [x] Move completed task file to `task/done/r3bl-2027-theme.md` using `git mv`.
- [x] Stage all modified/created files and create a clean release commit (strictly **no** AI attribution / `Co-Authored-By` lines).
- [x] Push commit to GitHub `origin` (`git push`).
- [x] Publish all modified marketplace extensions to both VS Marketplace and Open VSX:
  ```bash
  ./publish.sh r3bl-theme r3bl-semantic-config r3bl-extension-pack
  ```
