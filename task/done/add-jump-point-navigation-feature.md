# Plan: Jump Point Navigation (Definition Journey Stack) in `r3bl-semantic-config`

## Overview

Add a lightweight, fast, and reliable **Jump Point Navigation** feature to `r3bl-semantic-config` so developers can trace a "Go to Definition" journey across types, functions, and methods, and easily backtrack or forward-track along that journey.

### Core Workflow & Shortcuts

1. **`Alt+U` (`r3bl-semantic-config.jumpAndRecord`) — Add to Journey & Jump to Definition**:
   - Captures the current cursor location (origin) and executes VSCode's native `editor.action.revealDefinition`.
   - If the list is currently empty (or if the user initiated `Alt+U` from a location different from the last recorded jump point), records the **origin** location first so the user can always backtrack all the way to where they started.
   - Records the **destination** (the definition landed on) at the bottom of the jump list and sets it as the current active step (`currentIndex`).
   - Shows a transient status bar message via `showStatusBarMessage` (e.g., `Jump #2: struct DialogBuffer`).

2. **`Alt+Shift+U` (`r3bl-semantic-config.showJumpPoints`) — Show Jump Journey Popup**:
   - Opens a `QuickPick` showing all recorded jump points in chronological order (`1..N`, first jump at the top, latest jump at the bottom).
   - Marks the current position in the journey with `$(arrow-right)` (`→`) and pre-selects (`activeItems`) that row so pressing `Up`/`Down` + `Enter` immediately backtracks or forward-tracks.
   - Each jump point row includes a `[🗑️]` item button (`QuickInputButton` with `ThemeIcon("trash")`) to remove individual jump points in-place without needing any custom `Delete` keybinding.
   - Below a horizontal separator (`QuickPickItemKind.Separator`), provides two bottom action rows:
     - `$(search) Open Journey in Search Editor (.code-search)` — writes all jump points with surrounding code context to `/tmp/jump-journey-<timestamp>.code-search` and opens it in a VSCode Search Editor tab.
     - `$(clear-all) Clear All Jump Points` — clears the entire jump list and closes the popup.

---

## QuickPick UI Layout

