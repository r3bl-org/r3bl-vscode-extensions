# Task Plan: Non-Italic Theme Variants (4 Themes Total)

## Overview

Currently, `r3bl-theme` provides 2 themes:

1. **R3BL Theme** (`./themes/r3bl-theme-color-theme.json`)
2. **R3BL 2026 Theme** (`./themes/r3bl-2026-theme.json`)

We will create **non-italic** variants for both themes, expanding the offering to 4 themes
in total:

1. **R3BL Theme** (standard, with italic styles)
2. **R3BL Theme (No Italic)** (non-italic variant)
3. **R3BL 2026 Theme** (standard, with italic styles)
4. **R3BL 2026 Theme (No Italic)** (non-italic variant)

We will also update `r3bl-semantic-config` so that its semantic token customizations and
automatic theme watcher support all 4 themes and apply the appropriate (italic vs
non-italic) semantic rules.

---

## Specification: The 4 Themes

| Theme Label                     | Path                                             | Type | Italic in TextMate / Syntax                                  | Italic in Semantic Highlighting                                        |
| :------------------------------ | :----------------------------------------------- | :--- | :----------------------------------------------------------- | :--------------------------------------------------------------------- |
| **R3BL Theme**                  | `./themes/r3bl-theme-color-theme.json`           | Dark | Yes (`emphasis`, `markup.italic`, `markup.quote`, `invalid`) | Yes (`*.reference`, `variable.mutable`, `keyword`)                     |
| **R3BL Theme (No Italic)**      | `./themes/r3bl-theme-no-italic-color-theme.json` | Dark | **No** (all italic fontStyles replaced/cleared)              | **No** (`*.reference` normal, `variable.mutable` bold, `keyword` bold) |
| **R3BL 2026 Theme**             | `./themes/r3bl-2026-theme.json`                  | Dark | Yes (`emphasis`, `markup.italic`, `markup.quote`, `invalid`) | Yes (`*.reference`, `variable.mutable`, `keyword`)                     |
| **R3BL 2026 Theme (No Italic)** | `./themes/r3bl-2026-theme-no-italic.json`        | Dark | **No** (all italic fontStyles replaced/cleared)              | **No** (`*.reference` normal, `variable.mutable` bold, `keyword` bold) |

---

## Detailed Font Style Changes

### 1. `r3bl-theme-no-italic-color-theme.json` (Derived from `r3bl-theme-color-theme.json`)

| Scope / Rule                                             | Original Setting                  | Non-Italic Setting         |
| :------------------------------------------------------- | :-------------------------------- | :------------------------- |
| `emphasis`                                               | `"fontStyle": "italic"`           | `"fontStyle": ""`          |
| `invalid`                                                | `"fontStyle": "underline italic"` | `"fontStyle": "underline"` |
| `invalid.deprecated`                                     | `"fontStyle": "underline italic"` | `"fontStyle": "underline"` |
| `markup.italic`                                          | `"fontStyle": "italic"`           | `"fontStyle": ""`          |
| `entity.name.directive.restructuredtext`, `markup.quote` | `"fontStyle": "italic"`           | `"fontStyle": ""`          |

### 2. `r3bl-2026-theme-no-italic.json` (Derived from `r3bl-2026-theme.json`)

| Scope / Rule                                             | Original Setting                  | Non-Italic Setting         |
| :------------------------------------------------------- | :-------------------------------- | :------------------------- |
| `emphasis`                                               | `"fontStyle": "italic"`           | `"fontStyle": ""`          |
| `invalid`                                                | `"fontStyle": "underline italic"` | `"fontStyle": "underline"` |
| `invalid.deprecated`                                     | `"fontStyle": "underline italic"` | `"fontStyle": "underline"` |
| `markup.italic`                                          | `"fontStyle": "italic"`           | `"fontStyle": ""`          |
| `entity.name.directive.restructuredtext`, `markup.quote` | `"fontStyle": "italic"`           | `"fontStyle": ""`          |

---

## Semantic Highlighting Updates (`r3bl-semantic-config`)

`r3bl-semantic-config` manages `editor.semanticTokenColorCustomizations` for Rust and
other languages.

### Semantic Rules Differences:

#### Italic Variant (`SEMANTIC_CONFIG_ITALIC`):

- `"*.reference"`: `{ "fontStyle": "italic" }`
- `"variable.mutable"`: `{ "fontStyle": "bold italic" }`
- `keyword`: `{ "foreground": "#a8709e", "fontStyle": "italic bold" }`

#### Non-Italic Variant (`SEMANTIC_CONFIG_NO_ITALIC`):

- `"*.reference"`: `{ "fontStyle": "" }` (or omitted)
- `"variable.mutable"`: `{ "fontStyle": "bold" }`
- `keyword`: `{ "foreground": "#a8709e", "fontStyle": "bold" }`

