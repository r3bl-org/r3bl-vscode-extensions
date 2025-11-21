# Detailed Plan: Migrating Notifications to Status Bar Messages

## Executive Summary

**Total Notifications Found**: 44 across all extensions

**Recommended for Status Bar Migration**: 30 notifications (68%)
- 25 purely informational messages
- 5 non-critical error messages

**Must Remain as Notifications**: 14 notifications (32%)
- 5 interactive informational (with buttons requiring user choice)
- 2 interactive warnings (with buttons)
- 2 interactive errors (with buttons)
- 5 critical errors (dependency missing, system failures)

---

## Implementation Strategy

### 1. User Configuration Settings

All R3BL extensions will share the same user settings for feedback behavior. This provides a consistent experience across all R3BL extensions and simplifies configuration.

**Global settings for all R3BL extensions:**
- `r3bl.transientFeedbackMechanism` - Controls how all R3BL extensions display transient/dismissable feedback
- `r3bl.statusbarMessageMaxLength` - Controls truncation length for all R3BL extensions

**Settings to add to ONE extension's `package.json` (recommended: r3bl-extension-pack):**

```json
{
  "contributes": {
    "configuration": {
      "title": "R3BL Extensions",
      "properties": {
        "r3bl.transientFeedbackMechanism": {
          "type": "string",
          "enum": ["none", "notification", "statusbar"],
          "default": "statusbar",
          "description": "How to display transient/dismissable feedback messages across all R3BL extensions (does not affect interactive notifications with buttons)",
          "enumDescriptions": [
            "Don't show any transient feedback messages",
            "Show feedback as VSCode notifications (classic behavior, may linger)",
            "Show feedback in the status bar (auto-dismisses, less intrusive)"
          ]
        },
        "r3bl.statusbarMessageMaxLength": {
          "type": "number",
          "default": 50,
          "minimum": 20,
          "maximum": 200,
          "description": "Maximum characters to display in status bar before truncating with '...' (applies to all R3BL extensions)"
        }
      }
    }
  }
}
```

**Key Benefits:**
- Single configuration point for all R3BL extensions
- Consistent behavior across the entire extension family
- Simpler user experience - configure once, applies everywhere
- Settings stored in user's settings.json (not project-specific)
- Clear distinction: transient feedback is configurable, interactive notifications remain unchanged

### 2. Create Shared Status Bar Utility

Create a new shared utility module that all extensions can use:

**File**: `packages/shared/statusBarMessage.ts` (new file)

