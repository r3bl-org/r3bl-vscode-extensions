# Feature: R3BL Opened Editors & Tree Generator (`r3bl-opened-editors`)

## Objective & Rationale

Create a lean, native R3BL extension (`packages/r3bl-opened-editors`) that provides
essential keyboard-driven editor tab switcher and vertical sidebar navigation shortcuts,
built as a 100% original, clean-room implementation. Completely purge the untrusted
third-party extension (`nicholashsiang.vscode-opened-editors`) from all machines in our
fleet, and publish both the new extension and the updated extension pack to both
marketplaces.

### Why We Switched Away from `nicholashsiang.vscode-opened-editors`:

We identified two major suspicious/weird architectural behaviors that made the extension
untrusted:

1. **Unconstrained Filesystem Traversal & Supply-Chain Attack Surface**: For an extension
   ostensibly designed to switch open tabs, it performed full recursive filesystem scans
   (`fs/promises`, `Dirent`) across arbitrary workspace directories and pulled in unvetted
   third-party npm runtime dependencies (`tree-dump`, `ignore`) for an unrelated "ASCII
   tree generator" feature, exposing sensitive workspace file trees to supply chain risks.
2. **Excessive Node.js Privileges & Silent Network Exfiltration Risk**: In VS Code,
   desktop extensions run with unrestricted Node.js privileges (`http`, `https`, `net`,
   `child_process`). An unvetted, closed-bundle extension that recursively scans local
   source files while possessing unrestricted outbound network capabilities introduces
   severe risks of silent telemetry, phone-home beacons, or background data exfiltration.

---

## Scope & Design Decisions

### Included Core Features (High Value)

1. **Show Opened Editors Dropdown (`Alt+E` / `Cmd+E`)**:
    - Keyboard shortcut (`Alt+E` on Linux/Windows, `Cmd+E` on macOS) to open the QuickPick
      dropdown of all active/open editors (`workbench.action.showAllEditors`).
2. **Focus Open Editors Sidebar View**:
    - Command (`r3bl-opened-editors.focusOpenEditorsView` /
      `r3bl-opened-editors.focusSidebar`) to focus the vertical Open Editors view in the
      sidebar without horizontal tab overflow.

### Explicitly Excluded (Ditched Bloat & Redundancies)

