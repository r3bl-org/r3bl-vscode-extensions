// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from "vscode"
import { showStatusBarMessage } from "r3bl-common-code"
import { TaskSpaceManager } from "./taskSpaceManager"
import { showTaskSpacesDialog, updateStatusBar, createStatusBarItem } from "./ui"
import {
    installCodingAgentIntegration,
    checkAndUpgradeCodingAgentCommand,
} from "./codingAgentIntegration"
import * as path from "path"

/** Default debounce delay for auto-save (milliseconds) */
const DEFAULT_AUTO_SAVE_DEBOUNCE_MS = 500

let manager: TaskSpaceManager
let statusBarItem: vscode.StatusBarItem
let autoSaveTimeout: NodeJS.Timeout | undefined

/**
 * Command handler: Create Task Space from Task File
 */
async function createTaskSpaceFromFile(
    manager: TaskSpaceManager,
    statusBarItem: vscode.StatusBarItem,
): Promise<void> {
    try {
        // Get only unlinked task files
        const unlinkedFiles = await manager.getUnlinkedTaskFiles()

        if (unlinkedFiles.length === 0) {
            // Check if there are ANY task files at all
            const allTaskFiles = await manager.getTaskFiles()

            if (allTaskFiles.length === 0) {
                showStatusBarMessage("No task files found in task/ directory", "info")
            } else {
                showStatusBarMessage("All task files already linked", "info")
            }
            return
        }

        // Create quick pick items (only unlinked files)
        interface TaskFileItem extends vscode.QuickPickItem {
            taskFile: string
        }

        const items: TaskFileItem[] = unlinkedFiles.map((file) => {
            const fileName = path.basename(file)

            return {
                label: `$(file) ${fileName}`,
                description: "Not linked",
                detail: file,
                taskFile: file,
            }
        })

        // Show quick pick
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: "Select a task file to create a task space for",
            title: "Create Task Space from Task File",
        })

        if (!selected) {
            return // User cancelled
        }

        // Ask for task space name
        const fileBaseName = path.basename(selected.taskFile, ".md")
        const suggestedName = fileBaseName.replace(/^task_/, "") // Remove task_ prefix

        const name = await vscode.window.showInputBox({
            prompt: "Enter task space name",
            value: suggestedName,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return "Name cannot be empty"
                }
                if (manager.getTaskSpaces().some((ts) => ts.name === value)) {
                    return `Task space "${value}" already exists`
                }
                return null
            },
        })

        if (!name) {
            return // User cancelled
        }

        // Open the task file FIRST, then create the task space
        // This ensures the task file is in the current tabs when createTaskSpace captures them
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
        if (workspaceFolder) {
            const taskFilePath = path.isAbsolute(selected.taskFile)
                ? selected.taskFile
                : path.join(workspaceFolder.uri.fsPath, selected.taskFile)
            const taskFileUri = vscode.Uri.file(taskFilePath)

            // Open and pin the task file
            await vscode.window.showTextDocument(taskFileUri, { preview: false })
            await vscode.commands.executeCommand("workbench.action.pinEditor")
        }

        // Now create task space - it will capture the task file in the tabs
        // Set as active immediately to avoid race condition
        await manager.createTaskSpace(name, selected.taskFile, true)

        // Update status bar
        updateStatusBar(statusBarItem, manager)

        showStatusBarMessage(`Created task space "${name}"`, "success")
    } catch (error) {
        showStatusBarMessage(`Failed to create task space: ${error}`, "error")
    }
}