What renders on screen when pressing `Alt+Shift+U`:

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Navigate jump journey                                                    │
├──────────────────────────────────────────────────────────────────────────┤
│   1. fn apply_event                    src/editor_engine.rs:142     [🗑️] │
│      let buffer = DialogBuffer::new();                                   │
│   2. struct DialogBuffer               src/dialog_buffer.rs:18      [🗑️] │
│      pub struct DialogBuffer {                                           │
│ ▶ 3. → struct ColorWheel               src/color_wheel.rs:45        [🗑️] │
│      pub struct ColorWheel {                                             │
├──────────────────────────────────────────────────────────────────────────┤
│   🔍 Open Journey in Search Editor (.code-search)                        │
│   🧹 Clear All Jump Points                                               │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Files to Modify / Create

| File | Action | Purpose |
| :--- | :--- | :--- |
| `packages/r3bl-semantic-config/package.json` | **Modify** | Register `jumpAndRecord` (`Alt+U`) and `showJumpPoints` (`Alt+Shift+U`) commands & keybindings; bump version |
| `packages/r3bl-semantic-config/src/jumpPointNavigator.ts` | **Create** | Pure state management (`JumpJourneyState`), QuickPick UI, `Alt+U` handler, and `.code-search` generator |
| `packages/r3bl-semantic-config/src/extension.ts` | **Modify** | Register `r3bl-semantic-config.jumpAndRecord` and `r3bl-semantic-config.showJumpPoints` |
| `packages/r3bl-semantic-config/src/__tests__/jumpPointNavigator.test.ts` | **Create** | Unit tests for journey state transitions, deduplication, label extraction, and `.code-search` formatting |
| `packages/r3bl-semantic-config/src/__tests__/__mocks__/vscode.ts` | **Modify** | Add `QuickPickItemKind` and `ThemeIcon` mocks if needed for unit tests |
| `packages/r3bl-semantic-config/README.md` | **Modify** | Add Feature 10 section, update top feature list, both TOCs, and Commands table |
| `packages/r3bl-extension-pack/README.md` | **Modify** | Add `Alt+U` and `Alt+Shift+U` to Keyboard Shortcuts, update feature highlights & Rust coding section |
| `README.md` | **Modify** | Update `R3BL Semantic Configuration` summary in the Individual Extensions table |
| `packages/r3bl-extension-pack/package.json` | **Modify** | Bump extension pack version (`1.3.35` → `1.4.0`) |
| `CHANGELOG.md` | **Modify** | Add `[2026-10-28]` release entry at top + update TOC |

---

## Detailed Design

### 1. Data Model & Pure State Management (`src/jumpPointNavigator.ts`)

```typescript
export interface JumpPoint {
    id: string
    uriString: string
    fsPath: string
    relativePath: string // Workspace-relative path for display & .code-search
    line: number // 0-indexed line number
    character: number // 0-indexed character column
    symbolLabel: string // Identifier under cursor or concise label (e.g., "DialogBuffer")
    linePreview: string // Trimmed line text at the jump point
}

export class JumpJourneyManager {
    private points: JumpPoint[] = []
    private currentIndex: number = -1

    getPoints(): readonly JumpPoint[]
    getCurrentIndex(): number
    recordJump(origin: JumpPoint, destination: JumpPoint): void
    navigateToIndex(index: number): JumpPoint | undefined
    removeAtIndex(index: number): void
    clear(): void
}
```

#### Recording Logic (`recordJump(origin, destination)`):
- **No-op Guard**: If `origin.uriString === destination.uriString && origin.line === destination.line`, the definition jump did not move to a new line (either already at definition or no definition found). Do not add duplicate entries.
- **Origin Capture**:
  - If `points` is empty, push `origin` first (`#1`), then push `destination` (`#2`).
  - If `points` is non-empty, check whether `origin` is already in the same file and near the currently active jump point (or last jump point). If the user jumped from a completely different file/location that isn't already the last recorded jump point, append `origin` before `destination` so the starting context isn't lost. Otherwise, only append `destination`.
- **Consecutive Duplicate Guard**: If the last item in `points` already has the same `uriString` and `line` as `destination`, simply update `currentIndex = points.length - 1` rather than adding a duplicate row.
- **Always Append at Bottom**: New jumps are appended to the bottom of `points`, and `currentIndex` is set to `points.length - 1`.

### 2. Capturing Location Snapshot & Performing Jump (`jumpAndRecord`)

```typescript
export async function jumpAndRecord(): Promise<void> {
    const editorBefore = vscode.window.activeTextEditor
    if (!editorBefore) {
        showStatusBarMessage("No active editor", "warning")
        return
    }

    const originSnapshot = captureJumpPoint(editorBefore)

    // Execute native Go to Definition
    await vscode.commands.executeCommand("editor.action.revealDefinition")

    const editorAfter = vscode.window.activeTextEditor
    if (!editorAfter) {
        return
    }

    const destSnapshot = captureJumpPoint(editorAfter)

    if (
        originSnapshot.uriString === destSnapshot.uriString &&
        originSnapshot.line === destSnapshot.line
    ) {
        showStatusBarMessage("No new definition location jumped to", "info")
        return
    }

    journeyManager.recordJump(originSnapshot, destSnapshot)
    const total = journeyManager.getPoints().length
    showStatusBarMessage(
        `Jump #${total}: ${destSnapshot.symbolLabel} (${path.basename(destSnapshot.fsPath)}:${destSnapshot.line + 1})`,
        "info",
    )
}
```

### 3. Navigating & Managing the Journey (`showJumpPoints`)

- Uses `vscode.window.createQuickPick<JumpQuickPickItem>()`:
  - If `journeyManager.getPoints().length === 0`, shows `showStatusBarMessage("No jump points recorded yet (use Alt+U to jump)", "info")` and returns early.
  - Builds one `JumpQuickPickItem` per `JumpPoint`:
    - `label`: `${index + 1}. ${isCurrent ? "$(arrow-right) " : ""}${point.symbolLabel}`
    - `description`: `${point.relativePath}:${point.line + 1}`
    - `detail`: `    ${point.linePreview}`
    - `buttons`: `[{ iconPath: new vscode.ThemeIcon("trash"), tooltip: "Remove Jump Point" }]`
  - Appends a separator (`QuickPickItemKind.Separator`) and two action items:
    - `action: "dump-code-search"` -> `label: "$(search) Open Journey in Search Editor (.code-search)"`
    - `action: "clear-all"` -> `label: "$(clear-all) Clear All Jump Points"`
  - Sets `quickPick.activeItems = [items[currentIndex]]` so the current step in the journey is highlighted immediately upon opening.
  - **`onDidAccept`**:
    - If a jump point is selected: updates `currentIndex`, opens `vscode.Uri.parse(point.uriString)`, moves cursor to `(point.line, point.character)`, and centers the line with `vscode.TextEditorRevealType.InCenter`.
    - If `dump-code-search` is selected: generates the `.code-search` content, writes it to `/tmp/jump-journey-<timestamp>.code-search`, and opens it in an editor tab.
    - If `clear-all` is selected: calls `journeyManager.clear()` and shows `"Cleared all jump points"`.
  - **`onDidTriggerItemButton`**:
    - Removes the clicked item via `journeyManager.removeAtIndex(item.pointIndex)`.
    - If no points remain, hides the QuickPick and shows `"All jump points removed"`.
    - Otherwise, rebuilds `quickPick.items` and preserves `activeItems` at the adjusted `currentIndex` without closing the popup.

### 4. `.code-search` Export Format

Matches the VSCode Search Editor syntax used in `r3bl-fuzzy-search`:

```text
# Jump Journey (3 steps)
# Generated: 2026-10-28T09-35-00
#

