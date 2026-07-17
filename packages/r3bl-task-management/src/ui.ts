// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from "vscode"
import * as path from "path"
import { showStatusBarMessage } from "r3bl-common-code"
import { TaskSpace } from "./types"
import { TaskSpaceManager } from "./taskSpaceManager"
import { promptToInstallCodingAgentIntegration } from "./codingAgentIntegration"

interface TaskSpaceQuickPickItem extends vscode.QuickPickItem {
    taskSpace?: TaskSpace
    action?: "create" | "switch" | "finish"
}

/**
 * Show main task spaces dialog (Dashboard Workflow)
 */
export async function showTaskSpacesDialog(
    manager: TaskSpaceManager,
    statusBar: vscode.StatusBarItem,
    context?: vscode.ExtensionContext,
): Promise<void> {
    const quickPick = vscode.window.createQuickPick<TaskSpaceQuickPickItem>()
    quickPick.placeholder = "Dashboard: Select a task or create a new one"
    quickPick.matchOnDescription = true
    quickPick.matchOnDetail = true

    // Populate items
    const items: TaskSpaceQuickPickItem[] = []

    const activeTaskSpace = manager.getActiveTaskSpace()

    // 1. [Action] Finish Current Task
    if (activeTaskSpace) {
        items.push({
            label: `$(check) Finish Current Task: ${activeTaskSpace.name}`,
            description: "Archive current task and jump to next",
            action: "finish",
        })
        items.push({
            label: "",
            kind: vscode.QuickPickItemKind.Separator,
        })
    }

    // 2. [Action] Create New
    items.push({
        label: "$(add) Create New Task Space",
        description: "Every task space gets an .md file",
        action: "create",
    })

    // 3. [Section] Next Queue
    const nextQueue = manager.getNextQueue()
    if (nextQueue.length > 0) {
        items.push({
            label: "Next Queue",
            kind: vscode.QuickPickItemKind.Separator,
        })
        for (const ts of nextQueue) {
            items.push(createTaskItem(ts, manager, false, "next"))
        }
    }

    // 4. [Section] Previous Stack (Paused)
    const previousStack = manager.getPreviousStack()
    if (previousStack.length > 0) {
        items.push({
            label: "Previous Stack (Paused)",
            kind: vscode.QuickPickItemKind.Separator,
        })
        // Reverse because it's a stack (top is most recent)
        for (const ts of [...previousStack].reverse()) {
            items.push(createTaskItem(ts, manager, false, "previous"))
        }
    }

    // 5. [Section] Other Tasks
    const allTaskSpaces = manager.getTaskSpaces()
    const queuedIds = new Set([
        ...nextQueue.map((ts) => ts.id),
        ...previousStack.map((ts) => ts.id),
    ])
    if (activeTaskSpace) queuedIds.add(activeTaskSpace.id)

    const otherTasks = allTaskSpaces.filter((ts) => !queuedIds.has(ts.id))

    if (otherTasks.length > 0) {
        items.push({
            label: "Other Task Spaces",
            kind: vscode.QuickPickItemKind.Separator,
        })

        // Fetch lastAccessed timestamps for sorting
        const lastAccessedMap = await manager.getAllLastAccessed()
        const sortedOther = [...otherTasks].sort((a, b) => {
            const aTime = lastAccessedMap[a.id] || 0
            const bTime = lastAccessedMap[b.id] || 0
            return bTime - aTime
        })

        for (const ts of sortedOther) {
            const lastAccessed = lastAccessedMap[ts.id] || ts.createdAt
            items.push(createTaskItem(ts, manager, false, "other", lastAccessed))
        }
    }

    quickPick.items = items

    // Handle selection (Enter key)
    quickPick.onDidAccept(async () => {
        const selected = quickPick.selectedItems[0]
        if (!selected) return

        quickPick.hide()

        if (selected.action === "create") {
            await handleCreateTaskSpace(manager, statusBar, context)
        } else if (selected.action === "finish") {
            await vscode.commands.executeCommand("r3bl-task-management.finishCurrentTask")
        } else if (selected.taskSpace) {
            await handleJumpToTask(manager, selected.taskSpace, statusBar)
        }
    })

    // Handle button clicks
    quickPick.onDidTriggerItemButton(async (e) => {
        const item = e.item as TaskSpaceQuickPickItem
        if (!item.taskSpace) return

        const button = e.button
        const ts = item.taskSpace

        if (button.tooltip === "Rename") {
            quickPick.hide()
            await handleRenameTaskSpace(manager, ts, statusBar)
            await showTaskSpacesDialog(manager, statusBar, context)
        } else if (button.tooltip === "Delete") {
            quickPick.hide()
            await handleDeleteTaskSpace(manager, ts, statusBar)
            await showTaskSpacesDialog(manager, statusBar, context)
        } else if (button.tooltip === "Add to Next Queue") {
            await manager.addToNextQueue(ts.id)
            await showTaskSpacesDialog(manager, statusBar, context)
        } else if (button.tooltip === "Remove from Queue") {
            await manager.removeFromNextQueue(ts.id)
            await manager.removeFromPreviousStack(ts.id)
            await showTaskSpacesDialog(manager, statusBar, context)
        } else if (button.tooltip === "Move to Backlog") {
            quickPick.hide()
            // Call internal method directly if it's the active task, or move the file manually?
            // For simplicity, let's just trigger the command if it's the active one
            if (ts.id === activeTaskSpace?.id) {
                await vscode.commands.executeCommand(
                    "r3bl-task-management.moveTaskToBacklog",
                )
            } else {
                await manager.moveToBacklog(ts.id)
                showStatusBarMessage(`Moved "${ts.name}" to backlog`, "success")
                await showTaskSpacesDialog(manager, statusBar, context)
            }
        }
    })

    quickPick.onDidHide(() => quickPick.dispose())
    quickPick.show()
}

