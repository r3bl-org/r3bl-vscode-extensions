# Task: Dynamic Rust Analyzer Target Status Bar Icons

## Objective

Update the `r3bl-semantic-config` rust-analyzer target switcher status bar item so the
icon dynamically changes based on the selected target triple:

- **Apple / macOS** (`apple` or `darwin`): 🍎 (Red Apple)
- **Linux** (x86 / ARM / musl): 🐧 (Penguin)
- **Windows** (`windows`): 🪟 (Window)
- **WebAssembly** (`wasm`): 🌐 (Globe with meridians)
- **Host / Default / Other**: `$(chip)` (Codicon chip)

## Requirements & Specifications

1. **`getTargetIcon(target: string | undefined): string` Helper**:
    - Pure function in `packages/r3bl-semantic-config/src/rustTargetSwitcher.ts`.
    - Empty or undefined → `$(chip)`
    - Matches `apple` or `darwin` (case-insensitive) → `🍎`
    - Matches `linux` (case-insensitive) → `🐧`
    - Matches `windows` (case-insensitive) → `🪟`
    - Matches `wasm` (case-insensitive) → `🌐`
    - Fallback → `$(chip)`

2. **Status Bar Text Rendering**:
    - Update `formatStatusBarText(target: string | undefined): string` to use
      `getTargetIcon(target)`.
    - Result format: `${icon} ${humanLabel}`.
    - Examples:
        - Host (default): `$(chip) Host`
        - macOS ARM: `🍎 macOS ARM`
        - Linux x64: `🐧 Linux x64`
        - Windows GNU: `🪟 Win-GNU x64`
        - Windows MSVC: `🪟 Win-MSVC x64`
        - Wasm32: `🌐 Wasm32`
        - Custom Linux target (e.g. `aarch64-unknown-linux-gnu`):
          `🐧 aarch64-unknown-linux-gnu`
        - Custom embedded target (e.g. `thumbv7em-none-eabihf`):
          `$(chip) thumbv7em-none-eabihf`

3. **Unit Tests**:
    - Add tests for `getTargetIcon` covering all icon mappings and edge cases (undefined,
      empty, case-insensitivity, custom triples).
    - Update `formatStatusBarText` unit tests in
      `src/__tests__/rustTargetSwitcher.test.ts` to assert the expected icons.
    - Verify `npm test` passes in `packages/r3bl-semantic-config`.

4. **Documentation & Version Bumps**:
    - Update `packages/r3bl-semantic-config/package.json` (`1.2.15` → `1.2.16`).
    - Update `packages/r3bl-extension-pack/package.json` (`1.3.28` → `1.3.29`).
    - Update `packages/r3bl-semantic-config/README.md` and
      `packages/r3bl-extension-pack/README.md` status bar indicator documentation.
    - Update `CHANGELOG.md` with today's date, package version bumps, and feature
      description.
    - Build and verify with `./build.sh r3bl-semantic-config r3bl-extension-pack` and
      `./install.sh`.

---

## File Architecture

| File                                                                     | Action     | Purpose                                                                   |
| ------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------- |
| `packages/r3bl-semantic-config/src/rustTargetSwitcher.ts`                | **Modify** | Add `getTargetIcon` and update `formatStatusBarText`                      |
| `packages/r3bl-semantic-config/src/__tests__/rustTargetSwitcher.test.ts` | **Modify** | Add unit tests for `getTargetIcon` and update `formatStatusBarText` tests |
| `packages/r3bl-semantic-config/package.json`                             | **Modify** | Bump version `1.2.15` → `1.2.16`                                          |
| `packages/r3bl-extension-pack/package.json`                              | **Modify** | Bump version `1.3.28` → `1.3.29`                                          |
| `packages/r3bl-semantic-config/README.md`                                | **Modify** | Update Feature 8 docs to describe dynamic status bar icons                |
| `packages/r3bl-extension-pack/README.md`                                 | **Modify** | Update Rust section status bar docs                                       |
| `CHANGELOG.md`                                                           | **Modify** | Document release entry for version bumps and dynamic icons                |

---

## Implementation Checklist

- [x] **Step 1**: Add `getTargetIcon` and update `formatStatusBarText` in
      `packages/r3bl-semantic-config/src/rustTargetSwitcher.ts`.
- [x] **Step 2**: Add unit tests in
      `packages/r3bl-semantic-config/src/__tests__/rustTargetSwitcher.test.ts` and verify
      with `npm test`.
- [x] **Step 3**: Update documentation in `packages/r3bl-semantic-config/README.md` and
      `packages/r3bl-extension-pack/README.md`.
- [x] **Step 4**: Bump versions in `packages/r3bl-semantic-config/package.json` (`1.2.16`)
      and `packages/r3bl-extension-pack/package.json` (`1.3.29`).
- [x] **Step 5**: Add entry in `CHANGELOG.md`.
- [x] **Step 6**: Run `./build.sh r3bl-semantic-config r3bl-extension-pack` and verify
      packaging.
- [x] **Step 7**: Run `./install.sh` to install updated extensions locally.
- [x] **Step 8**: Enforce strictly project-scoped configuration guardrails, multi-scope
      reset cleanup, and document nuances.