```typescript
import * as vscode from 'vscode';

export enum StatusBarMessageType {
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Error = 'error'
}

export type FeedbackMechanism = 'none' | 'notification' | 'statusbar';

export class StatusBarMessage {
  private static statusBarItem: vscode.StatusBarItem | undefined;
  private static hideTimeout: NodeJS.Timeout | undefined;

  /**
   * Show a dismissable feedback message using the user's preferred mechanism
   * @param message The message to display
   * @param type The type of message (affects icon and color)
   * @param durationMs How long to show status bar messages (default: 3000ms)
   */
  static show(
    message: string,
    type: StatusBarMessageType = StatusBarMessageType.Info,
    durationMs: number = 3000
  ): void {
    // Read user preferences (shared across all R3BL extensions)
    const config = vscode.workspace.getConfiguration('r3bl');
    const feedbackMechanism = config.get<FeedbackMechanism>(
      'transientFeedbackMechanism',
      'statusbar'
    );

    // Handle based on user preference
    switch (feedbackMechanism) {
      case 'none':
        // Don't show any feedback
        return;

      case 'notification':
        // Use classic notification behavior
        this.showAsNotification(message, type);
        break;

      case 'statusbar':
      default:
        // Use status bar (default)
        const maxLength = config.get<number>(
          'statusbarMessageMaxLength',
          50
        );
        this.showInStatusBar(message, type, durationMs, maxLength);
        break;
    }
  }

  /**
   * Show message as a classic VSCode notification
   */
  private static showAsNotification(message: string, type: StatusBarMessageType): void {
    switch (type) {
      case StatusBarMessageType.Error:
        vscode.window.showErrorMessage(message);
        break;
      case StatusBarMessageType.Warning:
        vscode.window.showWarningMessage(message);
        break;
      case StatusBarMessageType.Success:
      case StatusBarMessageType.Info:
      default:
        vscode.window.showInformationMessage(message);
        break;
    }
  }

  /**
   * Show message in the status bar with auto-dismiss
   */
  private static showInStatusBar(
    message: string,
    type: StatusBarMessageType,
    durationMs: number,
    maxLength: number
  ): void {
    // Clear any existing timeout
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }

    // Create status bar item if it doesn't exist
    if (!this.statusBarItem) {
      this.statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
      );
    }

    // Truncate message if needed
    const displayMessage = this.truncateMessage(message, maxLength);

    // Set icon based on type
    const icon = this.getIcon(type);
    const color = this.getColor(type);

    this.statusBarItem.text = `${icon} ${displayMessage}`;
    this.statusBarItem.color = color;
    this.statusBarItem.tooltip = message; // Full message in tooltip
    this.statusBarItem.show();

    // Auto-hide after duration
    this.hideTimeout = setTimeout(() => {
      this.hide();
    }, durationMs);
  }

  /**
   * Truncate message to fit within max length
   */
  private static truncateMessage(message: string, maxLength: number): string {
    if (message.length <= maxLength) {
      return message;
    }
    return message.substring(0, maxLength - 3) + '...';
  }

  /**
   * Manually hide the status bar message
   */
  static hide(): void {
    if (this.statusBarItem) {
      this.statusBarItem.hide();
    }
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = undefined;
    }
  }

  /**
   * Dispose of the status bar item (call on extension deactivation)
   */
  static dispose(): void {
    this.hide();
    if (this.statusBarItem) {
      this.statusBarItem.dispose();
      this.statusBarItem = undefined;
    }
  }

  private static getIcon(type: StatusBarMessageType): string {
    switch (type) {
      case StatusBarMessageType.Success:
        return '$(check)';
      case StatusBarMessageType.Warning:
        return '$(warning)';
      case StatusBarMessageType.Error:
        return '$(error)';
      case StatusBarMessageType.Info:
      default:
        return '$(info)';
    }
  }

  private static getColor(type: StatusBarMessageType): string | undefined {
    switch (type) {
      case StatusBarMessageType.Error:
        return new vscode.ThemeColor('errorForeground');
      case StatusBarMessageType.Warning:
        return new vscode.ThemeColor('editorWarning.foreground');
      case StatusBarMessageType.Success:
        return new vscode.ThemeColor('terminal.ansiGreen');
      default:
        return undefined; // Use default color
    }
  }
}
```

### 3. Update Each Extension's package.json

Add dependency on shared package (or copy utility into each extension):

```json
{
  "dependencies": {
    "../shared": "*"
  }
}
```

Or alternatively, copy the utility file into each extension's `src/utils/` directory.

---

## Extension-by-Extension Migration Plan

### 1. **R3BL Auto Insert Copyright** (v1.0.X → v1.1.0)

**Files to modify**: `packages/r3bl-auto-insert-copyright/src/extension.ts`

**Changes**: 2 notifications → Status bar messages

| Line | Current | New | Duration |
|------|---------|-----|----------|
| 20 | `showInformationMessage('Copyright Added')` | `StatusBarMessage.show('Copyright Added', StatusBarMessageType.Success)` | 3s |
| 22 | `showInformationMessage('Copyright could not be added to this file.')` | `StatusBarMessage.show('Copyright could not be added to this file', StatusBarMessageType.Warning)` | 4s |

**Impact**: 100% of notifications migrated (2/2)

---

### 2. **R3BL Copy Selection Path and Range** (v1.0.X → v1.1.0)

**Files to modify**: `packages/r3bl-copy-selection-path-and-range/src/extension.ts`

**Changes**: 3 notifications → Status bar messages

| Line | Current | New | Duration |
|------|---------|-----|----------|
| 36 | `showErrorMessage('No active editor')` | `StatusBarMessage.show('No active editor', StatusBarMessageType.Error)` | 3s |
| 45 | `showErrorMessage('No workspace folder found')` | `StatusBarMessage.show('No workspace folder found', StatusBarMessageType.Error)` | 3s |
| 79 | `showInformationMessage(\`Copied: ${output}\`)` | `StatusBarMessage.show(\`Copied: ${output}\`, StatusBarMessageType.Success)` | 3s |
| 84 | `showInformationMessage('No copy history available')` | `StatusBarMessage.show('No copy history available', StatusBarMessageType.Info)` | 3s |

**Keep as notification**: None

**Impact**: 100% of pure informational notifications migrated (4/4)

---

### 3. **R3BL Semantic Config** (v1.0.X → v1.1.0)

**Files to modify**: `packages/r3bl-semantic-config/src/extension.ts`

