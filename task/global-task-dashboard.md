# Feature: Global Task Dashboard

## Objective
Create a cross-project dashboard that aggregates the status of all tasks across multiple project folders within a user-specified root directory. This provides a "bird's eye view" of all active and queued work across a large codebase or multiple repositories.

## Design
- **Command ID**: `r3bl-task-management.showGlobalDashboard`
- **Trigger**: Manual invocation via Command Palette or Task Spaces dialog.
- **Root Management**: 
    - The first run asks the user for a root directory.
    - This root is cached in `globalState`.
    - The dashboard header displays the current root and provides a way to change it.
- **Refresh Mechanism**:
    - **Keybinding**: `Ctrl+R` (or `Cmd+R`) specifically when the dashboard tab is focused.
    - **UI**: A "Refresh" action icon in the editor title bar or a clickable link in the dashboard header.
- **Crawling Safeguards**:
    - Recursion depth limit (default: 5).
    - Hard-coded ignore list: `node_modules`, `.git`, `target`, `dist`, `out`.
- **Workflow**:
    1. User invokes the command.
    2. Crawler traverses the cached root (ignoring forbidden directories).
    3. Aggregate tasks into categories:
        - **Next Queue**: Tasks marked as next in any project.
        - **Previous Stack**: Tasks currently paused.
        - **Standby**: Linked to a task space but not in any queue (this is our best proxy for "Active" since `activeTaskSpaceId` is not stored on disk).
        - **Unlinked**: `.md` files in `task/` not yet associated with a space.
    4. Render to a dedicated editor tab with a custom language ID (e.g., `r3bl-dashboard`).
- **Interactivity**: 
    - Implement a `vscode.DocumentLinkProvider` for the `r3bl-dashboard` language ID.
    - This will parse file paths in the dashboard and make them clickable without needing a Webview.

## Implementation Steps

1. **Update `package.json`**:
   - Register the `r3bl-task-management.showGlobalDashboard` and `r3bl-task-management.refreshGlobalDashboard` commands.
   - Define a custom language ID `r3bl-dashboard`.
   - Add a keybinding for `Ctrl+R` with a `when` clause: `editorLangId == 'r3bl-dashboard'`.

2. **Source Code Changes (`packages/r3bl-task-management/src/`)**:
   - **`globalDashboard.ts` (New File)**:
     - Directory crawling logic using `vscode.workspace.fs`.
     - Logic to parse multiple `task-spaces.json` files.
     - Generator for the dashboard content.
     - `refresh` handler that re-runs the crawl and updates the existing tab.
   - **`dashboardLinkProvider.ts` (New File)**:
     - Implement `vscode.DocumentLinkProvider` to make project and task paths clickable.
   - **`storage.ts`**: Add helper methods to save/load the `globalDashboardRoot` in `globalState`.
   - **`ui.ts`**: Add "Global Dashboard" entry point.

3. **Interactivity**:
   - Use `vscode.Uri` links in the dashboard so clicking a task path opens that specific file.
   - Optional: Add "Project" headers to group tasks by their repository.

## Verification & Testing
- Test with a root folder containing 5+ projects.
- Verify that `task/done/` and `task/pending/` are correctly excluded.
- Ensure that the crawler handles permission errors or symlink loops gracefully.
- Verify that clicking a task in the dashboard opens the correct file.