export async function activate(context: vscode.ExtensionContext) {
    console.log("R3BL Task Management extension is now active")

    // Initialize manager
    manager = new TaskSpaceManager(context)
    await manager.initialize()

    // Check and auto-upgrade Coding Agent command if needed
    await checkAndUpgradeCodingAgentCommand(context)

    // Restore tabs for active task space on startup
    const activeTaskSpace = manager.getActiveTaskSpace()
    if (activeTaskSpace) {
        // Check if restoreTabsOnStartup is enabled (default: true)
        const config = vscode.workspace.getConfiguration("r3bl-task-management")
        const restoreOnStartup = config.get<boolean>("restoreTabsOnStartup", true)

        if (restoreOnStartup) {
            // Smart switch only restores if tabs differ (avoids jarring close/reopen)
            await manager.switchToTaskSpaceFromFileWatcher(activeTaskSpace.id)
        }
    }

    // Create status bar item
    statusBarItem = createStatusBarItem()
    updateStatusBar(statusBarItem, manager)
    context.subscriptions.push(statusBarItem)

    // Register main command
    const showCommand = vscode.commands.registerCommand(
        "r3bl-task-management.showTaskSpaces",
        async () => {
            await showTaskSpacesDialog(manager, statusBarItem, context)
        },
    )
    context.subscriptions.push(showCommand)

    // Register Install Coding Agent Integration command
    const installCodingAgentCommand = vscode.commands.registerCommand(
        "r3bl-task-management.installCodingAgentIntegration",
        async () => {
            await installCodingAgentIntegration(context)
        },
    )
    context.subscriptions.push(installCodingAgentCommand)

    // Register Create Task Space from Task File command
    const createFromFileCommand = vscode.commands.registerCommand(
        "r3bl-task-management.createTaskSpaceFromFile",
        async () => {
            await createTaskSpaceFromFile(manager, statusBarItem)
        },
    )
    context.subscriptions.push(createFromFileCommand)

    // Register Manual Save command
    const saveCommand = vscode.commands.registerCommand(
        "r3bl-task-management.saveCurrentTaskSpace",
        async () => {
            const activeTaskSpace = manager.getActiveTaskSpace()
            if (!activeTaskSpace) {
                showStatusBarMessage("No active task space to save", "warning")
                return
            }

            try {
                const currentTabs = await manager.getCurrentOpenTabs()
                await manager.updateTaskSpaceTabs(activeTaskSpace.id, currentTabs)
                updateStatusBar(statusBarItem, manager)
                showStatusBarMessage(`Saved "${activeTaskSpace.name}"`, "success")
            } catch (error) {
                showStatusBarMessage(`Failed to save: ${error}`, "error")
            }
        },
    )
    context.subscriptions.push(saveCommand)

    // Register Finish Current Task command
    const finishCommand = vscode.commands.registerCommand(
        "r3bl-task-management.finishCurrentTask",
        async () => {
            const activeTaskSpace = manager.getActiveTaskSpace()
            if (!activeTaskSpace) {
                showStatusBarMessage("No active task to finish", "warning")
                return
            }

            const message = `Finish and Archive task "${activeTaskSpace.name}"?\n\nThe associated file "${path.basename(activeTaskSpace.taskFile!)}" will be moved to task/done/.`
            const result = await vscode.window.showWarningMessage(
                message,
                { modal: true },
                "Finish and Move",
            )

            if (result === "Finish and Move") {
                try {
                    await manager.finishCurrentTask()
                    updateStatusBar(statusBarItem, manager)
                    showStatusBarMessage("Task finished and archived", "success")
                } catch (error) {
                    showStatusBarMessage(`Failed to finish task: ${error}`, "error")
                }
            }
        },
    )
    context.subscriptions.push(finishCommand)

    // Register Pause and Jump to Next command
    const pauseAndJumpCommand = vscode.commands.registerCommand(
        "r3bl-task-management.pauseAndJumpToNext",
        async () => {
            const nextQueue = manager.getNextQueue()
            if (nextQueue.length === 0) {
                showStatusBarMessage("Next Queue is empty", "warning")
                return
            }

            const nextTask = nextQueue[0]
            try {
                await manager.jumpToTask(nextTask.id)
                updateStatusBar(statusBarItem, manager)
                showStatusBarMessage(`Jumped to next task: ${nextTask.name}`, "success")
            } catch (error) {
                showStatusBarMessage(`Failed to jump to next task: ${error}`, "error")
            }
        },
    )
    context.subscriptions.push(pauseAndJumpCommand)

    // Register Move Task to Backlog command
    const moveTaskToBacklogCommand = vscode.commands.registerCommand(
        "r3bl-task-management.moveTaskToBacklog",
        async () => {
            const activeTaskSpace = manager.getActiveTaskSpace()
            if (!activeTaskSpace) {
                showStatusBarMessage("No active task to move to backlog", "warning")
                return
            }

            const message = `Move task "${activeTaskSpace.name}" to backlog?\n\nThis will move the file to task/pending/ and clear its context state.`
            const result = await vscode.window.showWarningMessage(
                message,
                { modal: true },
                "Move to Backlog",
            )

            if (result === "Move to Backlog") {
                try {
                    await manager.moveToBacklog(activeTaskSpace.id)
                    updateStatusBar(statusBarItem, manager)
                    showStatusBarMessage("Task moved to backlog", "success")
                } catch (error) {
                    showStatusBarMessage(`Failed to move task: ${error}`, "error")
                }
            }
        },
    )
    context.subscriptions.push(moveTaskToBacklogCommand)

    // Register Close Current Task Space command
    const closeTaskSpaceCommand = vscode.commands.registerCommand(
        "r3bl-task-management.closeCurrentTaskSpace",
        async () => {
            const activeTaskSpace = manager.getActiveTaskSpace()
            if (!activeTaskSpace) {
                showStatusBarMessage("No active task space to close", "info")
                return
            }

            try {
                await manager.closeCurrentTaskSpace()
                updateStatusBar(statusBarItem, manager)
                showStatusBarMessage(
                    `Closed task space "${activeTaskSpace.name}"`,
                    "success",
                )
            } catch (error) {
                showStatusBarMessage(`Failed to close task space: ${error}`, "error")
            }
        },
    )
    context.subscriptions.push(closeTaskSpaceCommand)

    // Register auto-save listener
    const tabChangeDisposable = vscode.window.tabGroups.onDidChangeTabs(async () => {
        // Skip auto-save if tabs changed due to file watcher sync
        // (prevents sync loop: A saves → B syncs → B's tabs change → B auto-saves → ...)
        if (manager.isSyncingFromFileWatcher()) {
            return
        }

        // Check if auto-save is enabled
        const config = vscode.workspace.getConfiguration("r3bl-task-management")
        const autoSave = config.get<boolean>("autoSaveCurrentTaskSpace", true)

        if (!autoSave) {
            return
        }

        // Only auto-save if we have an active task space
        const activeTaskSpace = manager.getActiveTaskSpace()
        if (!activeTaskSpace) {
            return
        }

        // Get debounce delay from settings
        const debounceMs = config.get<number>(
            "autoSaveDebounceMs",
            DEFAULT_AUTO_SAVE_DEBOUNCE_MS,
        )

        // Debounce: wait before saving
        if (autoSaveTimeout) {
            clearTimeout(autoSaveTimeout)
        }

        autoSaveTimeout = setTimeout(async () => {
            try {
                const currentTabs = await manager.getCurrentOpenTabs()
                await manager.updateTaskSpaceTabs(activeTaskSpace.id, currentTabs)
                updateStatusBar(statusBarItem, manager)
            } catch (error) {
                console.error("Failed to auto-save task space:", error)
            }
        }, debounceMs)
    })
    context.subscriptions.push(tabChangeDisposable)

    // Listen for configuration changes (e.g., status bar visibility)
    const configChangeDisposable = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("r3bl-task-management.showStatusBar")) {
            updateStatusBar(statusBarItem, manager)
        }
    })
    context.subscriptions.push(configChangeDisposable)

    // Watch for external changes to task-spaces.json (e.g., git branch switch)
    const workspaceFolders = vscode.workspace.workspaceFolders
    if (workspaceFolders && workspaceFolders.length > 0) {
        const workspaceRoot = workspaceFolders[0].uri.fsPath

        // 1. Watch for task-spaces.json changes
        const taskSpacesPattern = new vscode.RelativePattern(
            workspaceFolders[0],
            ".vscode/task-spaces.json",
        )
        const fileWatcher = vscode.workspace.createFileSystemWatcher(taskSpacesPattern)

        fileWatcher.onDidChange(async () => {
            // Reload data from disk
            const loadedData = await manager.reloadFromDisk()

            // Skip if this is our own save (checksum matches what we wrote)
            if (manager.isOwnSave(loadedData)) {
                return
            }

            // External change (e.g., git checkout, another IDE instance)
            // Check if our active task space was deleted externally
            await manager.clearActiveIfDeleted()

            // Apply changes if tabs differ
            const activeTaskSpace = manager.getActiveTaskSpace()
            if (activeTaskSpace) {
                await manager.switchToTaskSpaceFromFileWatcher(activeTaskSpace.id)
            }

            // Update status bar to reflect new state
            updateStatusBar(statusBarItem, manager)
        })

        context.subscriptions.push(fileWatcher)

        // 2. Watch for task/*.md changes (Dashboard Workflow auto-pickup)
        const taskFilesPattern = new vscode.RelativePattern(
            workspaceFolders[0],
            "task/*.md",
        )
        const taskFileWatcher = vscode.workspace.createFileSystemWatcher(taskFilesPattern)

        taskFileWatcher.onDidCreate(async (uri) => {
            const relativePath = path.relative(workspaceRoot, uri.fsPath)
            await manager.handleFileCreate(relativePath)
            updateStatusBar(statusBarItem, manager)
        })

        taskFileWatcher.onDidDelete(async (uri) => {
            const relativePath = path.relative(workspaceRoot, uri.fsPath)
            await manager.handleFileDelete(relativePath)
            updateStatusBar(statusBarItem, manager)
        })

        context.subscriptions.push(taskFileWatcher)
    }
}

export function deactivate() {
    // Clear any pending auto-save
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout)
    }
    // No cleanup needed
}