**Changes**: 8 notifications → Status bar messages

| Line | Current | New | Duration |
|------|---------|-----|----------|
| 104 | `showInformationMessage('R3BL Semantic Highlighting enabled!')` | `StatusBarMessage.show('R3BL Semantic Highlighting enabled', StatusBarMessageType.Success)` | 3s |
| 110 | `showInformationMessage('R3BL Semantic Highlighting disabled!')` | `StatusBarMessage.show('R3BL Semantic Highlighting disabled', StatusBarMessageType.Success)` | 3s |
| 209 | `showInformationMessage('Disabled rust-analyzer.checkOnSave...')` | `StatusBarMessage.show('Disabled rust-analyzer.checkOnSave (debounced flycheck handling)', StatusBarMessageType.Info)` | 4s |
| 213 | `showErrorMessage(\`Failed to disable rust-analyzer.checkOnSave: ${error}\`)` | `StatusBarMessage.show(\`Failed to disable rust-analyzer.checkOnSave: ${error}\`, StatusBarMessageType.Error)` | 5s |
| 298 | `showInformationMessage('R3BL semantic highlighting applied successfully!')` | `StatusBarMessage.show('R3BL semantic highlighting applied', StatusBarMessageType.Success)` | 3s |
| 300 | `showErrorMessage(\`Failed to apply semantic config: ${error}\`)` | `StatusBarMessage.show(\`Failed to apply semantic config: ${error}\`, StatusBarMessageType.Error)` | 5s |
| 312 | `showInformationMessage('R3BL semantic highlighting removed successfully!')` | `StatusBarMessage.show('R3BL semantic highlighting removed', StatusBarMessageType.Success)` | 3s |
| 314 | `showErrorMessage(\`Failed to remove semantic config: ${error}\`)` | `StatusBarMessage.show(\`Failed to remove semantic config: ${error}\`, StatusBarMessageType.Error)` | 5s |
| 342 | `showErrorMessage(\`Failed to check for duplicate settings: ${error}\`)` | `StatusBarMessage.show(\`Failed to check for duplicate settings: ${error}\`, StatusBarMessageType.Error)` | 5s |

**Keep as notifications** (3 interactive):
- Line 119-126: Theme detection prompt (Yes/No buttons) - **KEEP**
- Line 330-338: Duplicate settings warning (Open Settings/Ignore buttons) - **KEEP**

**Impact**: 82% of notifications migrated (9/11)

---

### 4. **R3BL Task Management** (v1.0.X → v1.1.0)

**Files to modify**:
- `packages/r3bl-task-management/src/extension.ts`
- `packages/r3bl-task-management/src/ui.ts`
- `packages/r3bl-task-management/src/claudeCodeIntegration.ts`
- `packages/r3bl-task-management/src/taskSpaceManager.ts`

#### `extension.ts` - 4 notifications → Status bar messages

| Line | Current | New | Duration |
|------|---------|-----|----------|
| 29-31 | `showInformationMessage('No task files found in task/ directory...')` | `StatusBarMessage.show('No task files found in task/ directory', StatusBarMessageType.Info)` | 4s |
| 33-35 | `showInformationMessage('All task files are already linked to task spaces.')` | `StatusBarMessage.show('All task files already linked', StatusBarMessageType.Info)` | 3s |
| 98-100 | `showInformationMessage(\`Created task space "${name}" linked to ${path.basename(selected.taskFile)}\`)` | `StatusBarMessage.show(\`Created task space "${name}"\`, StatusBarMessageType.Success)` | 3s |
| 102 | `showErrorMessage(\`Failed to create task space: ${error}\`)` | `StatusBarMessage.show(\`Failed to create task space: ${error}\`, StatusBarMessageType.Error)` | 5s |

#### `ui.ts` - 8 notifications → Status bar messages