/**
 * Helper to create QuickPick items for task spaces
 */
function createTaskItem(
    ts: TaskSpace,
    manager: TaskSpaceManager,
    isActive: boolean,
    location: "next" | "previous" | "other",
    lastAccessed?: number,
): TaskSpaceQuickPickItem {
    const buttons: vscode.QuickInputButton[] = []

    // Queue button
    if (location === "other") {
        buttons.push({
            iconPath: new vscode.ThemeIcon("add"),
            tooltip: "Add to Next Queue",
        })
    } else {
        buttons.push({
            iconPath: new vscode.ThemeIcon("close"),
            tooltip: "Remove from Queue",
        })
    }

    // Standard buttons
    buttons.push(
        {
            iconPath: new vscode.ThemeIcon("archive"),
            tooltip: "Move to Backlog",
        },
        {
            iconPath: new vscode.ThemeIcon("edit"),
            tooltip: "Rename",
        },
        {
            iconPath: new vscode.ThemeIcon("trash"),
            tooltip: "Delete",
        },
    )

    let detail = ""
    if (location === "other") {
        detail = `Last accessed: ${formatRelativeTime(lastAccessed || ts.createdAt)}`
    } else if (location === "next") {
        detail = "Waiting in Next Queue"
    } else {
        detail = "Paused in Previous Stack"
    }

    return {
        label: `${isActive ? "$(arrow-right) " : "$(book) "}${ts.name}`,
        description: `${ts.tabs.length} tabs | ${ts.taskFile ? path.basename(ts.taskFile) : "No file linked"}`,
        detail,
        taskSpace: ts,
        buttons,
    }
}

/**
 * Handle jumping to a task (Dashboard Workflow logic)
 */
