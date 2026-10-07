# Task Plan: Comment Brightness Levels & 2026 Editor Dark Background

## Overview

This task covers two refinements for the R3BL theme suite:
1. **Comment Brightness Levels (All 4 Themes)**:
   Provide 3 selectable comment brightness levels across all 4 R3BL themes:
   - **R3BL Theme**
   - **R3BL Theme (No Italic)**
   - **R3BL 2026 Theme**
   - **R3BL 2026 Theme (No Italic)**
   Defaulting to **Dim** (`#8B949E`) out of the box, with dynamic selection via settings and commands (`dim`, `medium`, `bright`).

2. **Darker Editor Background for R3BL 2026 Themes**:
   Update the editor panel background of both 2026 themes (**R3BL 2026 Theme** and **R3BL 2026 Theme (No Italic)**) to **`#0e0f10`** (matching the VS Code 2026 Dark+ theme sampled by the user).

---

## Specifications

### 1. Comment Brightness Levels

| Level | Foreground Color | Description & Source | Contrast on `#0e0f10` |
| :--- | :--- | :--- | :--- |
| **`dim`** *(Default)* | `#8B949E` | Cool slate gray *(GitHub Dark `fg.muted` style)* | ~6.4 : 1 (Soft, eye comfort) |
| **`medium`** | `#ABACAC` | Neutral silver gray *(Breadcrumb / tab style)* | ~8.6 : 1 (Balanced, daylight-friendly) |
| **`bright`** | `#E8DCF4` | Vibrant lavender *(Original R3BL signature)* | ~15.2 : 1 (High-contrast, prominent) |

### 2. Editor Background for R3BL 2026 Themes

- **Target Color**: **`#0e0f10`**
- **Affected Themes**:
  - `packages/r3bl-theme/themes/r3bl-2026-theme.json`
  - `packages/r3bl-theme/themes/r3bl-2026-theme-no-italic.json`
- **Keys Updated**:
  - `editor.background`: `#0e0f10`
  - `editorGutter.background`: `#0e0f10`
  - `breadcrumb.background`: `#0e0f10`
  - `editorStickyScroll.background`: `#0e0f10`
  - `tab.activeBackground`: `#0e0f10`
  - `tab.hoverBackground`: `#0e0f10`
  - `editorGroupHeader.noTabsBackground`: `#0e0f10` *(Fixes background bleed when tabs are hidden)*
  - `agents.background`: `#0e0f10`
  - `sideBar.background`: `#0e0f10` *(Matches left side panel to editor panel)*
  - `sideBarSectionHeader.background`: `#0e0f10`
  - `activityBar.background`: `#0e0f10`
  - `agentsPanel.background`: `#0e0f10`

---

## Architectural Separation of Concerns

### 1. `packages/r3bl-theme` (Static Theme Definitions)
- Pure theme package (no executable TypeScript code).
- Sets the default comment foreground to **`#8B949E`** (Dim) across all 4 theme JSON files:
  - `themes/r3bl-theme-color-theme.json`
  - `themes/r3bl-theme-no-italic-color-theme.json`
  - `themes/r3bl-2026-theme.json`
  - `themes/r3bl-2026-theme-no-italic.json`
- Sets the editor background to **`#0e0f10`** in:
  - `themes/r3bl-2026-theme.json`
  - `themes/r3bl-2026-theme-no-italic.json`
- Ensures that on fresh installs or when no overrides exist, comments are soft slate gray and the 2026 editor background is `#0e0f10` out of the box with zero `settings.json` pollution.

### 2. `packages/r3bl-semantic-config` (Runtime Settings & Commands)
- Companion extension automatically installed via `extensionDependencies`.
- Already owns theme change listeners (`workbench.colorTheme`), active theme lists (`ALL_R3BL_THEMES`), and configuration management.
- Contributes setting `r3bl.commentBrightness` (`"dim" | "medium" | "bright"`, default `"dim"`).
- Contributes command:
  - `r3bl-semantic-config.setCommentBrightness` (`R3BL: Set Comment Brightness...`): Shows QuickPick with level descriptions and instant preview.
- Dynamically applies `editor.tokenColorCustomizations` targeting all 4 R3BL theme names:
  ```json
  "editor.tokenColorCustomizations": {
      "[R3BL Theme]": { "comments": "<color>", "textMateRules": [...] },
      "[R3BL Theme (No Italic)]": { "comments": "<color>", "textMateRules": [...] },
      "[R3BL 2026 Theme]": { "comments": "<color>", "textMateRules": [...] },
      "[R3BL 2026 Theme (No Italic)]": { "comments": "<color>", "textMateRules": [...] }
  }
  ```