| Line | Current | New | Duration |
|------|---------|-----|----------|
| 190 | `showInformationMessage('No .md files found in task/ directory')` | `StatusBarMessage.show('No .md files in task/ directory', StatusBarMessageType.Info)` | 3s |
| 194 | `showInformationMessage('task/ directory not found')` | `StatusBarMessage.show('task/ directory not found', StatusBarMessageType.Info)` | 3s |
| 210-212 | `showInformationMessage(\`Task space "${name}" created with ${taskSpace.tabs.length} tab(s)\`)` | `StatusBarMessage.show(\`Task space "${name}" created (${taskSpace.tabs.length} tabs)\`, StatusBarMessageType.Success)` | 3s |
| 219 | `showErrorMessage(\`Failed to create task space: ${error}\`)` | `StatusBarMessage.show(\`Failed to create task space: ${error}\`, StatusBarMessageType.Error)` | 5s |
| 233 | `showInformationMessage(\`Already in task space "${taskSpace.name}"\`)` | `StatusBarMessage.show(\`Already in "${taskSpace.name}"\`, StatusBarMessageType.Info)` | 3s |
| 275-277 | `showInformationMessage(\`Switched to "${taskSpace.name}" (${taskSpace.tabs.length} tabs)\`)` | `StatusBarMessage.show(\`Switched to "${taskSpace.name}" (${taskSpace.tabs.length} tabs)\`, StatusBarMessageType.Success)` | 3s |
| 279 | `showErrorMessage(\`Failed to switch task space: ${error}\`)` | `StatusBarMessage.show(\`Failed to switch task space: ${error}\`, StatusBarMessageType.Error)` | 5s |
| 315 | `showInformationMessage(\`Task space "${taskSpace.name}" deleted\`)` | `StatusBarMessage.show(\`Task space "${taskSpace.name}" deleted\`, StatusBarMessageType.Success)` | 3s |
| 317 | `showErrorMessage(\`Failed to delete task space: ${error}\`)` | `StatusBarMessage.show(\`Failed to delete task space: ${error}\`, StatusBarMessageType.Error)` | 5s |
| 359 | `showInformationMessage(\`Task space renamed to "${newName}"\`)` | `StatusBarMessage.show(\`Task space renamed to "${newName}"\`, StatusBarMessageType.Success)` | 3s |
| 361 | `showErrorMessage(\`Failed to rename task space: ${error}\`)` | `StatusBarMessage.show(\`Failed to rename task space: ${error}\`, StatusBarMessageType.Error)` | 5s |

**Keep as notification**:
- Line 298-302: Delete confirmation (modal with Delete button) - **KEEP**

#### `claudeCodeIntegration.ts` - 2 notifications → Status bar, 4 keep as notifications

| Line | Current | New | Duration |
|------|---------|-----|----------|
| 31-33 | `showErrorMessage('Cannot install Claude Code integration: No workspace folder open')` | `StatusBarMessage.show('Cannot install: No workspace folder open', StatusBarMessageType.Error)` | 4s |
| 46-48 | `showErrorMessage('Cannot install Claude Code integration: Template file not found')` | `StatusBarMessage.show('Cannot install: Template file not found', StatusBarMessageType.Error)` | 4s |

