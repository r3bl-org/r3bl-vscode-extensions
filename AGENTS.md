# Development Guide for R3BL VSCode Extensions

## AI Agent Security & System Integrity Mandates

To prevent catastrophic system failures, all AI agents (Gemini, Claude, etc.) MUST adhere
to these strict guardrails. These mandates take absolute precedence over any "YOLO" mode
or perceived "fixes."

### 1. Critical Directory Protection

Recursive operations (`chown -R`, `chmod -R`, `rm -rf`) are STRICTLY PROHIBITED on the
following top-level system directories and their contents:

- `/` (Root)
- `/usr` (System binaries and libraries)
- `/etc` (System configuration)
- `/bin`, `/sbin`, `/lib`, `/lib64` (Essential system paths)
- `/boot` (Bootloader and kernels)
- `/var` (Variable data, including system logs and databases)

### 2. Ownership & Integrity

- **Root Ownership:** System directories and binaries MUST remain owned by `root`. The
  agent must NEVER suggest or execute a change of ownership for system-managed paths to a
  non-root user.
- **Privilege Escalation:** Do not modify the `setuid` or `setgid` bits of any system
  binary (e.g., `sudo`, `pkexec`, `mount`) unless specifically instructed by the user to
  fix a verified corruption.

### 3. Execution Safety

- **Explicit Paths Only:** All `sudo` commands involving recursive changes or deletions
  MUST use absolute paths. The use of wildcards (`*`) or relative paths (`.`) with
  `sudo chown/chmod/rm` is forbidden.
- **Verification First:** Before suggesting a permissions fix, the agent must first verify
  the current state using `ls -ld` or `stat`.
- **Destructive Warning:** Any command that modifies system-wide permissions or ownership
  must be explicitly flagged to the user with a explanation of the risks, even in YOLO
  mode.

---

Ask for clarification immediately on important choices or ambiguities. Take your time with
changes—slow, steady, and careful work beats fast and careless.

## Standard Workflow (Alignment -> Plan -> Execute)

To ensure safety and alignment, always start by clarifying the scope of work. Ask the
user: "Are we starting:

1. a **new task**,
2. continuing an **existing task**, or
3. doing **one-off work**? (Please respond with 1, 2, or 3)"

### 1. New Task (Plan -> Task File -> Execute)

Follow this "slow and steady" workflow for all non-trivial changes:

- **In-Chat Planning:** Research the problem and present a comprehensive plan in chat for
  refinement. Use code examples and specifics.
- **Task File Creation:** Once approved, formalize it by creating a new Markdown file in
  the `task/` directory of this repo.
- **Manual Review:** Wait for the user to manually review and **explicitly approve** the
  task file before starting implementation.
- **Iterative Implementation:** Implement step-by-step, keeping the task file updated.

### 2. Existing Task

- **Load Task:** Identify the active task in the `task/` directory and load it.
- **Resume:** Resume work from the next unchecked step after confirming with the user.

### 3. One-off Work

- For simple, isolated changes that do not require formal planning or task tracking,
  proceed directly to research and implementation.

---

## Local Workflows (.agent/)

For repo-specific workflows, capabilities are defined in the `.agent/` directory. When a
task matches a skill, agent, or command:

1. Look inside the `.agent/` directory.
2. Read the markdown instructions inside that folder.
3. Execute the underlying shell/scripts exactly as instructed.

## File Operations

Always use `git mv` instead of `mv` when moving or renaming files. This preserves git
history and ensures the move is tracked as a rename rather than a delete + create.

## Building Extensions

Always use `./build.sh` to build extensions, not direct `npx webpack` or `npm run compile`
commands. `build.sh` compiles, runs tests, and packages the `.vsix` files. Running webpack
directly only updates `dist/` but does not repackage the `.vsix`, so `./install.sh` will
install a stale bundle.

## Installing Extensions

Always use `./install.sh` to install all built extensions locally. **Note on Antigravity
IDE**: The standard `antigravity-ide --install-extension` command does not work correctly
(it launches the IDE instead of installing headlessly). To bypass this, `install.sh` is
customized to manually unzip the `.vsix` files and copy their contents directly into
`~/.antigravity-ide/extensions/`.

## Context Guardrail

