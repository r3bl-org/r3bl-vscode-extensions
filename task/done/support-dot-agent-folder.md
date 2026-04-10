# Implementation Plan: Multi-Agent Support for Task Management

This plan details the steps to generalize the "Claude Code" integration in
`r3bl-task-management` to support multiple AI coding agents (Claude Code, Gemini CLI,
etc.) by checking for `.gemini`, `.claude`, and `.agent` folders.

## User Experience

1.  User triggers "Install AI Agent Integration" (renamed from "Install Claude Code
    Integration").
2.  The extension checks for existing agent folders in order: `.gemini`, then `.claude`,
    then `.agent`.
3.  If one exists, it installs/updates the `/r3bl-task` command in that folder.
4.  If none exist, it prompts the user to choose which one to create (or defaults to
    `.agent`).
5.  All UI labels and notifications are updated to use generic "AI Agent" terminology.

## Implementation Details

### 1. Refactor `claudeCodeIntegration.ts` to `aiAgentIntegration.ts`

- Rename the file and all internal functions (e.g., `isClaudeCodeIntegrationInstalled` ->
  `isAIAgentIntegrationInstalled`).
- Define a prioritized list of possible command directories:
    - `.gemini/commands`
    - `.claude/commands`
    - `.agent/commands`
- Implement logic to find the "best" active directory (the first one that exists).
- Update `installAIAgentIntegration` to handle cases where no directory exists by asking
  the user or defaulting.

### 2. Generalize Command and UI Labels

- **`package.json`**:
    - Rename `r3bl-task-management.installClaudeCodeIntegration` title to "Task
      Management: Install AI Agent Integration".
    - Update any other command titles or descriptions referencing "Claude Code".
- **`extension.ts`**:
    - Update function calls to the new generic names.
- **`ui.ts`**:
    - Update prompt messages and notifications.

### 3. Update Documentation

- **`packages/r3bl-task-management/README.md`**:
    - Replace "Claude Code Integration" sections with "AI Coding Agent Integration".
    - Explain support for `.gemini`, `.claude`, and `.agent`.
- **`packages/r3bl-extension-pack/README.md`**:
    - Update relevant sections to reflect generic AI agent support.
- **`CHANGELOG.md`**:
    - Add entry for multi-agent support and `.agent` folder support.
    - Increment versions:
        - `r3bl-task-management`: `1.2.6` -> `1.3.0`
        - `r3bl-extension-pack`: `1.2.11` -> `1.2.12` (or increment if already bumped by
          another task)

### 4. Support for `AGENTS.md`

- Update `TaskSpaceManager.getTaskFiles()` to exclude `AGENTS.md` (similar to `CLAUDE.md`
  and `README.md`).
- Update any logic that searches for project-level documentation to also consider
  `AGENTS.md`.

## Verification Plan

1.  Create a workspace with `.gemini/` folder.
2.  Run "Install AI Agent Integration".
3.  Verify `r3bl-task.md` is installed in `.gemini/commands/`.
4.  Repeat with `.claude/` (when `.gemini/` is absent).
5.  Repeat with `.agent/` (when both are absent).
6.  Verify that if multiple exist, the highest priority one is used for updates.
7.  Verify all UI messages are updated.