src/editor_engine.rs:
  140   pub fn apply_event(&mut self) {
  141       // Step 1
  142:      let buffer = DialogBuffer::new();
  143   }

src/dialog_buffer.rs:
   17   // Step 2
   18:  pub struct DialogBuffer {
   19       pub wheel: ColorWheel,
   20   }
```

- Includes 2 lines of surrounding context before and after each jump line (when available in the file), with `:` on the exact jump line and spaces on context lines (standard `.code-search` format so VSCode highlights the target line and makes every line clickable).

### 5. Documentation & Changelog Updates

Because this is a major new feature, all documentation and release history files must be thoroughly updated:

1. **`packages/r3bl-semantic-config/README.md`**:
   - Add **10. Jump Point Navigation (Definition Journey Stack)** to the top summary list.
   - Update both the top DocToc Table of Contents and the inline `## Table of Contents` section.
   - Add a comprehensive **`## Feature 10: Jump Point Navigation (Definition Journey Stack)`** section covering:
     - **What It Does**: Tracing a Go to Definition journey across functions, methods, and types with backtracking and forward-tracking.
     - **Keybindings**: `Alt+U` (Jump to Definition & Record) and `Alt+Shift+U` (Show Jump Journey Popup).
     - **How It Works**: Automatic origin capture on the first jump, `"You Are Here"` (`→`) tracking, per-item `[🗑️]` removal, `.code-search` Search Editor dump, and Clear All.
   - Add `R3BL: Jump to Definition and Record Jump Point` (`r3bl-semantic-config.jumpAndRecord`) and `R3BL: Show Jump Points` (`r3bl-semantic-config.showJumpPoints`) to the **`## Commands`** table.
2. **`packages/r3bl-extension-pack/README.md`**:
   - Update the `R3BL Semantic Configuration` description in the **Included Extensions** table and **What You Get** / **High-Performance Rust Coding** sections to mention Jump Point Navigation.
   - Add `Alt+U` and `Alt+Shift+U` to the **`## Keyboard Shortcuts`** table.
3. **`README.md` (Root)**:
   - Update the `R3BL Semantic Configuration` description in the **Individual Extensions** table to include Jump Point Navigation.
4. **`CHANGELOG.md` & Version Bumps**:
   - Bump `packages/r3bl-semantic-config/package.json` (`1.2.18` → `1.3.0`, minor bump for significant new feature).
   - Bump `packages/r3bl-extension-pack/package.json` (`1.3.35` → `1.4.0`).
   - Prepend a new `[2026-10-28] - Jump Point Navigation (Definition Journey Stack)` section at the top of `CHANGELOG.md` (and update its TOC) detailing the new commands, keybindings, QuickPick workflow, and `.code-search` export.

---

## Implementation Checklist

- [x] **Step 1**: Create `packages/r3bl-semantic-config/src/jumpPointNavigator.ts` with `JumpJourneyManager`, `captureJumpPoint`, `generateJourneyCodeSearch`, `jumpAndRecord`, and `showJumpPoints`.
- [x] **Step 2**: Register `r3bl-semantic-config.jumpAndRecord` (`Alt+U`) and `r3bl-semantic-config.showJumpPoints` (`Alt+Shift+U`) in `packages/r3bl-semantic-config/package.json` and `packages/r3bl-semantic-config/src/extension.ts`.
- [x] **Step 3**: Add comprehensive unit tests in `packages/r3bl-semantic-config/src/__tests__/jumpPointNavigator.test.ts` covering:
  - Recording first jump (origin + destination)
  - Drilling down from current destination (appends destination only)
  - Jumping from a new unrecorded location mid-session (records new origin + destination)
  - Ignoring no-op jumps (same file & line)
  - Backtracking and forward-tracking (`currentIndex` updates)
  - Removing items and adjusting `currentIndex`
  - Clearing all items
  - Generating `.code-search` output
- [x] **Step 4**: Bump versions and update documentation:
  - Bump `packages/r3bl-semantic-config/package.json` (`1.2.18` → `1.3.0`) and `packages/r3bl-extension-pack/package.json` (`1.3.35` → `1.4.0`)
  - Update `packages/r3bl-semantic-config/README.md` (Feature 10 section, TOCs, Commands table)
  - Update `packages/r3bl-extension-pack/README.md` (Keyboard Shortcuts table, feature descriptions)
  - Update root `README.md`
  - Update `CHANGELOG.md` (new top entry + TOC)
- [x] **Step 5**: Run `./build.sh r3bl-semantic-config r3bl-extension-pack` and verify all unit tests pass and `.vsix` packages build cleanly.