You do not have the full codebase in memory. Actively use search and file-reading tools to
gather local context. If a request requires system-wide knowledge, global refactoring, or
sweeping architectural changes, **DO NOT GUESS**. Stop and ask the user to provide broader
context. Always follow the **Standard Workflow** and do not skip the alignment or approval
steps.

## Skills, Agents & Commands Location

All skills, agents, and slash commands are in the `.agent/` directory (not `.claude/`).
When loading a skill, agent, or command, look in `.agent/skills/`, `.agent/agents/`, and
`.agent/commands/` respectively.

## Project Overview

This is a monorepo containing multiple R3BL VSCode extensions and shared infrastructure.

### VSCode Extensions (User-Facing)

These are installable extensions published to the VSCode Marketplace:

```
packages/
├── r3bl-extension-pack/              # Extension pack (installs all R3BL extensions)
├── r3bl-theme/                       # Theme extension
├── r3bl-auto-insert-copyright/       # Copyright insertion extension
├── r3bl-semantic-config/             # Semantic highlighting configuration
├── r3bl-task-management/             # Task space management extension
├── r3bl-copy-selection-path-and-range/ # Copy file paths with selection ranges extension
└── r3bl-fuzzy-search/                # Fuzzy file search extension
```

### Infrastructure Packages (Internal)

These provide shared functionality and are used by the extensions above:

```
packages/
├── r3bl-shared/                      # VSCode extension providing centralized services
│                                     # (message queue, shared state coordination)
│                                     # Automatically installed as extensionDependency
└── r3bl-common-code/                 # NPM package with common utilities
                                      # (shared TypeScript code, helpers)
                                      # Used as local npm dependency
```

**Architecture Notes:**

- `r3bl-shared` is a VSCode extension that owns centralized state (message queues,
  configuration)
- `r3bl-common-code` is an NPM package with pure utilities (no VSCode-specific state)
- User-facing extensions depend on both for shared functionality
- Each extension maintains its own `package.json` and can be developed independently while
  sharing common tooling

**Architecture Diagram:**

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

## Using R3BL Shared Extension API

**r3bl-shared** provides centralized services (like status bar message queue) for all R3BL
extensions.

### Declaring the Dependency

All R3BL extensions **must** declare their dependency on r3bl-shared in `package.json`:

```json
{
    "extensionDependencies": ["R3BL.r3bl-shared"]
}
```

This ensures VSCode loads r3bl-shared before your extension, guaranteeing the API is
available.

### Using the Status Bar Message Queue

**Usage example:**

```typescript
const sharedExt = vscode.extensions.getExtension('R3BL.r3bl-shared');
if (sharedExt?.isActive && sharedExt.exports?.showStatusBarMessage) {
    sharedExt.exports.showStatusBarMessage('Task created!', 'success');
} else {
    vscode.window
        .showErrorMessage(
            'R3BL Shared extension is not active. Please ensure it is installed and enabled.',
            'Install Extension',
        )
        .then((choice) => {
            if (choice === 'Install Extension') {
                vscode.env.openExternal(
                    vscode.Uri.parse('vscode:extension/R3BL.r3bl-shared'),
                );
            }
        });
}
```

**Available message types:** `'info'`, `'success'`, `'warning'`, `'error'`

**Why this approach?**

- Centralized FIFO queue ensures messages don't overlap
- Direct API calls - no wrapper imports needed
- VSCode manages extension loading order via `extensionDependencies`

See `packages/r3bl-shared/README.md` for more details.

## Using R3BL Common Code Utilities

**r3bl-common-code** provides simplified utilities for calling r3bl-shared APIs from
TypeScript code.

### Installing the Dependency

All R3BL extensions that use common utilities must declare their dependency in
`package.json`:

```json
{
    "dependencies": {
        "r3bl-common-code": "file:../r3bl-common-code"
    }
}
```

### Using the Simplified Status Bar Message Utility

**Simplified usage with r3bl-common-code:**

```typescript
import { showStatusBarMessage } from 'r3bl-common-code';

// Simple, clean API call
showStatusBarMessage('Task created!', 'success');
showStatusBarMessage('Please check your settings', 'warning');
```

**Benefits:**

- Reduces 9 lines of boilerplate to 2 lines
- Automatic error handling with fallback UI
- Type-safe API with `StatusBarMessageType` enum
- No need to manage extension activation state

