# Feature: Switch rust-analyzer Cargo Target

## Objective

Add a command and status bar item to `r3bl-semantic-config` that allows developers to
easily switch the active `rust-analyzer.cargo.target` via a curated QuickPick dropdown,
revert to the host/default target, or enter a custom target triple.

## User Experience & Requirements

### 1. Curated Dropdown Options

When invoking `R3BL: Switch Rust Target (rust-analyzer)`
(`r3bl-semantic-config.switchRustTarget`):

1. **Host / Default**:
    - Clears `rust-analyzer.cargo.target` (resets to `undefined` / native host machine).
2. **macOS (ARM)**:
    - `aarch64-apple-darwin` (Apple Silicon M1/M2/M3/M4)
3. **Linux (x86)**:
    - `x86_64-unknown-linux-gnu` (Standard Linux 64-bit)
4. **Windows (x86)**:
    - `x86_64-pc-windows-gnu` (MinGW / GNU toolchain)
    - `x86_64-pc-windows-msvc` (Visual Studio / MSVC toolchain)
5. **Custom Target...**:
    - Prompts for arbitrary target triple via `vscode.window.showInputBox`.

### 2. Active Target Highlighting

- Inspect current `rust-analyzer.cargo.target`.
- Mark the currently active target with a checkmark `$(check)` and `(Current)` label.
- If the current target is an arbitrary custom triple not in the curated list, display it
  prominently at the top as the active target.

### 3. Status Bar Indicator

- Displays current target in the status bar:
    - Target set: `$(chip) Linux x64`
    - Host / default: `$(chip) Host`
- Tooltip: `rust-analyzer cargo target: <target>\nClick to switch target`
- Clicking executes `r3bl-semantic-config.switchRustTarget`.
- Visible when editing Rust files or in a Rust workspace.
- Configurable via `r3bl-semantic-config.cargoTarget.showInStatusBar` (default: `true`).

### 4. Application & rust-analyzer Reload

- Updates configuration at `vscode.ConfigurationTarget.Workspace` if a workspace is open,
  otherwise `vscode.ConfigurationTarget.Global`.
- Executes `rust-analyzer.reloadWorkspace` command to immediately reload project metadata
  and diagnostics with the selected target.
- Shows status bar feedback using `showStatusBarMessage` from `r3bl-common-code`:
  `Rust target set to <target>`.

---

## File Architecture

| File                                                                     | Action     | Purpose                                                                                                   |
| ------------------------------------------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------- |
| `packages/r3bl-semantic-config/src/rustTargetSwitcher.ts`                | **Create** | Core logic for target switching, QuickPick menu construction, input box prompt, and status bar management |
| `packages/r3bl-semantic-config/src/__tests__/rustTargetSwitcher.test.ts` | **Create** | Unit tests for QuickPick item generation, active target detection, and scope resolution                   |
| `packages/r3bl-semantic-config/src/extension.ts`                         | **Modify** | Register command and initialize target switcher status bar                                                |
| `packages/r3bl-semantic-config/package.json`                             | **Modify** | Register command, configurations, and increment version (`1.2.14` → `1.2.15`)                             |
| `packages/r3bl-extension-pack/package.json`                              | **Modify** | Increment version (`1.0.18` → `1.0.19`)                                                                   |
| `packages/r3bl-semantic-config/README.md`                                | **Modify** | Document Feature 8: Switch rust-analyzer Cargo Target                                                     |
| `packages/r3bl-extension-pack/README.md`                                 | **Modify** | Update Rust development section with target switcher capability                                           |
| `README.md`                                                              | **Modify** | Update extension documentation overview if applicable                                                     |
| `CHANGELOG.md`                                                           | **Modify** | Add release entry for the new feature and version bumps                                                   |

---

## Implementation Steps

- [x] **Step 1**: Create `rustTargetSwitcher.ts` with pure helper functions, QuickPick
      builder, command handler, and status bar item manager.
- [x] **Step 2**: Add unit tests in `src/__tests__/rustTargetSwitcher.test.ts` and verify
      with `npm test`.
- [x] **Step 3**: Integrate command and status bar lifecycle in
      `packages/r3bl-semantic-config/src/extension.ts`.
- [x] **Step 4**: Update `packages/r3bl-semantic-config/package.json` with commands,
      configuration properties, and version bump (`1.2.15`).
- [x] **Step 5**: Update `packages/r3bl-semantic-config/README.md`,
      `packages/r3bl-extension-pack/README.md`, and root `README.md`.
- [x] **Step 6**: Update `packages/r3bl-extension-pack/package.json` version bump
      (`1.3.28`).
- [x] **Step 7**: Update `CHANGELOG.md` with new version sections and feature details.
- [x] **Step 8**: Run `./build.sh` to compile, test, and package all extensions, followed
      by `./install.sh` for verification.