- Scoping customizations per theme name ensures non-R3BL themes (e.g., Default Dark Modern) are never affected.
- Integrates with `applySemanticConfig()` so token customizations are preserved/updated in sync rather than wiped out.

---

## Implementation Steps

### Step 1: Update Base Themes in `packages/r3bl-theme`
- [x] In `themes/r3bl-2026-theme.json`:
  - Update `editor.background` to `#0e0f10`.
  - Update `editorGutter.background` to `#0e0f10`.
  - Update `breadcrumb.background` to `#0e0f10`.
  - Update `editorStickyScroll.background` to `#0e0f10`.
  - Update `tab.activeBackground` to `#0e0f10`.
  - Update `tab.hoverBackground` to `#0e0f10`.
  - Add `editorGroupHeader.noTabsBackground`: `#0e0f10`.
  - Update `agents.background` to `#0e0f10`.
  - Update comment foregrounds to `#8B949E`.
- [x] In `themes/r3bl-2026-theme-no-italic.json`:
  - Apply the matching editor background changes (`#0e0f10`).
  - Update comment foregrounds to `#8B949E`.
- [x] In `themes/r3bl-theme-color-theme.json`:
  - Update comment foregrounds from `#E8DCF4` to `#8B949E`.
- [x] In `themes/r3bl-theme-no-italic-color-theme.json`:
  - Update comment foregrounds from `#E8DCF4` to `#8B949E`.
- [x] Bump version in `packages/r3bl-theme/package.json` (`1.0.37` → `1.0.38`).

### Step 2: Implement Brightness Control in `packages/r3bl-semantic-config`
- [x] In `package.json`:
  - Add `r3bl.commentBrightness` setting to `contributes.configuration`.
  - Add `r3bl-semantic-config.setCommentBrightness` command (`R3BL: Set Comment Brightness...`).
- [x] Create `src/commentBrightness.ts`:
  - Define `CommentBrightnessLevel = 'dim' | 'medium' | 'bright'`.
  - Define color mapping (`dim`: `#8B949E`, `medium`: `#ABACAC`, `bright`: `#E8DCF4`).
  - Implement `applyCommentBrightness(level?: CommentBrightnessLevel)`:
    - Builds theme-scoped `editor.tokenColorCustomizations` for all 4 R3BL themes.
  - Implement `setCommentBrightnessQuickPick()`:
    - Prompts user via `vscode.window.showQuickPick`.
    - Updates `r3bl.commentBrightness` configuration globally.
- [x] In `src/extension.ts`:
  - Register `setCommentBrightness` command.
  - Watch for `r3bl.commentBrightness` configuration changes.
  - Update `applySemanticConfig()` and `themeWatcher` to ensure comment brightness is applied alongside semantic rules.
- [x] Bump version in `packages/r3bl-semantic-config/package.json` (`1.2.17` → `1.2.18`).

### Step 3: Unit Tests in `packages/r3bl-semantic-config`
- [x] Create `src/__tests__/commentBrightness.test.ts`:
  - Test color mapping for each level.
  - Test customization object generation for all 4 R3BL themes.
  - Test preservation of existing non-R3BL theme blocks.
- [x] Run `npm test` inside `packages/r3bl-semantic-config` to verify all tests pass.

### Step 4: Extension Pack & Documentation
- [x] Bump version in `packages/r3bl-extension-pack/package.json` (`1.3.32` → `1.3.33`).
- [x] Update `packages/r3bl-theme/README.md`, `packages/r3bl-semantic-config/README.md`, and `packages/r3bl-extension-pack/README.md`.
- [x] Update `CHANGELOG.md` with package versions and detailed release notes.
- [x] Run `npx doctoc CHANGELOG.md` to regenerate TOC.

### Step 5: Build, Test & Verification
- [x] Run `./build.sh r3bl-theme r3bl-semantic-config r3bl-extension-pack`.
- [x] Run `./install.sh`.
- [x] In-editor manual testing:
  - Verify editor background in R3BL 2026 themes is `#0e0f10`.
  - Test setting change in `settings.json` and Settings UI.
  - Test `R3BL: Set Comment Brightness...` QuickPick.
  - Verify instant color transition without window reload across `R3BL Theme` and `R3BL 2026 Theme`.
  - Verify left side panel (`sideBar.background`, `sideBarSectionHeader.background`, `activityBar.background`, `agentsPanel.background`) matches editor background `#0e0f10`.
- [x] Git commit changes cleanly without AI attribution.