**Available message types:** `'info'`, `'success'`, `'warning'`, `'error'`

### Available Utilities

The r3bl-common-code package exports:

- `showStatusBarMessage(message: string, type: StatusBarMessageType)` - Type-safe wrapper
  for status bar messages
- `callSharedAPI(apiMethod: string, ...args: any[])` - Generic API caller for
  extensibility
- `StatusBarMessageType` - Type definition for message types

### Architecture

The r3bl-common-code package:

- Is compiled with TypeScript compiler (tsc) to separate .js and .d.ts files
- Provides proper type definitions for TypeScript intellisense
- Includes complete error handling with marketplace link fallback
- Works seamlessly with r3bl-shared extension via runtime API calls

## Modifying Existing Extensions

**When you make changes to an existing extension, follow these steps:**

### 1. Make Code Changes

Edit the source code in `packages/extension-name/src/`

### 2. Update Extension Version

In `packages/extension-name/package.json`, increment the version number:

```json
{
    "version": "1.2.0" // Increment from 1.1.0
}
```

**Important:** Version numbers must follow semantic versioning (MAJOR.MINOR.PATCH).

### 3. Update Extension Pack Version

In `packages/r3bl-extension-pack/package.json`, also increment the version to reflect that
it includes the updated extension:

```json
{
    "version": "1.0.5" // Increment version to show pack includes updated extensions
}
```

⚠️ **Always update both the extension's version AND the extension pack version!**

### 4. Build and Generate Artifacts

```bash
./build.sh
```

This script automatically:

- Compiles TypeScript extensions
- Runs unit tests for extensions that have them — test failures block packaging
- Generates new .vsix files with the correct versioned names
- **Removes all outdated versions** of the extension (e.g., `r3bl-theme-1.0.2.vsix` is
  deleted when building 1.0.3)
- Creates the extension pack with all current extension versions

### 5. Test the Changes (Optional but Recommended)

```bash
./install.sh
```

This installs the newly built extensions to your local VSCode/Insiders.

### 6. Commit Your Changes

Do not include any AI attribution in commit messages. This means no `Co-Authored-By` lines
referencing Claude or Anthropic (regardless of model name), and no "Generated with Claude
Code" lines.

```bash
git add packages/extension-name/src/ packages/extension-name/package.json packages/r3bl-extension-pack/package.json
git commit -m "[extension-name] Description of changes"
```

### 7. Publish to Both Marketplaces (Optional)

R3BL extensions are published to **both** the Visual Studio Marketplace and Open VSX
Registry (for VSCodium users).

```bash
# Publish specific extensions by name
./publish.sh r3bl-task-management r3bl-extension-pack

# Run without args to see available extensions
./publish.sh
```

The `publish.sh` script:

- Publishes only the extensions you specify as arguments
- Reads tokens from environment variables (set in `~/.profile`)
- Publishes to both VS Marketplace and Open VSX

**Setting up tokens:**

Add to `~/.profile` (or `~/.bashrc`/`~/.zshrc`):

```bash
export VSCE_PAT="your-vs-marketplace-token"
export OVSX_PAT="your-open-vsx-token"
```

Then reload: `source ~/.profile`

**Token sources:**

- `VSCE_PAT`: Azure DevOps at https://dev.azure.com/nazmul0206/_usersSettings/tokens
- `OVSX_PAT`: Open VSX at https://open-vsx.org/user-settings/tokens

**Note:** Publishing makes extensions publicly available. Only do this after thorough
testing.

### Key Points for Modifications

- ✅ Version numbers must match between `package.json` and generated `.vsix` filenames
- ✅ Scripts automatically clean up old versions - no manual file deletion needed
- ✅ Always update both the extension's version AND the extension pack version
- ✅ Both `build.sh` and `install.sh` dynamically read versions from `package.json`
- ✅ **Maintain the "One-Stop Shop"**: If shortcuts or configuration settings change in
  any extension, update the comprehensive `README.md` in `packages/r3bl-extension-pack/`.

## Creating New Extensions

**To add a new extension to the monorepo:**

### 1. Create the Extension Directory

```bash
mkdir -p packages/r3bl-new-extension/src
```

### 2. Copy Structure from Existing Extension