**Keep as notifications** (4 interactive):
- Line 59-67: Created .claude directory (Learn More button) - **KEEP**
- Line 76-79: Integration installed (Open Command File button) - **KEEP**
- Line 88-90: Failed to install (system error) - **KEEP as notification** (critical)
- Line 118-123: Enable integration prompt (Install/Not Now/Don't Ask Again) - **KEEP**

#### `taskSpaceManager.ts` - 1 notification stays as status bar

| Line | Current | New | Duration |
|------|---------|-----|----------|
| 198-200 | `showWarningMessage(\`Task space deleted but could not move file...\`)` | `StatusBarMessage.show(\`Task space deleted but file move failed\`, StatusBarMessageType.Warning)` | 5s |

**Impact**: 76% of notifications migrated (13/17)

---

### 5. **R3BL Fuzzy Search** (v1.0.X → v1.1.0)

**Files to modify**:
- `packages/r3bl-fuzzy-search/src/extension.ts`
- `packages/r3bl-fuzzy-search/src/interactiveSearch.ts`
- `packages/r3bl-fuzzy-search/src/searchPanel.ts`
- `packages/r3bl-fuzzy-search/src/searchCommand.ts`

#### All files combined - 6 notifications → Status bar messages

| File | Line | Current | New | Duration |
|------|------|---------|-----|----------|
| extension.ts | 22 | `showErrorMessage('Please open a folder first')` | `StatusBarMessage.show('Please open a folder first', StatusBarMessageType.Error)` | 3s |
| interactiveSearch.ts | 166-168 | `showInformationMessage(\`Found ${currentResults.length} results in ${uniqueFiles} files\`)` | `StatusBarMessage.show(\`Found ${currentResults.length} results in ${uniqueFiles} files\`, StatusBarMessageType.Success)` | 4s |
| searchPanel.ts | 163 | `showInformationMessage(\`No results found for "${query}"\`)` | `StatusBarMessage.show(\`No results found for "${query}"\`, StatusBarMessageType.Info)` | 3s |
| searchPanel.ts | 145-147 | `showErrorMessage(\`Failed to open file: ${error...}\`)` | `StatusBarMessage.show(\`Failed to open file: ${error...}\`, StatusBarMessageType.Error)` | 5s |
| searchPanel.ts | 189-191 | `showInformationMessage(\`Found ${results.length} results in ${uniqueFiles} files\`)` | `StatusBarMessage.show(\`Found ${results.length} results in ${uniqueFiles} files\`, StatusBarMessageType.Success)` | 4s |
| searchPanel.ts | 193-195 | `showErrorMessage(\`Failed to open results: ${error...}\`)` | `StatusBarMessage.show(\`Failed to open results: ${error...}\`, StatusBarMessageType.Error)` | 5s |
| searchCommand.ts | 36 | `showErrorMessage('Please open a folder first')` | `StatusBarMessage.show('Please open a folder first', StatusBarMessageType.Error)` | 3s |
| searchCommand.ts | 58-60 | `showInformationMessage(\`No results found for "${input.query}"\`)` | `StatusBarMessage.show(\`No results found for "${input.query}"\`, StatusBarMessageType.Info)` | 3s |
| searchCommand.ts | 72-74 | `showInformationMessage(\`Found ${results.length} results in ${uniqueFiles} files\`)` | `StatusBarMessage.show(\`Found ${results.length} results in ${uniqueFiles} files\`, StatusBarMessageType.Success)` | 4s |
| searchCommand.ts | 77-79 | `showErrorMessage(\`Search failed: ${error...}\`)` | `StatusBarMessage.show(\`Search failed: ${error...}\`, StatusBarMessageType.Error)` | 5s |

**Keep as notifications** (2 interactive - both critical):
- dependencyChecker.ts Line 29-42: ripgrep not installed (Open Installation Guide) - **KEEP**
- dependencyChecker.ts Line 47-60: fzf not installed (Open Installation Guide) - **KEEP**

**Impact**: 80% of notifications migrated (8/10)

---

## Overall Migration Statistics

| Extension | Total Notifications | To Migrate | To Keep | Migration % |
|-----------|-------------------|------------|---------|-------------|
| Auto Insert Copyright | 2 | 2 | 0 | 100% |
| Copy Selection Path and Range | 4 | 4 | 0 | 100% |
| Semantic Config | 11 | 9 | 2 | 82% |
| Task Management | 17 | 13 | 4 | 76% |
| Fuzzy Search | 10 | 8 | 2 | 80% |
| **TOTAL** | **44** | **36** | **8** | **82%** |

---

## Implementation Checklist

### Phase 1: Setup
- [ ] Create `packages/shared/statusBarMessage.ts` utility
- [ ] Or copy utility into each extension's `src/utils/` directory
- [ ] Add global R3BL configuration to `packages/r3bl-extension-pack/package.json`:
  - [ ] `r3bl.transientFeedbackMechanism` (default: "statusbar")
  - [ ] `r3bl.statusbarMessageMaxLength` (default: 50)
- [ ] Update extension pack version

### Phase 2: Migration (Per Extension)

#### R3BL Auto Insert Copyright
- [ ] Import StatusBarMessage utility
- [ ] Replace 2 notifications with status bar calls
- [ ] Update version: 1.0.X → 1.1.0
- [ ] Test all copyright insertion scenarios
- [ ] Update CHANGELOG.md

#### R3BL Copy Selection Path and Range
- [ ] Import StatusBarMessage utility
- [ ] Replace 4 notifications with status bar calls
- [ ] Update version: 1.0.X → 1.1.0
- [ ] Test all copy scenarios
- [ ] Update CHANGELOG.md

#### R3BL Semantic Config
- [ ] Import StatusBarMessage utility
- [ ] Replace 9 notifications with status bar calls
- [ ] Keep 2 interactive notifications unchanged
- [ ] Update version: 1.0.X → 1.1.0
- [ ] Test enable/disable, apply/remove scenarios
- [ ] Update CHANGELOG.md

#### R3BL Task Management
- [ ] Import StatusBarMessage utility
- [ ] Replace 13 notifications across 4 files
- [ ] Keep 5 interactive notifications unchanged
- [ ] Update version: 1.0.X → 1.1.0
- [ ] Test create/switch/delete/rename scenarios
- [ ] Update CHANGELOG.md

#### R3BL Fuzzy Search
- [ ] Import StatusBarMessage utility
- [ ] Replace 8 notifications across 4 files
- [ ] Keep 2 dependency check notifications unchanged
- [ ] Update version: 1.0.X → 1.1.0
- [ ] Test search scenarios
- [ ] Update CHANGELOG.md

### Phase 3: Build and Test
- [ ] Run `./build.sh` to generate all .vsix files
- [ ] Run `./install.sh` to test locally
- [ ] Test each extension's modified functionality
- [ ] **Test Transient Feedback Mechanism: "statusbar" (default)**
  - [ ] Verify status bar messages appear with correct icons
  - [ ] Verify messages auto-dismiss after appropriate duration
  - [ ] Verify long messages are truncated with "..."
  - [ ] Verify full message appears in tooltip on hover
  - [ ] Test across all extensions
- [ ] **Test Transient Feedback Mechanism: "notification"**
  - [ ] Set `r3bl.transientFeedbackMechanism` to "notification" in settings
  - [ ] Verify classic VSCode notifications appear for transient feedback
  - [ ] Test across all extensions
- [ ] **Test Transient Feedback Mechanism: "none"**
  - [ ] Set `r3bl.transientFeedbackMechanism` to "none" in settings
  - [ ] Verify no transient feedback messages appear
  - [ ] Verify interactive notifications still appear (unaffected by setting)
  - [ ] Test across all extensions
- [ ] **Test Message Truncation**
  - [ ] Set `r3bl.statusbarMessageMaxLength` to 30
  - [ ] Trigger long messages, verify truncation
  - [ ] Set to 100, verify longer messages display
- [ ] **Test Interactive Notifications**
  - [ ] Verify notifications with buttons still appear regardless of feedback setting
  - [ ] Test theme detection prompt (Semantic Config)
  - [ ] Test delete confirmation (Task Management)
  - [ ] Test Claude Code integration prompts (Task Management)
  - [ ] Test dependency check prompts (Fuzzy Search)

### Phase 4: Documentation and Release
- [ ] Update main README.md if needed
- [ ] Consolidate all CHANGELOG.md entries
- [ ] Commit all changes
- [ ] Optionally publish to VSCode Marketplace

---

## Code Example: Before and After

### Before (Current)
```typescript
// packages/r3bl-auto-insert-copyright/src/extension.ts
vscode.window.showInformationMessage('Copyright Added');
```

### After (With Configurable Feedback)
```typescript
// packages/r3bl-auto-insert-copyright/src/extension.ts
import { StatusBarMessage, StatusBarMessageType } from './utils/statusBarMessage';

// In extension code - simple and consistent across all R3BL extensions
StatusBarMessage.show(
  'Copyright Added',
  StatusBarMessageType.Success,
  3000
);

// In extension deactivation
export function deactivate() {
  StatusBarMessage.dispose();
}
```

### Usage Examples for All Extensions

All R3BL extensions use the same simple pattern (no config prefix needed):

```typescript
// R3BL Auto Insert Copyright
StatusBarMessage.show('Copyright Added', StatusBarMessageType.Success, 3000);

// R3BL Copy Selection Path and Range
StatusBarMessage.show(`Copied: ${output}`, StatusBarMessageType.Success, 3000);

// R3BL Semantic Config
StatusBarMessage.show('R3BL Semantic Highlighting enabled', StatusBarMessageType.Success, 3000);

// R3BL Task Management
StatusBarMessage.show(`Task space "${name}" created`, StatusBarMessageType.Success, 3000);

// R3BL Fuzzy Search
StatusBarMessage.show(`Found ${results.length} results`, StatusBarMessageType.Success, 4000);
```

---

## Duration Guidelines

Based on message importance and length:

- **Success messages**: 3 seconds (quick confirmation)
- **Info messages**: 3-4 seconds (moderate visibility)
- **Warning messages**: 4-5 seconds (needs attention)
- **Error messages**: 5 seconds (requires reading)
- **Long messages**: Add 1-2 seconds for messages > 50 characters

---

## Benefits of This Approach

1. **Global Configuration**: One setting controls all R3BL extensions - configure once, applies everywhere
2. **User Choice**: Users can choose their preferred feedback mechanism (none, notification, statusbar)
3. **Less Intrusive Default**: Status bar messages don't interrupt workflow
4. **Auto-Dismissal**: Configurable timeouts prevent lingering (for status bar mode)
5. **Customizable Display**: Users can control message length with truncation settings
6. **Consistent UX**: Unified appearance and behavior across all R3BL extensions
7. **Better Context**: Status bar messages appear where users expect status updates
8. **Preserves Interaction**: Important prompts remain as notifications regardless of setting
9. **Visual Hierarchy**: Color-coded icons indicate severity (success, info, warning, error)
10. **Backward Compatibility**: Users who prefer notifications can switch back
11. **Accessibility**: Full message always available in tooltip when truncated
12. **Simple Implementation**: No per-extension config needed, just call `StatusBarMessage.show()`
13. **User Settings**: Stored in user's settings.json, follows user across workspaces

---

## User Configuration Examples

Users can customize transient feedback in their VSCode user settings (applies to all R3BL extensions):

### Example 1: Use Status Bar (Default)
```json
{
  "r3bl.transientFeedbackMechanism": "statusbar",
  "r3bl.statusbarMessageMaxLength": 50
}
```
This is the default configuration - transient feedback appears in status bar, messages truncated at 50 characters. Interactive notifications with buttons are unaffected.

### Example 2: Prefer Classic Notifications
```json
{
  "r3bl.transientFeedbackMechanism": "notification"
}
```
All R3BL extensions will use classic VSCode notifications for transient feedback instead of status bar messages. Interactive notifications still work as before.

### Example 3: Disable Transient Feedback
```json
{
  "r3bl.transientFeedbackMechanism": "none"
}
```
Completely silent - no transient feedback messages from any R3BL extension. Interactive notifications with buttons still appear when needed.

### Example 4: Status Bar with Longer Messages
```json
{
  "r3bl.transientFeedbackMechanism": "statusbar",
  "r3bl.statusbarMessageMaxLength": 100
}
```
Allow longer messages in status bar before truncation (useful for wide monitors).

### Example 5: Status Bar with Shorter Messages
```json
{
  "r3bl.transientFeedbackMechanism": "statusbar",
  "r3bl.statusbarMessageMaxLength": 30
}
```
Keep status bar messages brief (useful for narrow monitors or minimal UI).

---

## Potential Considerations

1. **Visibility**: Status bar is less prominent than notifications
   - **Mitigation**: Use appropriate durations and colors
   - Users can switch to notification mode if they prefer
   - Full message always available in tooltip

2. **Multiple Messages**: Rapid-fire operations might overwrite messages
   - **Mitigation**: Current implementation auto-clears previous message
   - Most common case is single operation at a time
   - Consider queueing if this becomes an issue in practice

3. **Discovery**: Users might not know about the settings
   - **Mitigation**: Document settings in each extension's README
   - Include examples in CHANGELOG when releasing
   - Consider one-time informational message about customization

4. **Testing Complexity**: Need to test three modes per extension
   - **Mitigation**: Thorough testing checklist included
   - Test all three modes: none, notification, statusbar
   - Test edge cases (very long messages, rapid operations)

5. **Single Configuration for All**: All R3BL extensions share the same settings
   - **Mitigation**: Users can't configure per-extension (intentional design choice)
   - Provides consistency and simplicity
   - If per-extension control is needed in future, can be added without breaking changes

---

## Implementation Notes and Edge Cases

### Important Considerations When Migrating

1. **Interactive Notifications Must Stay**
   - Notifications with buttons (Yes/No, Open File, etc.) MUST remain as `vscode.window.showInformationMessage()` with buttons
   - These are NOT affected by the feedback mechanism setting
   - Examples: Theme detection prompts, confirmation dialogs, dependency installation prompts

2. **Error Handling**
   - Non-critical errors (like "No active editor") can use the configurable feedback
   - Critical system errors that require immediate attention should remain as notifications
   - Use judgment: if the error prevents further work, keep it as a notification

3. **Message Truncation Strategy**
   - Truncation only applies to status bar mode
   - Full message is always available in the tooltip
   - Example: "Created task space 'My Very Long Task Space Name With Many Words'" (60 chars)
     - Truncated at 50 chars: "Created task space 'My Very Long Task Space..."
     - Full message in tooltip: "Created task space 'My Very Long Task Space Name With Many Words'"

4. **Global Configuration**
   - All R3BL extensions share the same settings: `r3bl.transientFeedbackMechanism` and `r3bl.statusbarMessageMaxLength`
   - No need to pass config prefix - the utility automatically reads from `r3bl` configuration
   - Configuration applies consistently across all R3BL extensions
   - Setting name clarifies it only affects transient feedback, not interactive notifications with buttons

5. **Deactivation Cleanup**
   - MUST call `StatusBarMessage.dispose()` in the extension's `deactivate()` function
   - This ensures the status bar item is properly cleaned up
   - Prevents memory leaks and stale UI elements

6. **Testing Each Mode**
   - Test with `feedbackMechanism: "none"` - verify no messages appear
   - Test with `feedbackMechanism: "notification"` - verify classic notifications work
   - Test with `feedbackMechanism: "statusbar"` - verify status bar messages appear and auto-dismiss
   - Test with various `statusbarMessageMaxLength` values (20, 50, 100, 200)

7. **Duration Guidelines Recap**
   - Success messages: 3000ms (3 seconds)
   - Info messages: 3000-4000ms
   - Warning messages: 4000-5000ms
   - Error messages: 5000ms (5 seconds)
   - Longer messages (>50 chars): Add 1000-2000ms

8. **Migration Pattern**
   ```typescript
   // OLD CODE
   vscode.window.showInformationMessage('Task space created');

   // NEW CODE (simple and consistent)
   StatusBarMessage.show(
     'Task space created',
     StatusBarMessageType.Success,
     3000
   );
   ```

9. **Don't Migrate These**
   - Notifications with buttons/actions
   - Modal dialogs
   - Critical error messages that block functionality
   - Prompts that require user decision

10. **Tooltip Behavior**
    - The full message is always set as the tooltip on the status bar item
    - Users can hover to see the complete message even if truncated
    - This maintains accessibility for long messages

---

## package.json Configuration Template

Add this configuration block to **ONE extension's `package.json`** (recommended: `r3bl-extension-pack`):

This single configuration applies to **ALL** R3BL extensions, providing a unified and consistent user experience.

```json
"contributes": {
  "configuration": {
    "title": "R3BL Extensions",
    "properties": {
      "r3bl.transientFeedbackMechanism": {
        "type": "string",
        "enum": ["none", "notification", "statusbar"],
        "default": "statusbar",
        "description": "How to display transient/dismissable feedback messages across all R3BL extensions (does not affect interactive notifications with buttons)",
        "enumDescriptions": [
          "Don't show any transient feedback messages from R3BL extensions",
          "Show transient feedback as VSCode notifications (classic behavior, may linger)",
          "Show transient feedback in the status bar (auto-dismisses, less intrusive)"
        ]
      },
      "r3bl.statusbarMessageMaxLength": {
        "type": "number",
        "default": 50,
        "minimum": 20,
        "maximum": 200,
        "description": "Maximum characters to display in status bar messages before truncating with '...' (applies to all R3BL extensions)"
      }
    }
  }
}
```

**Where to add this:**
- **Recommended**: `packages/r3bl-extension-pack/package.json` - since this is the umbrella package that includes all extensions
- **Alternative**: Any one of the individual extensions (but avoid adding to multiple extensions)

**Why only one extension needs this:**
- VSCode settings are global across all installed extensions
- Defining the same setting in multiple extensions would be redundant
- The extension pack is the natural place for shared R3BL configuration

---

## Summary

This plan provides a comprehensive roadmap for migrating 82% of notifications (36 out of 44) to a configurable feedback system while preserving important interactive notifications.

**Key Features:**
- **Global Configuration**: Single setting (`r3bl.transientFeedbackMechanism`) controls all R3BL extensions
- **Clear Scope**: Only affects transient/dismissable feedback; interactive notifications with buttons remain unchanged
- **User Control**: Three feedback modes (none, notification, statusbar)
- **Smart Defaults**: Status bar mode with 50-character limit
- **Customizable Truncation**: User-configurable message length (`r3bl.statusbarMessageMaxLength`)
- **Backward Compatible**: Users who prefer notifications can switch back
- **Consistent**: Same behavior across all R3BL extensions
- **Simple API**: No config prefix needed - just call `StatusBarMessage.show(message, type, duration)`
- **Accessible**: Full messages always available in tooltips
- **User Settings**: Stored in user's settings.json (not project-specific)

**Implementation Highlights:**
- Only the extension pack needs to define the settings in package.json
- All extensions use the same StatusBarMessage utility
- Simple migration pattern: replace `showInformationMessage()` with `StatusBarMessage.show()`
- Interactive notifications (with buttons) remain unchanged
- Comprehensive testing checklist ensures all modes work correctly

The implementation is straightforward, well-documented, and significantly improves user experience by reducing notification clutter while giving users full control over their preferred feedback mechanism with a single, unified configuration.