async function handleJumpToTask(
    manager: TaskSpaceManager,
    taskSpace: TaskSpace,
    statusBar: vscode.StatusBarItem,
): Promise<void> {
    if (manager.getActiveTaskSpaceId() === taskSpace.id) {
        showStatusBarMessage(`Already in "${taskSpace.name}"`, "info")
        return
    }

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Jumping to "${taskSpace.name}"...`,
            cancellable: false,
        },
        async (progress) => {
            try {
                await manager.jumpToTask(taskSpace.id)
                updateStatusBar(statusBar, manager)
                showStatusBarMessage(`Jumped to context: ${taskSpace.name}`, "success")
            } catch (error) {
                showStatusBarMessage(`Failed to jump: ${error}`, "error")
            }
        },
    )
}

/**
 * Handle creating a new task space
 */
async function handleCreateTaskSpace(
    manager: TaskSpaceManager,
    statusBar: vscode.StatusBarItem,
    context?: vscode.ExtensionContext,
): Promise<void> {
    // Step 1: Get task space name
    const name = await vscode.window.showInputBox({
        prompt: "Enter task space name",
        placeHolder: "e.g., Feature: User Authentication",
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return "Task space name cannot be empty"
            }

            // Check for duplicate names
            const taskSpaces = manager.getTaskSpaces()
            if (taskSpaces.some((ts) => ts.name === value)) {
                return `Task space "${value}" already exists`
            }

            return null
        },
    })

    if (!name) {
        return // User cancelled
    }

    // Step 2: Optionally link a task file
    const linkTaskFile = await vscode.window.showQuickPick(
        [
            { label: "Yes", description: "Link a task/*.md file" },
            { label: "No", description: "Create without task file" },
        ],
        { placeHolder: "Link a task file?" },
    )

    let taskFile: string | undefined

    if (linkTaskFile?.label === "Yes") {
        // Show files from task/ directory
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
        if (workspaceFolder) {
            const taskDir = vscode.Uri.joinPath(workspaceFolder.uri, "task")

            try {
                const files = await vscode.workspace.fs.readDirectory(taskDir)
                const mdFiles = files
                    .filter(
                        ([name, type]) =>
                            type === vscode.FileType.File && name.endsWith(".md"),
                    )
                    .map(([name]) => ({
                        label: name,
                        description: "task/" + name,
                    }))

                if (mdFiles.length > 0) {
                    const selected = await vscode.window.showQuickPick(
                        [{ label: "None", description: "No task file" }, ...mdFiles],
                        { placeHolder: "Select a task file" },
                    )

                    if (selected && selected.label !== "None") {
                        taskFile = "task/" + selected.label
                    }
                } else {
                    showStatusBarMessage("No .md files in task/ directory", "info")
                }
            } catch {
                // task/ directory doesn't exist
                showStatusBarMessage("task/ directory not found", "info")
            }
        }
    }

    // Step 3: Create task space with current tabs
    try {
        const taskSpace = await manager.createTaskSpace(name, taskFile)

        // Switch to the new task space
        await manager.switchToTaskSpaceFromUserAction(taskSpace.id)

        // Update status bar
        updateStatusBar(statusBar, manager)

        // Show confirmation
        showStatusBarMessage(
            `Task space "${name}" created (${taskSpace.tabs.length} tabs)`,
            "success",
        )

        // Prompt to install Coding Agent integration if task file is linked
        if (taskFile && context) {
            await promptToInstallCodingAgentIntegration(context)
        }
    } catch (error) {
        showStatusBarMessage(`Failed to create task space: ${error}`, "error")
    }
}

/**
 * Handle switching to a task space
 */
async function handleSwitchTaskSpace(
    manager: TaskSpaceManager,
    taskSpace: TaskSpace,
    statusBar: vscode.StatusBarItem,
): Promise<void> {
    // Check if already active
    if (manager.getActiveTaskSpaceId() === taskSpace.id) {
        showStatusBarMessage(`Already in "${taskSpace.name}"`, "info")
        return
    }

    // Optional: Confirm before switching (if configured)
    const config = vscode.workspace.getConfiguration("r3bl-task-management")
    const confirmBeforeSwitch = config.get<boolean>("confirmBeforeSwitch", false)

    if (confirmBeforeSwitch) {
        const confirm = await vscode.window.showQuickPick(
            [
                { label: "Yes", description: "Switch task space" },
                { label: "No", description: "Cancel" },
            ],
            { placeHolder: `Switch to task space "${taskSpace.name}"?` },
        )

        if (confirm?.label !== "Yes") {
            return
        }
    }

    // Show progress indicator
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Switching to "${taskSpace.name}"...`,
            cancellable: false,
        },
        async (progress) => {
            try {
                progress.report({ increment: 0 })

                // Switch task space
                await manager.switchToTaskSpaceFromUserAction(taskSpace.id)

                progress.report({ increment: 100 })

                // Update status bar
                updateStatusBar(statusBar, manager)

                // Show confirmation
                showStatusBarMessage(
                    `Switched to "${taskSpace.name}" (${taskSpace.tabs.length} tabs)`,
                    "success",
                )
            } catch (error) {
                showStatusBarMessage(`Failed to switch task space: ${error}`, "error")
            }
        },
    )
}

/**
 * Handle deleting a task space
 */