```bash
cp -r packages/r3bl-task-management/{package.json,tsconfig.json,webpack.config.js,.vscodeignore} packages/r3bl-new-extension/
```

### 3. Update Extension Metadata

In `packages/r3bl-new-extension/package.json`:

```json
{
    "name": "r3bl-new-extension",
    "displayName": "R3BL New Extension",
    "version": "1.0.0",
    "publisher": "R3BL",
    "description": "Description of what this extension does"
}
```

### 4. Implement Your Extension

Create the source code in `packages/r3bl-new-extension/src/`

### 5. Add Extension to Extension Pack

In `packages/r3bl-extension-pack/package.json`, add to the `extensionPack` array:

```json
{
    "version": "1.0.X", // Increment
    "extensionPack": [
        "R3BL.r3bl-theme",
        "R3BL.r3bl-auto-insert-copyright",
        "R3BL.r3bl-semantic-config",
        "R3BL.r3bl-task-management",
        "R3BL.r3bl-new-extension" // ← Add here
    ]
}
```

### 6. Update README.md

- Add the new extension to the table of contents
- Add a section under "Individual Extensions"
- Update the "Extension Pack" description
- Update the "Structure" section

### 7. Update `script_lib.sh`

Add version detection for the new extension:

```bash
NEW_EXTENSION_VERSION=$(get_version "./packages/r3bl-new-extension/package.json")
```

### 8. Update `build.sh`

Add a build section for the new extension:

```bash
# Build R3BL New Extension
echo -e "${BLUE}Building R3BL New Extension...${NC}"
cd packages/r3bl-new-extension
npm install
npm run compile
vsce package --no-dependencies
cleanup_old_versions "r3bl-new-extension" "$NEW_EXTENSION_VERSION" "."
cd ../..
```

### 9. Update `install.sh`

Add an install section for the new extension:

```bash
# Install R3BL New Extension
if command -v code &> /dev/null; then
    code --install-extension packages/r3bl-new-extension/r3bl-new-extension-${NEW_EXTENSION_VERSION}.vsix
fi
```

### 10. Build and Test

```bash
./build.sh
./install.sh
```

### 11. Commit All Changes

Do not include any AI attribution in commit messages. This means no `Co-Authored-By` lines
referencing Claude or Anthropic (regardless of model name), and no "Generated with Claude
Code" lines.

```bash
git add packages/r3bl-new-extension/ packages/r3bl-extension-pack/package.json README.md script_lib.sh build.sh install.sh
git commit -m "[extension-name] Add r3bl-new-extension"
```

### Key Points for Creating New Extensions

- ✅ New extensions must follow the same structure as existing ones
- ✅ Must be added to the extension pack's `extensionPack` array
- ✅ Must be integrated into `build.sh` and `install.sh`
- ✅ Start with version 1.0.0
- ✅ Update all documentation

## For Maintainers

**⚠️ Important:** After making changes to any extension, always run:

```bash
./build.sh
```

This generates all .vsix files with your latest changes. The build script:

- Compiles TypeScript extensions (r3bl-auto-insert-copyright, r3bl-semantic-config,
  r3bl-copy-selection-path-and-range)
- Runs unit tests for extensions that have them (r3bl-semantic-config) — test failures
  block packaging
- Packages all individual extensions
- Builds the extension pack
- Creates all .vsix artifacts in their respective directories

After building, run `./install.sh` to install the generated .vsix files. This separation
is crucial for:

- Clean separation between building and installing
- Enabling CI/CD workflows that only build artifacts
- Allowing install.sh to work with pre-built .vsix files
- Maintaining consistency across the monorepo

## Build and Package Commands

```bash
# Generate all extension .vsix artifacts
./build.sh

# Or build specific extensions manually:
npm run build:theme
npm run build:copyright
npm run build:semantic-config

# Package specific extensions:
npm run package:theme
npm run package:copyright
npm run package:semantic-config
npm run package:extension-pack

# Run unit tests (for extensions that have them):
cd packages/r3bl-semantic-config && npm test
```

## Maintaining CHANGELOG.md

**Always update CHANGELOG.md when making changes to extensions.** This keeps users
informed about what's new.

### Format and Structure

