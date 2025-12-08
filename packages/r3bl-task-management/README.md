# R3BL Task Management

Manage task spaces - collections of open tabs for different work contexts **within a
single git branch**. Inspired by IntelliJ IDEA's Task Management plugin, this extension
helps you organize multiple concurrent workflows (feature development, bug fixing, code
review, research) while working on the same branch. Integrates with Claude Code to track
implementation plans in `task/*.md` files.

## Table of Contents

- [Use Cases](#use-cases)
    - [Context Preservation](#context-preservation)
    - [Claude Code Collaboration](#claude-code-collaboration)
    - [Multiple Concurrent Workflows (Same Branch)](#multiple-concurrent-workflows-same-branch)
    - [Multi-IDE Workflows (Different Task Spaces Per IDE)](#multi-ide-workflows-different-task-spaces-per-ide)
- [What It Does](#what-it-does)
- [Getting Started](#getting-started)
    - [Requirements](#requirements)
    - [Quick Start](#quick-start)
- [Screenshots](#screenshots)
- [Workflows](#workflows)
    - [Basic Workflow](#basic-workflow)
    - [Claude Code Workflow](#claude-code-workflow)
    - [Claude Code Integration Commands](#claude-code-integration-commands)
        - [Install Claude Code Integration](#install-claude-code-integration)
        - [Automatic Updates](#automatic-updates)
        - [Create Task Space from Task File](#create-task-space-from-task-file)
        - [Smart Prompting](#smart-prompting)
    - [Power User: Multiple Claude Code Instances](#power-user-multiple-claude-code-instances)
- [Important: How It Works](#important-how-it-works)
    - [Task Spaces Are WITHIN One Branch](#task-spaces-are-within-one-branch)
    - [Filesystem-Based Memory](#filesystem-based-memory)
    - [Should You Commit `.vscode/task-spaces.json`?](#should-you-commit-vscodetask-spacesjson)
- [Reference](#reference)
    - [Commands](#commands)
    - [Keyboard Shortcuts](#keyboard-shortcuts)
    - [Extension Settings](#extension-settings)
    - [Status Bar](#status-bar)
    - [File Format](#file-format)
    - [When Does the File Get Saved?](#when-does-the-file-get-saved)
- [Shared Infrastructure](#shared-infrastructure)
- [Release Notes](#release-notes)
- [License](#license)
- [Contributing](#contributing)

## Use Cases

### Context Preservation

Stop losing your carefully arranged tabs! Each task space remembers exactly which files
were open, their order, and pinned state - so you can switch contexts without mental
overhead.

Switch between them instantly with **Alt+Shift+T** without losing your place.

### Claude Code Collaboration

Run multiple Claude Code instances in parallel (different terminal tabs or tmux panes),
each working on different aspects of your work. Create task spaces for each to organize
files and switch contexts seamlessly.

Attach a `task/*.md` file (that Claude manages, with the Claude Code custom command
`/task`) to each space to track design and implementation plans, and have completed tasks
automatically archived to `task/done/` when they're finished.

### Multiple Concurrent Workflows (Same Branch)

Working on a feature but need to quickly review a PR? Or switch between implementation and
research? Create separate task spaces for each workflow **on your current branch**:

- **"Feature: Auth"** - Implementation files (src/auth.ts, src/login.ts)
- **"Research: OAuth"** - Documentation tabs and examples
- **"Code Review: PR #123"** - All changed files
- **"Bug Fix: Login Error"** - Debugging context

### Multi-IDE Workflows (Different Task Spaces Per IDE)

**The problem:** VS Code only allows one window per project folder. You can't open the
same project twice in VS Code.

**The solution:** Use multiple IDEs! Open the same project folder in VS Code, VS Code
Insiders, and/or VSCodium simultaneously - each with a **different task space active**:

- **VS Code**: "Feature: Auth" task space with implementation files
- **VS Code Insiders**: "Research: OAuth" task space with documentation tabs
- **VSCodium**: "Code Review: PR #123" task space with changed files

Each IDE maintains its own active task space independently. Task space definitions (names,
tabs, files) sync across all IDEs via the shared `task-spaces.json` file, but which space
is "active" is stored per-IDE instance.

This enables workflows like:

- **Parallel development**: Implementation in VS Code, research in Insiders, review in
  VSCodium
- **Side-by-side comparison**: Compare different task space configurations across IDEs
- **Testing + Development**: Test extensions in Insiders while working in stable VS Code
- **Multiple Claude Code sessions**: Different Claude instances working on different task
  spaces

**How it works:** When you switch task spaces in VS Code, VS Code Insiders' active space
stays unchanged. But if you add/remove tabs from "Feature: Auth" in VS Code, those changes
sync to Insiders if it also has "Feature: Auth" active.

## What It Does

- **Task Spaces**: Collections of open tabs you can switch between instantly
- **Quick Switching**: Keyboard shortcut (Alt+Shift+T) to switch contexts
- **Tab State Preservation**: Remembers tab order and pinned state across switches and
  restarts
- **Diff-Based Sync**: Only applies minimal changes (close/open/move/pin) for smooth
  transitions
- **Multi-IDE Support**: Different IDEs (VS Code, Insiders, VSCodium) can have different
  task spaces active on the same project folder
- **Cross-IDE Sync**: Tab changes sync when same space is active in multiple IDEs
- **Smart Startup**: Skips restore if current tabs already match saved state
- **Claude Code Integration**: Link task spaces to `task/*.md` files for tracking
  implementation plans
- **Automatic Archival**: Completed task files move to `task/done/` automatically
- **Status Bar**: See your active task space at a glance
- **Auto-Save**: Current tabs are saved automatically when you switch or modify
- **Smart Collision Handling**: No data loss - files get numeric suffixes if duplicates
  exist (when archiving tasks)

## Getting Started

### Requirements

- VS Code 1.70.0 or higher
- No external dependencies

### Quick Start

**Press Alt+Shift+T** to open the Task Spaces dialog.

1. **Create your first task space:**
    - Click "Create New Task Space"
    - Name it (e.g., "Feature: User Auth")
    - Optionally link a task/\*.md file
    - All your currently open tabs are saved to this space

2. **Switch between spaces:**
    - Press Alt+Shift+T
    - Select a different task space
    - Your tabs switch automatically

3. **Manage spaces:**
    - Click ✏️ to rename
    - Click 🗑️ to delete (archives linked files to task/done/)

## Screenshots

![Task Spaces Dialog](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-task-management/images/task-spaces-dialog.png)
_Main dialog showing all your task spaces_

![Create Task Space](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-task-management/images/create-task-space.png)
_Create a new workflow context_

![Link Task File](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-task-management/images/link-task-file.png)
_Link to Claude Code task files_

![Delete Confirmation](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-task-management/images/delete-confirmation.png)
_Automatic archival to task/done/_

![Status Bar](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-task-management/images/status-bar-active.png)
_Status bar shows active context_

## Workflows

### Basic Workflow

Create separate task spaces for different aspects of your work **on the same branch**:

1. Open files for "Feature Implementation"
2. Press Alt+Shift+T → Create "Feature: Auth Implementation"
3. Now switch to research - open documentation tabs
4. Press Alt+Shift+T → Create "Research: OAuth Patterns"
5. Switch back and forth without losing context

Your previous tabs are auto-saved when you switch.

### Claude Code Workflow

Task spaces integrate with Claude Code for implementation tracking:

**Planning Phase:**

- Create `task/task_auth_feature.md` with detailed implementation plan
- Create task space "Feature: Auth" linked to this file
- Give plan to Claude Code to work on

**Implementation Phase:**

- Work with Claude Code
- Update task file with progress notes
- All relevant files stay organized in your task space

**Completion Phase:**

- Delete task space when done
- Linked file **automatically moves** to `task/done/` (archival)
- Numeric suffix added if file already exists (e.g., `task_auth_2.md`)

### Claude Code Integration Commands

#### Install Claude Code Integration

![Install Command](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-task-management/images/install-claude-integration-command.png)
_Command palette → "R3BL Task Management: Install Claude Code Integration"_

![Installation Prompt](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-task-management/images/install-claude-integration-prompt.png)
_Creates .claude/commands if needed_

![Installation Success](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-task-management/images/install-claude-integration-success.png)
_Installs `/r3bl-task` slash command_

This installs the `/r3bl-task` command for Claude Code CLI:

- `/r3bl-task create [name]` - Create task file from your todo list
- `/r3bl-task update [name]` - Update progress
- `/r3bl-task load [name]` - Resume work on a task

**Automatic Updates**

The extension automatically keeps the `/r3bl-task` command up-to-date:

- When the extension is updated with command improvements, your local
  `.claude/commands/r3bl-task.md` file is automatically upgraded
- Uses SHA256 checksum comparison to detect changes
- No permission prompt needed (file is expected to be in git for review)
- You'll see a brief notification: "R3BL Task command updated"
- Review changes with `git diff .claude/commands/r3bl-task.md` before committing
- Revert if needed: `git checkout .claude/commands/r3bl-task.md`

This ensures you always have the latest command features without manual intervention.

#### Create Task Space from Task File

![Create from File Command](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-task-management/images/create-from-file-command.png)
_Command palette → "Create Task Space from Task File"_

![Select Task File](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-task-management/images/create-from-file-select.png)
_Shows all task/_.md files (⚠️ = not linked)\*

![Name Task Space](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-task-management/images/create-from-file-name.png)
_Pre-fills name from filename_

![Task Space Created](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-task-management/images/create-from-file-success.png)
_Ready to use!_

#### Smart Prompting

![Create with Linked File](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-task-management/images/smart-prompt-create-with-file.png)
_Creating task space with linked file..._

![Integration Prompt](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-task-management/images/smart-prompt-notification.png)
_...prompts to install Claude Code integration (with "Don't Ask Again" option)_

### Power User: Multiple Claude Code Instances

Run **multiple Claude Code CLI instances in parallel** (terminal tabs or tmux panes), each
working on different tasks, coordinated through one VS Code instance:

1. **Terminal 1**: `claude` → `/r3bl-task create feature_a` → Creates
   `task/task_feature_a.md`
2. **Terminal 2**: `claude` → `/r3bl-task create feature_b` → Creates
   `task/task_feature_b.md`
3. **VS Code**: "Create Task Space from Task File" for each
4. **Switch**: Alt+Shift+T to switch between contexts as you work

True parallel development on the same branch!

## Important: How It Works

### Task Spaces Are WITHIN One Branch

**This extension helps you manage multiple workflows WITHIN a single git branch.** It does
NOT help you manage different feature branches. When you switch git branches, your task
spaces are tied to what's in `.vscode/task-spaces.json` on that branch.

### Filesystem-Based Memory

Task spaces are stored in `.vscode/task-spaces.json` in your workspace. **The extension's
memory is tied to the filesystem, not global VS Code state.**

This means:

- Task spaces are **per-workspace** (different projects have separate task spaces)
- Task spaces are **per-branch** if you commit the file to git
- Branch switching can change which task spaces you see

### Should You Commit `.vscode/task-spaces.json`?

#### ✅ Recommended: Add to `.gitignore`

```bash
echo ".vscode/task-spaces.json" >> .gitignore
```

**This extension is designed for personal workflow management.** Task spaces help YOU
organize YOUR work - which files are open for implementation vs research vs code review.
This is personal context, not project configuration.

**With gitignore:**

- ✅ Task spaces are yours alone
- ✅ Branch switching doesn't affect your spaces
- ✅ No merge conflicts
- ✅ Your workflow stays consistent across branches

**Example:** You're on `feature/auth` with task spaces "Implementation", "Research",
"Testing". You `git checkout main` to check something - your task spaces stay exactly the
same. Switch back to `feature/auth` - everything's still there.

#### Alternative: Commit It (Team Collaboration)

**Only do this if** you want to share task spaces with your team (e.g., "here are the
relevant files for this feature").

**Note:** The extension automatically detects when the file changes (e.g., branch switch)
and reloads task spaces accordingly. This makes committing it _possible_, but it's still
not the recommended workflow for most users.

**Be aware:**

- ⚠️ Different branches will have different task spaces
- ⚠️ **Merge conflicts are inevitable** - Each team member has their own task space data
  in the JSON file. When multiple people commit changes to the same file, git will
  constantly show merge conflicts
- ⚠️ Team members' personal workflows differ (your "Implementation" space has different
  files than theirs)

## Reference

### Commands

- `R3BL Task Management: Manage Task Spaces` - Open dialog (Alt+Shift+T)
- `R3BL Task Management: Install Claude Code Integration` - Install /r3bl-task command
- `R3BL Task Management: Create Task Space from Task File` - Create from existing task
  file

### Keyboard Shortcuts

| Shortcut      | Command ID                            | When            |
| ------------- | ------------------------------------- | --------------- |
| `Alt+Shift+T` | `r3bl-task-management.showTaskSpaces` | Not in terminal |

You can customize this shortcut in VS Code's Keyboard Shortcuts settings by searching for
the command ID above.

### Extension Settings

- `r3bl-task-management.autoSaveCurrentTaskSpace` - Auto-save on tab changes (default:
  `true`). Disable for "view-only" mode where this instance syncs from others but doesn't
  write back.
- `r3bl-task-management.autoSaveDebounceMs` - Delay in milliseconds before auto-saving
  after tab changes (default: `500`, range: 100-5000). Lower values save faster but may
  cause more disk writes.
- `r3bl-task-management.confirmBeforeSwitch` - Confirm before switching (default: `false`)
- `r3bl-task-management.showStatusBar` - Show status bar item (default: `true`)
- `r3bl-task-management.restoreTabsOnStartup` - Restore tabs from active task space when
  VS Code starts (default: `true`)

### Status Bar

Bottom-left corner shows:

- **Active task space**: Name + tab count (e.g., "Feature: Auth (5)")
- **No task space**: "No Task Space" with warning background

Click to open Task Spaces dialog.

### File Format

Task spaces are stored in **two separate locations** to support multi-instance editing and
avoid git noise:

#### `.vscode/task-spaces.json` (Shared File)

This file is synced across all VSCode instances opening the same project. Changes made in
one window (creating/deleting/renaming task spaces, modifying tabs) are reflected in
others.

```json
{
    "version": "3.0",
    "taskSpaces": [
        {
            "name": "Feature: Authentication",
            "id": "uuid",
            "tabs": [
                { "path": "src/auth.ts", "isPinned": true },
                { "path": "src/login.ts", "isPinned": false }
            ],
            "taskFile": "task/task_authentication.md",
            "activeTab": "src/auth.ts",
            "createdAt": 1234567890
        }
    ]
}
```

#### VSCode Workspace State (Per-Instance)

Per-instance data is stored in VSCode's workspace state. This data is NOT shared between
VSCode windows, allowing different windows to have different task spaces active
simultaneously.

**Storage Location:**

- Linux: `~/.config/Code/User/workspaceStorage/<workspace-id>/state.vscode.*`
- macOS:
  `~/Library/Application Support/Code/User/workspaceStorage/<workspace-id>/state.vscode.*`
- Windows: `%APPDATA%\Code\User\workspaceStorage\<workspace-id>\state.vscode.*`

**Data Format:**

```json
{
    "activeTaskSpaceId": "uuid",
    "taskSpaceMetadata": {
        "uuid-1": { "lastAccessed": 1234567890 },
        "uuid-2": { "lastAccessed": 1234555555 }
    }
}
```

**Note:** This metadata is automatically cleaned up when task spaces are deleted,
preventing any memory leaks or storage bloat.

#### Multi-Instance Behavior

| Data              | Synced? | Notes                                               |
| ----------------- | ------- | --------------------------------------------------- |
| Task space list   | ✅ Yes  | Creating/deleting/renaming syncs across all windows |
| Tab content       | ✅ Yes  | Adding/removing files from a space syncs            |
| Active task space | ❌ No   | Each window can have different task space active    |
| Last accessed     | ❌ No   | Each window tracks its own usage history            |

**Example use case:** Open the same project in VS Code and VS Code Insiders, with
different task spaces active in each window. Both windows stay in sync for task space
definitions, but each maintains its own context.

**Storage Benefits:**

- ✅ Task space definitions remain clean and git-friendly
- ✅ No git noise from frequent timestamp/active space updates
- ✅ Multiple VSCode windows can work on different task spaces simultaneously
- ✅ "Last accessed" sorting still works perfectly per-instance
- ✅ Automatic cleanup when task spaces are deleted (no memory leaks)

**Note:** The extension automatically migrates from v1.0 → v2.0 → v3.0 format as needed.

### When Does the File Get Saved?

The JSON file is automatically saved to disk in these situations:

1. **Create task space** - Saves the new task space with current tabs
2. **Delete task space** - Saves after removing the space (and archives task file)
3. **Switch to task space** - Saves to persist the switch (active ID stored in
   workspaceState)
4. **Rename task space** - Saves with the new name
5. **Auto-save tabs** - Saves current open tabs (500ms after tab changes, if
   `autoSaveCurrentTaskSpace` is enabled)

**Note:** The `lastAccessed` timestamp is updated separately in VSCode workspace state and
does NOT trigger file saves, keeping git history clean.

**Note on missing files:** When auto-save runs, it saves only the tabs that are currently
open. If a file was in your task space but failed to open (e.g., missing on current
branch), it won't be in the "currently open tabs" list and will be automatically removed
from the task space on the next save. This keeps task spaces clean and accurate to your
actual workspace.

## Shared Infrastructure

This extension uses the **R3BL Shared** extension for centralized services across all R3BL
extensions (message queuing, global configuration, and more).

See the
[R3BL Shared documentation](https://marketplace.visualstudio.com/items?itemName=R3BL.r3bl-shared)
for available services, API usage, and configuration options.

## Release Notes

See
[CHANGELOG.md](https://github.com/r3bl-org/r3bl-vscode-extensions/blob/main/CHANGELOG.md)
for detailed release notes and version history.

## License

MIT

## Contributing

Found a bug or have a feature request? Please open an issue at:
https://github.com/r3bl-org/r3bl-vscode-extensions/issues

---

**Stay organized and productive!**