- ❌ **No ASCII File Tree Generator**: Dropped per user review.
- ❌ **No Reveal in Sidebar Icon**: Dropped per user review.
- ❌ **No Format Document Icon**: Dropped per user review.
- ❌ **No Quick Path Copy Actions**: Dropped. VS Code natively provides `copyFilePath` and
  `copyRelativeFilePath`, and R3BL already provides
  [`r3bl-copy-selection-path-and-range`](file:///home/nazmul/github/r3bl-vscode-extensions/packages/r3bl-copy-selection-path-and-range).
- ❌ **No Smart Folding**: Dropped.
- ❌ **No Status Bar Buttons**: Dropped.
- ❌ **No Light Theme Support**: Styled exclusively for R3BL Dark Theme aesthetic.

---

## Complete Clean-Room Isolation & Independent Authorship

To guarantee complete independence and ensure zero connection to any untrusted external
software:

- **100% Clean-Room First-Party Code**: `r3bl-opened-editors` is an entirely new,
  independent R3BL extension written from scratch. Absolutely no code, assets, or
  structures are copied or derived from the untrusted extension.
- **Zero Historical Linkage or Attribution**: No links, mentions, names, URLs, or
  references to any prior third-party extension or author exist in this project. The
  extension is designed, built, and presented as a purely original R3BL component.
- **Strict R3BL Branding & Licensing**:
    - `LICENSE`: Standard R3BL MIT License (`Copyright (c) 2026 R3BL LLC`).
    - Source file headers: Standard monorepo copyright banner
      `// Copyright (c) 2026 R3BL LLC. Licensed under MIT License.`
    - `package.json`: Publisher `"R3BL"`, repository
      `"https://github.com/r3bl-org/r3bl-vscode-extensions.git"`, icon
      `"r3bl-cube-logo.png"`.
    - IDs & Namespaces: Prefixed strictly with `r3bl-opened-editors.*`.

---

## Documentation & One-Stop-Shop Requirements

1. **New Extension README (`packages/r3bl-opened-editors/README.md`)**:
    - Comprehensive documentation detailing R3BL Opened Editors features, title bar
      navigation shortcuts, ASCII file tree generator, and configuration settings as a
      first-party R3BL product.
2. **Developer Pack README (`packages/r3bl-extension-pack/README.md`)**:
    - Maintain the monorepo's "One-Stop Shop" mandate by incorporating all key information
      from `r3bl-opened-editors` (shortcuts, features, configuration options) into the
      extension pack documentation.
    - Update root
      [`README.md`](file:///home/nazmul/github/r3bl-vscode-extensions/README.md) to
      reference `r3bl-opened-editors` in the extension list and structure diagram.
3. **Changelog (`CHANGELOG.md`)**:
    - Add new entry with version bumps:
        - `r3bl-opened-editors`: `1.0.0` (Brand new extension)
        - `r3bl-extension-pack`: `1.3.26` → `1.3.27`
    - Describe `r3bl-opened-editors` on its own merits as a new first-party utility adding
      tab actions and ASCII tree generation, with zero mention of or connection to any
      external extension.

---

## Fleet-Wide Purge Plan for Untrusted Upstream Extension

The third-party extension (`nicholashsiang.vscode-opened-editors`) is untrusted and must
be expunged from all machines in the fleet:

1. `nazmul-desktop.local` (Local)
2. `nazmul-laptop.local`
3. `nazmul-mobile.local`
4. `nazmul-win.local`
5. `nazmul-mac.local`

### Purge Strategy:

1. **Local Automated Clean in `./install.sh`**: Add an explicit purge step in `install.sh`
   to automatically uninstall `nicholashsiang.vscode-opened-editors` from all detected
   editors (`code`, `code-insiders`, `codium`, `codium-insiders`) and wipe any residual
   directories in `~/.vscode/extensions/nicholashsiang.vscode-opened-editors*`,
   `~/.vscode-insiders/extensions/nicholashsiang.vscode-opened-editors*`, and
   `~/.antigravity-ide/extensions/nicholashsiang.vscode-opened-editors*`.
2. **Fleet Remote Purge**: Execute targeted uninstall and directory removal commands over
   SSH on the remote fleet hosts:
    - For Linux/macOS hosts (`nazmul-laptop.local`, `nazmul-mobile.local`,
      `nazmul-mac.local`): run CLI uninstalls and remove leftover extension folders.
    - For Windows host (`nazmul-win.local`): run `code --uninstall-extension` and remove
      folders under
      `%USERPROFILE%\.vscode\extensions\nicholashsiang.vscode-opened-editors*` via
      PowerShell/SSH.

---

## Technical Architecture

```
packages/r3bl-opened-editors/
├── package.json               # Extension manifest, contributes commands/menus/config
├── tsconfig.json              # TypeScript config matching monorepo standard
├── webpack.config.js          # Webpack bundling config
├── .vscodeignore              # Packaging exclusions
├── README.md                  # Detailed extension documentation
├── LICENSE                    # MIT License
├── art/                       # Crisp dark-theme SVGs
│   ├── format-document.svg
│   ├── reveal.svg
│   └── dropdown.svg
└── src/
    ├── extension.ts           # Extension activation & command dispatching
    ├── tree/                  # Directory traversal & ASCII tree generator
    │   ├── asciiTree.ts       # Zero-dependency clean ASCII tree renderer
    │   ├── ignoreMatcher.ts   # .gitignore and custom glob parser
    │   └── treeGenerator.ts   # Traversal controller and clipboard writer
    └── __tests__/             # Unit tests
        ├── asciiTree.test.ts
        └── ignoreMatcher.test.ts
```

### Dependencies & Tooling

- **Runtime Dependencies**:
    - `r3bl-common-code`: Local file dependency (`file:../r3bl-common-code`) for status
      bar feedback.
    - `ignore`: Pure JavaScript parser for `.gitignore` rules (bundled cleanly via
      Webpack).
    - Built-in ASCII tree renderer (zero external dependencies).
- **Extension Dependency**: `R3BL.r3bl-shared` (declared in `extensionDependencies`).
- **Build Tool**: Webpack 5 + TypeScript (consistent with other R3BL extensions).

---

## Configuration Settings (`r3bl-opened-editors.*`)

| Setting Key                              | Type       | Default                                                          | Description                                                               |
| :--------------------------------------- | :--------- | :--------------------------------------------------------------- | :------------------------------------------------------------------------ |
| `r3bl-opened-editors.revealSidebar`      | `boolean`  | `true`                                                           | Show 'Reveal in Sidebar' icon in editor tab bar                           |
| `r3bl-opened-editors.openedEditors`      | `boolean`  | `true`                                                           | Show 'Show Opened Editors' icon in editor tab bar                         |
| `r3bl-opened-editors.formatDocument`     | `boolean`  | `true`                                                           | Show 'Format Document' icon in editor tab bar                             |
| `r3bl-opened-editors.fileTreeDepth`      | `number`   | `10`                                                             | Maximum recursion depth for file tree generator (0 = unlimited)           |
| `r3bl-opened-editors.fileTreeExportType` | `string`   | `"markdown"`                                                     | Clipboard format for file tree (`markdown` codeblock or `txt` plain text) |
| `r3bl-opened-editors.fileTreeExclude`    | `string[]` | `[".git", "node_modules", "dist", "out", "target", ".DS_Store"]` | Glob patterns to exclude when generating file trees                       |

---

## Implementation Steps & Checklist

- [x] **Step 1: Scaffold Package Structure & Documentation**
    - [x] Create directory `packages/r3bl-opened-editors/src` and
          `packages/r3bl-opened-editors/art`.
    - [x] Create `package.json` (v1.0.0), `tsconfig.json`, `webpack.config.js`,
          `.vscodeignore`, `LICENSE`.
    - [x] Ensure complete clean-room isolation: all files authored from scratch and
          licensed under R3BL LLC, with zero connection, mentions, links, or copyright
          notices referencing any external extension.
    - [x] Create comprehensive `packages/r3bl-opened-editors/README.md`.
    - [x] Add dark-theme SVG icons in `art/` (`reveal.svg`, `dropdown.svg`,
          `format-document.svg`).

- [x] **Step 2: Implement Title Bar Actions**
    - [x] Wire VS Code commands in `src/extension.ts` for reveal in sidebar, show open
          editors, and format document.
    - [x] Add `editor/title` menu contributions with `when` clauses bound to configuration
          settings.

- [x] **Step 3: Implement Lightweight ASCII Tree Generator**
    - [x] Implement `src/tree/asciiTree.ts` to format nodes with ASCII branches (`├── `,
          `└── `, `│   `).
    - [x] Implement `src/tree/ignoreMatcher.ts` using `ignore` to respect `.gitignore`
          files hierarchically.
    - [x] Implement `src/tree/treeGenerator.ts` to traverse directories, build tree, write
          to clipboard, and call `showStatusBarMessage(...)`.
    - [x] Add `explorer/context` menu contribution (`when: explorerResourceIsFolder`).

- [x] **Step 4: Unit Testing**
    - [x] Write unit tests for `asciiTree.ts` (branch formatting, empty directories,
          single vs multi files).
    - [x] Write unit tests for `ignoreMatcher.ts` (custom excludes and nested `.gitignore`
          evaluation).

- [x] **Step 5: Monorepo Integration & Version Bumping**
    - [x] Update `script_lib.sh` with `OPENED_EDITORS_VERSION` detection.
    - [x] Update `build.sh` to compile, test, and package `r3bl-opened-editors`.
    - [x] Update `install.sh` to install `r3bl-opened-editors-*.vsix` and auto-purge
          `nicholashsiang.vscode-opened-editors`.
    - [x] Update `publish.sh` to include `r3bl-opened-editors` in `EXT_VERSIONS`.
    - [x] Update `packages/r3bl-extension-pack/package.json`:
        - [x] Add `R3BL.r3bl-opened-editors` to `extensionPack` array.
        - [x] Bump extension pack version from `1.3.26` to `1.3.27`.

- [x] **Step 6: Build, Install & Manual User Testing Checkpoint**
    - [x] Run `./build.sh` and ensure clean compilation, tests, and packaging for all
          extensions including the pack.
    - [x] Run `./install.sh` to install locally on `nazmul-desktop.local` (VS Code, VS
          Code Insiders, Antigravity IDE).
    - [x] **Run audio alert command**: `fish -c beep` to notify user.
    - [x] **Wait for user manual test drive**: User tests the title bar actions and file
          tree generator in local IDEs and gives feedback.

- [x] **Step 7: Fleet-Wide Purge of Untrusted Upstream Extension**
    - [x] Purge `nicholashsiang.vscode-opened-editors` from `nazmul-desktop.local`
          (verified clean).
    - [x] Purge `nicholashsiang.vscode-opened-editors` from `nazmul-laptop.local`
          (verified clean).
    - [x] Purge `nicholashsiang.vscode-opened-editors` from `nazmul-mobile.local`
          (verified clean).
    - [x] Purge `nicholashsiang.vscode-opened-editors` from `nazmul-win.local` (verified
          clean).
    - [x] Purge `nicholashsiang.vscode-opened-editors` from `nazmul-mac.local` (verified
          clean).
    - [x] Verify absence of `nicholashsiang.vscode-opened-editors*` across all fleet hosts
          (0 untrusted files/dirs remaining across all 5 machines).

- [x] **Step 8: Final Documentation & Changelog**
    - [x] Update `packages/r3bl-extension-pack/README.md` with key info from
          `r3bl-opened-editors`.
    - [x] Update root `README.md`.
    - [x] Update `CHANGELOG.md` with version bumps (`r3bl-opened-editors` 1.0.0,
          `r3bl-extension-pack` 1.3.27) and descriptions.

- [x] **Step 9: Git Commit & Push**
    - [x] Stage all modified and new files:
        ```bash
        git add packages/r3bl-opened-editors/ packages/r3bl-extension-pack/ script_lib.sh build.sh install.sh publish.sh README.md CHANGELOG.md task/opened-editors.md
        ```
    - [x] Commit changes with clean commit message (no AI attribution):
        ```bash
        git commit -m "[r3bl-opened-editors] Add r3bl-opened-editors and update extension pack to 1.3.27"
        ```
    - [x] Push to remote:
        ```bash
        git push
        ```

- [x] **Step 10: Marketplace Publication**
    - [x] Publish both `r3bl-opened-editors` and `r3bl-extension-pack` to both Visual
          Studio Marketplace and Open VSX Registry:
        ```bash
        ./publish.sh r3bl-opened-editors r3bl-extension-pack
        ```