### Theme Detection & Auto-Apply Logic:

```typescript
const ITALIC_THEMES = ["R3BL Theme", "R3BL 2026 Theme"]
const NO_ITALIC_THEMES = ["R3BL Theme (No Italic)", "R3BL 2026 Theme (No Italic)"]

function getSemanticConfigForTheme(themeName: string | undefined) {
    if (themeName && NO_ITALIC_THEMES.includes(themeName)) {
        return SEMANTIC_CONFIG_NO_ITALIC
    }
    return SEMANTIC_CONFIG_ITALIC
}
```

- When active theme is in `ITALIC_THEMES` -> apply `SEMANTIC_CONFIG_ITALIC`.
- When active theme is in `NO_ITALIC_THEMES` -> apply `SEMANTIC_CONFIG_NO_ITALIC`.
- When theme changes via `onDidChangeConfiguration("workbench.colorTheme")` -> detect
  theme type and apply matching configuration.
- When user executes `R3BL: Enable R3BL Semantic Highlighting` command -> determine active
  theme and apply matching configuration.

---

## Files to Modify and Create

| File                                                               | Action     | Purpose                                                                                                   |
| :----------------------------------------------------------------- | :--------- | :-------------------------------------------------------------------------------------------------------- |
| `packages/r3bl-theme/themes/r3bl-theme-no-italic-color-theme.json` | **Create** | New non-italic color theme JSON for R3BL Theme                                                            |
| `packages/r3bl-theme/themes/r3bl-2026-theme-no-italic.json`        | **Create** | New non-italic color theme JSON for R3BL 2026 Theme                                                       |
| `packages/r3bl-theme/package.json`                                 | **Modify** | Register the 2 new themes in `contributes.themes`, bump version (`1.0.35` → `1.0.36`), update description |
| `packages/r3bl-theme/README.md`                                    | **Modify** | Document the 4 theme options and usage                                                                    |
| `packages/r3bl-semantic-config/src/extension.ts`                   | **Modify** | Add non-italic semantic config, update theme watcher & commands for all 4 themes                          |
| `packages/r3bl-semantic-config/package.json`                       | **Modify** | Bump version (`1.2.16` → `1.2.17`)                                                                        |
| `packages/r3bl-semantic-config/README.md`                          | **Modify** | Document support for italic and non-italic theme variants                                                 |
| `packages/r3bl-extension-pack/package.json`                        | **Modify** | Bump version (`1.3.30` → `1.3.31`)                                                                        |
| `packages/r3bl-extension-pack/README.md`                           | **Modify** | Update theme list and descriptions                                                                        |
| `README.md`                                                        | **Modify** | Update root overview for theme offerings                                                                  |
| `CHANGELOG.md`                                                     | **Modify** | Add changelog entry for non-italic variants and package version bumps                                     |

---

## Implementation Steps

### Phase 1: Theme Files Creation

- [x] Create `packages/r3bl-theme/themes/r3bl-theme-no-italic-color-theme.json` by copying
      `r3bl-theme-color-theme.json` and replacing all italic fontStyles.
- [x] Create `packages/r3bl-theme/themes/r3bl-2026-theme-no-italic.json` by copying
      `r3bl-2026-theme.json` and replacing all italic fontStyles.
- [x] Update `packages/r3bl-theme/package.json` to register the new themes in
      `contributes.themes` and bump version to `1.0.36`.

### Phase 2: Semantic Config Updates

- [x] Refactor `packages/r3bl-semantic-config/src/extension.ts` to define both
      `SEMANTIC_CONFIG_ITALIC` and `SEMANTIC_CONFIG_NO_ITALIC`.
- [x] Update `applySemanticConfig(theme?: string)` to apply the appropriate configuration
      based on active theme.
- [x] Update activation check and theme change listener to watch for all 4 theme names.
- [x] Update `packages/r3bl-semantic-config/package.json` version to `1.2.17`.
- [x] Run unit tests in `packages/r3bl-semantic-config` (`npm test`) to ensure everything
      passes.

### Phase 3: Extension Pack & Documentation

- [x] Update `packages/r3bl-extension-pack/package.json` version to `1.3.31`.
- [x] Update `packages/r3bl-theme/README.md` with descriptions and usage for all 4 themes.
- [x] Update `packages/r3bl-semantic-config/README.md`.
- [x] Update `packages/r3bl-extension-pack/README.md`.
- [x] Update root `README.md`.
- [x] Add entry to `CHANGELOG.md`.

### Phase 4: Build & Local Verification

- [x] Run `./build.sh` to compile all packages, run tests, and generate `.vsix` bundles.
- [x] Run `./install.sh` to install updated extensions locally.
- [x] Verify that all 4 themes appear in the Color Theme picker (`Ctrl+K Ctrl+T`) and
      switch correctly without italics in the non-italic variants.
