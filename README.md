# R3BL VSCode Extensions

> 📦 **Install the Extension Pack:**
>
> - [**VS Code Marketplace**](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-extension-pack)
>   (VS Code, Cursor)
> - [**Open VSX Registry**](https://open-vsx.org/extension/R3BL/r3bl-extension-pack)
>   (VSCodium, Gitpod)

A monorepo containing R3BL VSCode extensions for Rust development, task management, and
productivity.

Table of contents:

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Quick Start](#quick-start)
- [Extensions](#extensions)
    - [R3BL Extension Pack (Recommended)](#r3bl-extension-pack-recommended)
    - [Individual Extensions](#individual-extensions)
    - [Infrastructure Packages](#infrastructure-packages)
        - [Architecture Overview](#architecture-overview)
- [Installation](#installation)
    - [From Marketplace (Recommended)](#from-marketplace-recommended)
    - [From Source](#from-source)
- [Development](#development)
    - [Setup](#setup)
    - [Modifying Extensions](#modifying-extensions)
    - [Creating New Extensions](#creating-new-extensions)
    - [Building](#building)
    - [For Maintainers](#for-maintainers)
- [Structure](#structure)
- [Changelog](#changelog)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Quick Start

**Install the complete R3BL development experience:**

```bash
code --install-extension R3BL.r3bl-extension-pack
```

Or search for "R3BL Extension Pack" in the VS Code Marketplace.

## Extensions

### R3BL Extension Pack (Recommended)

The complete package - installs all R3BL extensions plus `rust-analyzer` (dependency) with
zero configuration.

**[View Documentation][ext_pack-readme]** | **[Open VSX][ext_pack-ovsx]** |
**[Marketplace][ext_pack-msft]**

### Individual Extensions

| Extension                              | Description                                                          | Links                                                                                                                   |
| -------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **R3BL Theme**                         | Dark theme optimized for Rust and Markdown                           | [Docs][dark_theme-readme] · [Open VSX][dark_theme-ovsx] · [Microsoft][dark_theme-msft]                                  |
| **R3BL Semantic Configuration**        | Enhanced semantic highlighting for Rust                              | [Docs][semantic_config-readme] · [Open VSX][semantic_config-ovsx] · [Microsoft][semantic_config-msft]                   |
| **R3BL Task Management**               | Task space management for context switching                          | [Docs][task_mgmt-readme] · [Open VSX][task_mgmt-ovsx] · [Microsoft][task_mgmt-msft]                                     |
| **R3BL Fuzzy Search**                  | Interactive fuzzy search & Git Diff Search Editor                    | [Docs][fuzzy_search_and_git-readme] · [Open VSX][fuzzy_search_and_git-ovsx] · [Microsoft][fuzzy_search_and_git-msft]    |
| **R3BL Opened Editors**                | Opened editors dropdown switcher & vertical sidebar panel navigation | [Docs][opened_editors-readme] · [Open VSX][opened_editors-ovsx] · [Microsoft][opened_editors-msft]                      |
| **R3BL Copy Selection Path and Range** | Copy file paths with line ranges for Coding Agents                   | [Docs][copy_selection-readme] · [Open VSX][copy_selection-ovsx] · [Microsoft][copy_selection-msft]                      |
| **R3BL Auto Insert Copyright**         | Automatic copyright header insertion                                 | [Docs][auto_insert_copyright-readme] · [Open VSX][auto_insert_copyright-ovsx] · [Microsoft][auto_insert_copyright-msft] |

### Infrastructure Packages

This monorepo also contains shared infrastructure used by the extensions:

| Package              | Type             | Description                                                                 |
| -------------------- | ---------------- | --------------------------------------------------------------------------- |
| **r3bl-shared**      | VSCode Extension | Centralized services (message queue, config) - auto-installed as dependency |
| **r3bl-common-code** | NPM Package      | Common utilities and helpers shared across extensions                       |

#### Architecture Overview

```
User Installs Extension Pack
         ↓
    [r3bl-extension-pack]  ← Meta-package (no code, just installs dependencies)
         ↓
    ┌────┴─────┬──────────────┬───────────────┬─────────────┐
    ↓          ↓              ↓               ↓             ↓
[r3bl-theme] [r3bl-task-...] [r3bl-fuzzy-...] [r3bl-copy-...] [etc.]
    ↓          ↓              ↓               ↓             ↓
    └──────────┴──────────────┴───────────────┴─────────────┘
         ↓                                    ↓
    [r3bl-shared]                      [r3bl-common-code]
    (VSCode extension)                   (npm package)
    Runtime services API                 Compile-time utilities
```

**Component Roles:**

- **r3bl-extension-pack**: Meta-package that installs all user-facing extensions (no code,
  pure convenience)
- **r3bl-shared**: VSCode extension providing runtime services (message queue, centralized
  configuration)
    - Loaded at runtime by VSCode
    - Accessed via extension API: `vscode.extensions.getExtension('R3BL.r3bl-shared')`
    - Auto-installed via `extensionDependencies` in each extension's package.json
- **r3bl-common-code**: NPM package with compile-time utilities (wrapper functions, type
  definitions)
    - Bundled into each extension at build time via webpack
    - Used as local dependency: `"r3bl-common-code": "file:../r3bl-common-code"`
    - Provides simplified API wrappers that call r3bl-shared services

> **Note for developers:** These are internal packages used by the extensions above. See
> [CLAUDE.md](CLAUDE.md) for development details.

## Installation

### From Marketplace (Recommended)

Search for extensions by name in VS Code, or use the command line:

```bash
# Install the complete pack
code --install-extension R3BL.r3bl-extension-pack

# Or install individually
code --install-extension R3BL.r3bl-theme
code --install-extension R3BL.r3bl-task-management
# etc.
```

### From Source

```bash
git clone https://github.com/r3bl-org/r3bl-vscode-extensions.git
cd r3bl-vscode-extensions
./install.sh
```

The `.vsix` files are pre-built and committed to the repo, so no build step is needed. To
rebuild from source, run `./build.sh` first.

## Development

### Setup

```bash
npm install
```

### Modifying Extensions

1. Make code changes in `packages/extension-name/src/`
2. Update version in `packages/extension-name/package.json`
3. Update version in `packages/r3bl-extension-pack/package.json`
4. Build and test:
    ```bash
    ./build.sh
    ./install.sh
    ```
5. Commit changes

**Key points:**

- Always update both the extension's version AND the extension pack version
- Scripts automatically clean up old .vsix versions
- Both `build.sh` and `install.sh` read versions from `package.json`

### Creating New Extensions

1. Create directory: `mkdir -p packages/r3bl-new-extension/src`
2. Copy structure from existing extension
3. Update `package.json` metadata
4. Implement extension in `src/`
5. Add to `packages/r3bl-extension-pack/package.json` extensionPack array
6. Update `script_lib.sh`, `build.sh`, `install.sh`
7. Build and test

See [CLAUDE.md](CLAUDE.md) for detailed development instructions.

### Building

```bash
# Build all extensions
./build.sh

# Or build specific extensions
npm run build:theme
npm run build:copyright
npm run build:semantic-config
```

### For Maintainers

After making changes to any extension:

```bash
./build.sh    # Generate .vsix artifacts
./install.sh  # Install to VS Code
```

The build script:

- Compiles TypeScript extensions
- Packages all extensions
- Removes outdated .vsix versions
- Creates the extension pack

## Structure

```
packages/
├── r3bl-extension-pack/                  # Extension pack (installs all extensions)
├── r3bl-theme/                           # Theme
├── r3bl-semantic-config/                 # Semantic highlighting
├── r3bl-task-management/                 # Task spaces
├── r3bl-fuzzy-search/                    # Fuzzy search
├── r3bl-opened-editors/                  # Opened editors dropdown switcher
├── r3bl-copy-selection-path-and-range/   # Copy file paths
├── r3bl-auto-insert-copyright/           # Copyright headers
├── r3bl-shared/                          # Shared services (infrastructure)
└── r3bl-common-code/                     # Common utilities (infrastructure)
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and release notes.

## License

MIT - See individual extension LICENSE files for details.

---

**Rebels race on!**

[ext_pack-readme]: packages/r3bl-extension-pack/README.md
[ext_pack-ovsx]: https://open-vsx.org/extension/R3BL/r3bl-extension-pack
[ext_pack-msft]:
    https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-extension-pack
[dark_theme-readme]: packages/r3bl-theme/README.md
[dark_theme-ovsx]: https://open-vsx.org/extension/R3BL/r3bl-theme
[dark_theme-msft]: https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-theme
[semantic_config-readme]: packages/r3bl-semantic-config/README.md
[semantic_config-ovsx]: https://open-vsx.org/extension/R3BL/r3bl-semantic-config
[semantic_config-msft]:
    https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-semantic-config
[task_mgmt-readme]: packages/r3bl-task-management/README.md
[task_mgmt-ovsx]: https://open-vsx.org/extension/R3BL/r3bl-task-management
[task_mgmt-msft]:
    https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-task-management
[fuzzy_search_and_git-readme]: packages/r3bl-fuzzy-search/README.md
[fuzzy_search_and_git-ovsx]: https://open-vsx.org/extension/R3BL/r3bl-fuzzy-search
[fuzzy_search_and_git-msft]:
    https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-fuzzy-search
[copy_selection-readme]: packages/r3bl-copy-selection-path-and-range/README.md
[copy_selection-ovsx]:
    https://open-vsx.org/extension/R3BL/r3bl-copy-selection-path-and-range
[copy_selection-msft]:
    https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-copy-selection-path-and-range
[auto_insert_copyright-readme]: packages/r3bl-auto-insert-copyright/README.md
[auto_insert_copyright-ovsx]:
    https://open-vsx.org/extension/R3BL/r3bl-auto-insert-copyright
[auto_insert_copyright-msft]:
    https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-auto-insert-copyright
[opened_editors-readme]: packages/r3bl-opened-editors/README.md
[opened_editors-ovsx]: https://open-vsx.org/extension/R3BL/r3bl-opened-editors
[opened_editors-msft]:
    https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-opened-editors