The CHANGELOG follows [Keep a Changelog](http://keepachangelog.com/) format:

```markdown
## [YYYY-MM-DD] - Brief Description

### Package Versions

- **Extension Name**: OLD_VERSION → NEW_VERSION
- **R3BL Extension Pack**: OLD_VERSION → NEW_VERSION

### Changes

- **Extension Name VERSION**: Brief description
    - Detailed bullet point about what changed
    - Another detail
    - Include technical improvements or bug fixes
```

### When to Update

Update CHANGELOG.md when:

- Making changes to any extension (new features, bug fixes, refactors)
- Updating version numbers
- Adding or removing extensions from the pack

### Example Entry

```markdown
## [2025-11-13] - Copy Selection Enhancement and Theme Refinement

### Package Versions

- **R3BL Copy Selection Path and Range**: 1.0.2 → 1.0.3
- **R3BL Theme**: 1.0.4 → 1.0.5
- **R3BL Extension Pack**: 1.0.7 → 1.0.8

### Changes

- **R3BL Copy Selection Path and Range 1.0.3**: Clickable notification feature
    - Added "Open" button to notification when copying file path and range
    - Click button to navigate directly to the copied file and selection in editor
    - Improves workflow by allowing quick navigation back to copied locations

- **R3BL Theme 1.0.5**: Improved tree structure visibility
    - Updated `tree.indentGuidesStroke` color to `#b58fa399` for better visibility
    - Enhances file explorer tree navigation experience
```

### Key Points

- ✅ Add new entry at the TOP of the changelog (most recent first)
- ✅ Use today's date in [YYYY-MM-DD] format
- ✅ List all extensions that changed with old → new versions
- ✅ Include clear descriptions of what changed and why
- ✅ Be user-focused: explain benefits, not just technical details
- ✅ Update changelog BEFORE committing

## R3BL Shared Architecture

### Why Centralized Services?

**Problem**: Each VSCode extension is bundled separately by webpack. When multiple
extensions try to show status bar messages simultaneously, they overlap and hide each
other.

**Solution**: The r3bl-shared extension owns centralized services (like the status bar
message queue), and other extensions access these services via the VSCode extension API.

### Adding New Centralized Services

When you need cross-extension state sharing (queues, caches, coordination):

**1. Create the implementation in r3bl-shared:**

```typescript
// packages/r3bl-shared/src/myServiceQueue.ts

export class MyServiceQueue {
    private static state: Map<string, any> = new Map();

    static doSomething(key: string, value: any): void {
        // Actual implementation with shared state
        this.state.set(key, value);
    }
}
```

**2. Export from r3bl-shared extension API:**

```typescript
// packages/r3bl-shared/src/extension.ts

import { MyServiceQueue } from './myServiceQueue';

export interface R3BLSharedAPI {
    showStatusBarMessage(message: string, type: StatusBarMessageType): void;
    myServiceDoSomething(key: string, value: any): void; // Add new API
}

export function activate(context: vscode.ExtensionContext): R3BLSharedAPI {
    return {
        showStatusBarMessage(message, type) {
            StatusBarMessageQueue.show(message, type);
        },
        myServiceDoSomething(key, value) {
            MyServiceQueue.doSomething(key, value);
        },
    };
}
```

**3. Use in other extensions (inline API call):**

```typescript
// In any R3BL extension
const sharedExt = vscode.extensions.getExtension('R3BL.r3bl-shared');
if (sharedExt?.isActive && sharedExt.exports?.myServiceDoSomething) {
    sharedExt.exports.myServiceDoSomething('key', 'value');
} else {
    vscode.window
        .showErrorMessage(
            'R3BL Shared extension is not active. Please ensure it is installed and enabled.',
            'Install Extension',
        )
        .then((choice) => {
            if (choice === 'Install Extension') {
                vscode.env.openExternal(
                    vscode.Uri.parse('vscode:extension/R3BL.r3bl-shared'),
                );
            }
        });
}
```

**4. Document:**

- Update `packages/r3bl-shared/README.md` with new API details
- Add to this section in CLAUDE.md

### Current Shared APIs

| API                      | Description                                    |
| ------------------------ | ---------------------------------------------- |
| `showStatusBarMessage()` | Centralized FIFO queue for status bar messages |

### When to Use Centralized Services

Only use centralized services for:

- ✅ Cross-extension coordination (message queues, job schedulers)
- ✅ Shared caches or registries
- ✅ Global locks or semaphores
- ✅ Centralized event buses

For simple utilities without shared state, just duplicate the code across extensions or
create a separate npm package.

## Claude Code Integration

### Auto-Upgrade System for `/r3bl-task` Command

The R3BL Task Management extension includes a `/r3bl-task` slash command for Claude Code
CLI. This command is automatically upgraded when the extension is updated.

#### How It Works

1. **Checksum Comparison**: On extension activation, the extension calculates SHA256
   checksums of:
    - The template file: `packages/r3bl-task-management/templates/r3bl-task-command.md`
    - The installed file: `.agent/commands/r3bl-task.md`

2. **Auto-Upgrade**: If the checksums differ (template has changed), the extension
   automatically overwrites the installed file.

3. **User Notification**: Shows an FYI message using `StatusBarMessage`:

    ```
    R3BL Task command updated
    ```

4. **Git Integration**: Since `.agent/commands/` is typically checked into git:
    - Users see the change in `git status` and `git diff`
    - Users can review changes before committing
    - Users can revert with `git checkout .agent/commands/r3bl-task.md` if needed
    - User customizations are preserved in git history

#### Why Checksums Instead of Version Numbers?

**Automatic detection**: No need to remember to bump version numbers - any template change
triggers an upgrade.

**Accurate upgrades**: Only upgrades when the template actually changes.

**Simpler code**: No version parsing logic needed.

**Git-friendly**: Users review changes in their normal git workflow, just like any other
file.

**User customizations**: If users customize the command, they can merge changes from git
when we upgrade the template.

#### Implementation Location

- **Template**: `packages/r3bl-task-management/templates/r3bl-task-command.md`
- **Logic**: `packages/r3bl-task-management/src/claudeCodeIntegration.ts`
    - `getFileSHA256()` function - Calculates SHA256 checksum
    - `checkAndUpgradeClaudeCommand()` function - Compares checksums and upgrades
- **Activation**: Called in `packages/r3bl-task-management/src/extension.ts` `activate()`

#### Updating the Command

When you make changes to the `/r3bl-task` command:

1. **Update the template**: Edit
   `packages/r3bl-task-management/templates/r3bl-task-command.md`

2. **Build and test**: Run `./build.sh` and `./install.sh`

3. **Version the extension**: Bump `packages/r3bl-task-management/package.json` version

That's it! The checksum will automatically differ, triggering upgrades for all users on
next activation.

## Quick Workflow Checklist

When modifying an extension:

- [ ] Make code changes in `packages/extension-name/src/`
- [ ] Update version in `packages/extension-name/package.json`
- [ ] Update version in `packages/r3bl-extension-pack/package.json`
- [ ] Update CHANGELOG.md with changes and new versions
- [ ] **If shortcuts or settings changed**: Update
      `packages/r3bl-extension-pack/README.md`
- [ ] **If README.md has a TOC**: Verify TOC matches actual headings after any changes
- [ ] Run `npm test` in the extension directory (if tests exist)
- [ ] Run `./build.sh` to generate artifacts (also runs tests automatically)
- [ ] Run `./install.sh` to test locally (optional)
- [ ] Commit changes with proper git add of modified files
- [ ] Push to repository
- [ ] Run `./publish.sh <ext-names>` to publish to both marketplaces (optional)

When creating a new extension:

- [ ] Create directory structure in `packages/`
- [ ] Copy configuration files from existing extension
- [ ] Update `package.json` metadata
- [ ] Implement extension in `src/`
- [ ] Add to `r3bl-extension-pack/package.json`
- [ ] Update README.md
- [ ] Update CHANGELOG.md with new extension
- [ ] Update `script_lib.sh`, `build.sh`, `install.sh`
- [ ] Run `./build.sh` and `./install.sh` to test
- [ ] Commit all changes
- [ ] Run `./publish.sh` to publish to both marketplaces

## Version Management Notes

The following files automatically read versions from `package.json`:

- `build.sh` - reads version to name .vsix files correctly
- `install.sh` - reads version to install correct .vsix files

Do NOT manually edit version numbers in scripts or .vsix filenames. The scripts handle
this automatically based on the `package.json` version fields.