async function handleDeleteTaskSpace(
    manager: TaskSpaceManager,
    taskSpace: TaskSpace,
    statusBar: vscode.StatusBarItem,
): Promise<void> {
    // Different dialog depending on whether there's a task file
    if (taskSpace.taskFile) {
        const message = `Delete task space "${taskSpace.name}"?\n\nThe associated file "${path.basename(taskSpace.taskFile)}" can be moved to task/done/ or left in place.\n\nThis cannot be undone.`

        const result = await vscode.window.showWarningMessage(
            message,
            { modal: true },
            "Close without moving",
            "Close and move",
        )

        if (!result) {
            return // User cancelled
        }

        const moveFile = result === "Close and move"

        try {
            await manager.deleteTaskSpace(taskSpace.id, moveFile)
            updateStatusBar(statusBar, manager)
            showStatusBarMessage(`Task space "${taskSpace.name}" deleted`, "success")
        } catch (error) {
            showStatusBarMessage(`Failed to delete task space: ${error}`, "error")
        }
    } else {
        // No task file - simple confirmation
        const confirm = await vscode.window.showWarningMessage(
            `Delete task space "${taskSpace.name}"? This cannot be undone.`,
            { modal: true },
            "Delete",
        )

        if (confirm !== "Delete") {
            return
        }

        try {
            await manager.deleteTaskSpace(taskSpace.id)
            updateStatusBar(statusBar, manager)
            showStatusBarMessage(`Task space "${taskSpace.name}" deleted`, "success")
        } catch (error) {
            showStatusBarMessage(`Failed to delete task space: ${error}`, "error")
        }
    }
}

/**
 * Handle renaming a task space
 */
async function handleRenameTaskSpace(
    manager: TaskSpaceManager,
    taskSpace: TaskSpace,
    statusBar: vscode.StatusBarItem,
): Promise<void> {
    const newName = await vscode.window.showInputBox({
        prompt: "Enter new task space name",
        value: taskSpace.name,
        placeHolder: taskSpace.name,
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return "Task space name cannot be empty"
            }

            // Check for duplicate names (excluding current task space)
            const taskSpaces = manager.getTaskSpaces()
            if (taskSpaces.some((ts) => ts.name === value && ts.id !== taskSpace.id)) {
                return `Task space "${value}" already exists`
            }

            return null
        },
    })

    if (!newName || newName === taskSpace.name) {
        return // User cancelled or no change
    }

    try {
        await manager.renameTaskSpace(taskSpace.id, newName)

        // Update status bar
        updateStatusBar(statusBar, manager)

        // Show confirmation
        showStatusBarMessage(`Task space renamed to "${newName}"`, "success")
    } catch (error) {
        showStatusBarMessage(`Failed to rename task space: ${error}`, "error")
    }
}

/**
 * Update status bar with current task space
 */
export function updateStatusBar(
    statusBarItem: vscode.StatusBarItem,
    manager: TaskSpaceManager,
): void {
    // Check if status bar is enabled in settings
    const config = vscode.workspace.getConfiguration("r3bl-task-management")
    const showStatusBar = config.get<boolean>("showStatusBar", true)

    if (!showStatusBar) {
        statusBarItem.hide()
        return
    }

    const activeTaskSpace = manager.getActiveTaskSpace()

    if (activeTaskSpace) {
        statusBarItem.text = `$(book) ${activeTaskSpace.name} (${activeTaskSpace.tabs.length})`
        statusBarItem.backgroundColor = undefined // Default background
        statusBarItem.show()
    } else {
        statusBarItem.text = "$(book) No Task Space"
        statusBarItem.backgroundColor = new vscode.ThemeColor(
            "statusBarItem.warningBackground",
        )
        statusBarItem.show()
    }
}

/**
 * Create status bar item
 */
export function createStatusBarItem(): vscode.StatusBarItem {
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100, // Priority (higher = more left)
    )

    statusBarItem.command = "r3bl-task-management.showTaskSpaces"
    statusBarItem.tooltip = "Click to manage task spaces (Alt+Shift+T)"

    return statusBarItem
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
        return `${days} day${days === 1 ? "" : "s"} ago`
    }
    if (hours > 0) {
        return `${hours} hour${hours === 1 ? "" : "s"} ago`
    }
    if (minutes > 0) {
        return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
    }
    return "Just now"
}
