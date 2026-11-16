// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from "vscode"
import * as path from "path"
import { showStatusBarMessage } from "r3bl-common-code"
import { TaskSpace } from "./types"
import { TaskSpaceManager } from "./taskSpaceManager"
import { promptToInstallCodingAgentIntegration } from "./codingAgentIntegration"

interface TaskSpaceQuickPickItem extends vscode.QuickPickItem {
    taskSpace?: TaskSpace
    action?: "create" | "push-new" | "switch" | "finish" | "pop" | "close"
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
    quickPick.placeholder = "Dashboard: Select a task (Enter = switch) or push onto stack"
    quickPick.matchOnDescription = true
    quickPick.matchOnDetail = true

    // Populate items
    const items: TaskSpaceQuickPickItem[] = []

    const activeTaskSpace = manager.getActiveTaskSpace()
    const stackState = manager.getStackState()
    const excludedIds = new Set<string>()
    if (activeTaskSpace) excludedIds.add(activeTaskSpace.id)

    // 1 & 2: Project Actions (top) + Current Context (middle) from Typestate (`empty` | `on-stack` | `browsing-stack` | `parked`)
    switch (stackState.mode) {
        case "on-stack": {
            const headSpace = manager.getTaskSpaceById(stackState.headTaskSpaceId)
            const parentId =
                stackState.pausedTaskSpaceIds[stackState.pausedTaskSpaceIds.length - 1]
            const parentSpace = manager.getTaskSpaceById(parentId)
            const headName = headSpace?.name ?? "current task"
            const parentName = parentSpace?.name ?? "parent task"

            items.push({
                label: "Actions",
                kind: vscode.QuickPickItemKind.Separator,
            })
            items.push({
                label: "$(add) Create New Task Space",
                description: "Clone current tabs into a new task space (parks stack)",
                action: "create",
            })
            items.push({
                label: "$(layers) Push New Subtask",
                description: `Start clean (only new .md) & push "${headName}" onto stack`,
                action: "push-new",
            })
            items.push({
                label: "$(reply) Pop Task Stack",
                description: `Pause "${headName}" & return to "${parentName}" (Alt+Shift+J)`,
                action: "pop",
            })
            items.push({
                label: `$(check) Finish Current Task: ${headName}`,
                description: `Archive task & pop back to "${parentName}" (Alt+Shift+F)`,
                action: "finish",
            })
            items.push({
                label: `$(close) Close Current Task Space: ${headName}`,
                description: "Save and close tabs (parks stack) (Alt+Shift+C)",
                action: "close",
            })

            items.push({
                label: "Active Task Stack",
                kind: vscode.QuickPickItemKind.Separator,
            })
            if (headSpace) {
                excludedIds.add(headSpace.id)
                items.push(
                    createStackOrActiveItem(
                        headSpace,
                        "$(arrow-right) [HEAD] ",
                        "Current active head of Task Stack",
                        false,
                    ),
                )
            }
            const reversedPaused = [...stackState.pausedTaskSpaceIds].reverse()
            reversedPaused.forEach((pausedId, idx) => {
                excludedIds.add(pausedId)
                const ts = manager.getTaskSpaceById(pausedId)
                if (!ts) return
                const depth = idx + 1
                const indent = "  ".repeat(Math.min(depth, 3))
                items.push(
                    createStackOrActiveItem(
                        ts,
                        `${indent}↳ `,
                        `Paused on stack · ${depth} level${depth === 1 ? "" : "s"} down · Enter = browse frame`,
                        true,
                    ),
                )
            })
            break
        }

        case "browsing-stack": {
            const headSpace = manager.getTaskSpaceById(stackState.headTaskSpaceId)
            const headName = headSpace?.name ?? "stack head"

            items.push({
                label: "Actions",
                kind: vscode.QuickPickItemKind.Separator,
            })
            items.push({
                label: "$(add) Create New Task Space",
                description: "Clone current tabs into a new task space (parks stack)",
                action: "create",
            })
            items.push({
                label: "$(layers) Push New Subtask",
                description: `Start clean (only new .md) & push above "${headName}"`,
                action: "push-new",
            })
            if (headSpace) {
                items.push({
                    label: `$(layers) Resume Stack Head: ${headSpace.name}`,
                    description: activeTaskSpace
                        ? `Save "${activeTaskSpace.name}" & return to stack head (Alt+Shift+J)`
                        : "Return to stack head (Alt+Shift+J)",
                    action: "pop",
                })
            }
            if (activeTaskSpace) {
                items.push({
                    label: `$(check) Finish Current Task: ${activeTaskSpace.name}`,
                    description: `Archive frame & return to "${headName}" (Alt+Shift+F)`,
                    action: "finish",
                })
                items.push({
                    label: `$(close) Close Current Task Space: ${activeTaskSpace.name}`,
                    description: "Save and close tabs (parks stack) (Alt+Shift+C)",
                    action: "close",
                })
            }

            items.push({
                label: "Active Task Stack (Browsing)",
                kind: vscode.QuickPickItemKind.Separator,
            })
            if (headSpace) {
                excludedIds.add(headSpace.id)
                items.push(
                    createStackOrActiveItem(
                        headSpace,
                        "$(reply) [Head] ",
                        "Stack Head · Enter or Alt+Shift+J = return to head",
                        true,
                    ),
                )
            }
            const reversedPaused = [...stackState.pausedTaskSpaceIds].reverse()
            reversedPaused.forEach((pausedId, idx) => {
                excludedIds.add(pausedId)
                const ts = manager.getTaskSpaceById(pausedId)
                if (!ts) return
                const depth = idx + 1
                const indent = "  ".repeat(Math.min(depth, 3))
                const isBrowsedActive = pausedId === stackState.activeTaskSpaceId
                items.push(
                    createStackOrActiveItem(
                        ts,
                        isBrowsedActive
                            ? `${indent}$(arrow-right) ↳ [Active] `
                            : `${indent}↳ `,
                        isBrowsedActive
                            ? `Viewing stack frame · ${depth} level${depth === 1 ? "" : "s"} below "${headName}" (stack preserved)`
                            : `Paused on stack · ${depth} level${depth === 1 ? "" : "s"} down · Enter = browse frame`,
                        true,
                    ),
                )
            })
            break
        }

        case "parked": {
            const headSpace = manager.getTaskSpaceById(stackState.headTaskSpaceId)
            const headName = headSpace?.name ?? "stack head"

            items.push({
                label: "Actions",
                kind: vscode.QuickPickItemKind.Separator,
            })
            items.push({
                label: "$(add) Create New Task Space",
                description: "Clone current tabs into a new task space",
                action: "create",
            })
            items.push({
                label: "$(layers) Push New Subtask",
                description: activeTaskSpace
                    ? `Start clean & push "${activeTaskSpace.name}" onto stack above "${headName}"`
                    : `Start clean & push onto parked stack above "${headName}"`,
                action: "push-new",
            })
            if (headSpace) {
                items.push({
                    label: `$(layers) Resume Parked Stack: ${headSpace.name}`,
                    description: activeTaskSpace
                        ? `Save "${activeTaskSpace.name}" & jump back to stack head (Alt+Shift+J)`
                        : "Jump back to parked stack head (Alt+Shift+J)",
                    action: "pop",
                })
            }
            if (activeTaskSpace) {
                items.push({
                    label: `$(check) Finish Current Task: ${activeTaskSpace.name}`,
                    description:
                        "Archive task & close tabs (parked stack preserved) (Alt+Shift+F)",
                    action: "finish",
                })
                items.push({
                    label: `$(close) Close Current Task Space: ${activeTaskSpace.name}`,
                    description: "Save and close current task space tabs (Alt+Shift+C)",
                    action: "close",
                })
            }

            if (activeTaskSpace) {
                items.push({
                    label: "Active Task (Off-Stack)",
                    kind: vscode.QuickPickItemKind.Separator,
                })
                items.push(
                    createStackOrActiveItem(
                        activeTaskSpace,
                        "$(circle-filled) [Active] ",
                        "Working off-stack (parked stack preserved below)",
                        false,
                    ),
                )
            }

            items.push({
                label: "Parked Task Stack",
                kind: vscode.QuickPickItemKind.Separator,
            })
            if (headSpace) {
                excludedIds.add(headSpace.id)
                items.push(
                    createStackOrActiveItem(
                        headSpace,
                        "$(reply) [Head] ",
                        "Parked Stack Head · Enter = resume stack here",
                        true,
                    ),
                )
            }
            const reversedPaused = [...stackState.pausedTaskSpaceIds].reverse()
            reversedPaused.forEach((pausedId, idx) => {
                excludedIds.add(pausedId)
                const ts = manager.getTaskSpaceById(pausedId)
                if (!ts) return
                const indent = "  ".repeat(Math.min(idx + 1, 3))
                items.push(
                    createStackOrActiveItem(
                        ts,
                        `${indent}↳ `,
                        `Paused beneath "${headName}" · Enter = browse frame`,
                        true,
                    ),
                )
            })
            break
        }

        case "empty": {
            items.push({
                label: "Actions",
                kind: vscode.QuickPickItemKind.Separator,
            })
            items.push({
                label: "$(add) Create New Task Space",
                description: "Clone current tabs into a new task space",
                action: "create",
            })
            if (activeTaskSpace) {
                items.push({
                    label: "$(layers) Push New Subtask",
                    description: `Start clean (only new .md) & push "${activeTaskSpace.name}" onto stack`,
                    action: "push-new",
                })
                items.push({
                    label: `$(check) Finish Current Task: ${activeTaskSpace.name}`,
                    description: "Archive task & close tabs (Alt+Shift+F)",
                    action: "finish",
                })
                items.push({
                    label: `$(close) Close Current Task Space: ${activeTaskSpace.name}`,
                    description: "Save and close current task space tabs (Alt+Shift+C)",
                    action: "close",
                })
            }

            if (activeTaskSpace) {
                items.push({
                    label: "Active Task",
                    kind: vscode.QuickPickItemKind.Separator,
                })
                items.push(
                    createStackOrActiveItem(
                        activeTaskSpace,
                        "$(arrow-right) [Active] ",
                        "Current active task space",
                        false,
                    ),
                )
            }
            break
        }

        default: {
            const _exhaustive: never = stackState
            return _exhaustive
        }
    }

    // 3. [Bottom Section] Available Task Spaces
    const allTaskSpaces = manager.getTaskSpaces()
    const availableTasks = allTaskSpaces.filter((ts) => !excludedIds.has(ts.id))
    const canPushFromCurrentContext = !!activeTaskSpace || stackState.mode !== "empty"

    if (availableTasks.length > 0) {
        items.push({
            label: "Available Task Spaces",
            kind: vscode.QuickPickItemKind.Separator,
        })

        // Fetch lastAccessed timestamps for sorting
        const lastAccessedMap = await manager.getAllLastAccessed()
        const sortedAvailable = [...availableTasks].sort((a, b) => {
            const aTime = lastAccessedMap[a.id] || 0
            const bTime = lastAccessedMap[b.id] || 0
            return bTime - aTime
        })

        for (const ts of sortedAvailable) {
            const lastAccessed = lastAccessedMap[ts.id] || ts.createdAt
            items.push(
                createAvailableTaskItem(ts, lastAccessed, canPushFromCurrentContext),
            )
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
        } else if (selected.action === "push-new") {
            await handlePushNewSubtask(manager, statusBar, context)
        } else if (selected.action === "finish") {
            await vscode.commands.executeCommand("r3bl-task-management.finishCurrentTask")
        } else if (selected.action === "pop") {
            await vscode.commands.executeCommand("r3bl-task-management.popTaskSpace")
        } else if (selected.action === "close") {
            await vscode.commands.executeCommand(
                "r3bl-task-management.closeCurrentTaskSpace",
            )
        } else if (selected.taskSpace) {
            await handleSwitchTaskSpace(manager, selected.taskSpace, statusBar)
        }
    })

    // Handle button clicks
    quickPick.onDidTriggerItemButton(async (e) => {
        const item = e.item as TaskSpaceQuickPickItem
        if (!item.taskSpace) return

        const button = e.button
        const ts = item.taskSpace

        if (button.tooltip === "Push onto Stack") {
            quickPick.hide()
            await handlePushTaskSpace(manager, ts, statusBar)
        } else if (button.tooltip === "Rename") {
            quickPick.hide()
            await handleRenameTaskSpace(manager, ts, statusBar)
            await showTaskSpacesDialog(manager, statusBar, context)
        } else if (button.tooltip === "Delete") {
            quickPick.hide()
            await handleDeleteTaskSpace(manager, ts, statusBar)
            await showTaskSpacesDialog(manager, statusBar, context)
        } else if (button.tooltip === "Remove from Stack") {
            quickPick.hide()
            await manager.removeFromTaskStack(ts.id)
            updateStatusBar(statusBar, manager)
            await showTaskSpacesDialog(manager, statusBar, context)
        } else if (button.tooltip === "Move to Backlog") {
            quickPick.hide()
            if (ts.id === activeTaskSpace?.id) {
                await vscode.commands.executeCommand(
                    "r3bl-task-management.moveTaskToBacklog",
                )
            } else {
                await manager.moveToBacklog(ts.id)
                updateStatusBar(statusBar, manager)
                showStatusBarMessage(`Moved "${ts.name}" to backlog`, "success")
                await showTaskSpacesDialog(manager, statusBar, context)
            }
        }
    })

    quickPick.onDidHide(() => quickPick.dispose())
    quickPick.show()
}

/**
 * Show QuickPick to explicitly push an existing task space or a clean new subtask onto the stack.
 */
export async function showPushTaskSpacePicker(
    manager: TaskSpaceManager,
    statusBar: vscode.StatusBarItem,
    context?: vscode.ExtensionContext,
): Promise<void> {
    const activeTaskSpace = manager.getActiveTaskSpace()
    const lastAccessedMap = await manager.getAllLastAccessed()

    const candidates = manager
        .getTaskSpaces()
        .filter((ts) => ts.id !== activeTaskSpace?.id)
        .sort((a, b) => (lastAccessedMap[b.id] || 0) - (lastAccessedMap[a.id] || 0))

    interface PushOption extends vscode.QuickPickItem {
        taskSpace?: TaskSpace
        isNewSubtask?: boolean
    }

    const items: PushOption[] = [
        {
            label: "$(layers) Push New Subtask",
            description:
                "Create a clean task space (only new .md file) & push onto stack",
            isNewSubtask: true,
        },
        ...candidates.map((ts) => ({
            label: `$(book) ${ts.name}`,
            description: `${ts.tabs.length} tabs | ${ts.taskFile ? path.basename(ts.taskFile) : "No file linked"}`,
            taskSpace: ts,
        })),
    ]

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: activeTaskSpace
            ? `Push onto stack (pausing "${activeTaskSpace.name}")`
            : "Select a task space to open",
        matchOnDescription: true,
    })

    if (!selected) return

    if (selected.isNewSubtask) {
        await handlePushNewSubtask(manager, statusBar, context)
    } else if (selected.taskSpace) {
        await handlePushTaskSpace(manager, selected.taskSpace, statusBar)
    }
}

function standardTaskButtons(): vscode.QuickInputButton[] {
    return [
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
    ]
}

function createStackOrActiveItem(
    ts: TaskSpace,
    prefix: string,
    detail: string,
    canRemoveFromStack: boolean,
): TaskSpaceQuickPickItem {
    const buttons: vscode.QuickInputButton[] = []
    if (canRemoveFromStack) {
        buttons.push({
            iconPath: new vscode.ThemeIcon("close"),
            tooltip: "Remove from Stack",
        })
    }
    buttons.push(...standardTaskButtons())

    return {
        label: `${prefix}${ts.name}`,
        description: `${ts.tabs.length} tabs | ${ts.taskFile ? path.basename(ts.taskFile) : "No file linked"}`,
        detail,
        taskSpace: ts,
        buttons,
    }
}

function createAvailableTaskItem(
    ts: TaskSpace,
    lastAccessed: number | undefined,
    canPush: boolean,
): TaskSpaceQuickPickItem {
    const buttons: vscode.QuickInputButton[] = []
    if (canPush) {
        buttons.push({
            iconPath: new vscode.ThemeIcon("layers"),
            tooltip: "Push onto Stack",
        })
    }
    buttons.push(...standardTaskButtons())

    return {
        label: `$(book) ${ts.name}`,
        description: `${ts.tabs.length} tabs | ${ts.taskFile ? path.basename(ts.taskFile) : "No file linked"}`,
        detail: `Last accessed: ${formatRelativeTime(lastAccessed || ts.createdAt)}`,
        taskSpace: ts,
        buttons,
    }
}

function getPausedCount(manager: TaskSpaceManager): number {
    const state = manager.getStackState()
    return state.mode === "empty" ? 0 : state.pausedTaskSpaceIds.length
}

/**
 * Handle explicitly pushing an existing task space onto the stack
 */
async function handlePushTaskSpace(
    manager: TaskSpaceManager,
    taskSpace: TaskSpace,
    statusBar: vscode.StatusBarItem,
): Promise<void> {
    const isJoiningParkedStack =
        manager.getStackState().mode === "parked" &&
        manager.getActiveTaskSpaceId() === taskSpace.id

    if (!isJoiningParkedStack && manager.getActiveTaskSpaceId() === taskSpace.id) {
        showStatusBarMessage(`Already in "${taskSpace.name}"`, "info")
        return
    }

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Pushing "${taskSpace.name}" onto stack...`,
            cancellable: false,
        },
        async () => {
            try {
                await manager.pushTaskSpace(taskSpace.id)
                updateStatusBar(statusBar, manager)
                showStatusBarMessage(
                    isJoiningParkedStack
                        ? `Pushed "${taskSpace.name}" onto parked stack (stack depth: ${getPausedCount(manager)})`
                        : `Pushed to "${taskSpace.name}" (stack depth: ${getPausedCount(manager)})`,
                    "success",
                )
            } catch (error) {
                showStatusBarMessage(`Failed to push task space: ${error}`, "error")
            }
        },
    )
}

/**
 * Shared prompt helper for collecting a unique task space name and optional task/*.md link.
 */
async function promptTaskSpaceDetails(
    manager: TaskSpaceManager,
    namePrompt: string,
): Promise<{ name: string; taskFile?: string } | undefined> {
    const name = await vscode.window.showInputBox({
        prompt: namePrompt,
        placeHolder: "e.g., Feature: User Authentication",
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return "Task space name cannot be empty"
            }

            const taskSpaces = manager.getTaskSpaces()
            if (taskSpaces.some((ts) => ts.name === value)) {
                return `Task space "${value}" already exists`
            }

            return null
        },
    })

    if (!name) {
        return undefined
    }

    const linkTaskFile = await vscode.window.showQuickPick(
        [
            { label: "Yes", description: "Link a task/*.md file" },
            { label: "No", description: "Create new task/*.md file automatically" },
        ],
        { placeHolder: "Link an existing task file?" },
    )

    let taskFile: string | undefined

    if (linkTaskFile?.label === "Yes") {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
        if (workspaceFolder) {
            const taskDir = vscode.Uri.joinPath(workspaceFolder.uri, "task")

            try {
                const files = await vscode.workspace.fs.readDirectory(taskDir)
                const mdFiles = files
                    .filter(
                        ([fileName, type]) =>
                            type === vscode.FileType.File && fileName.endsWith(".md"),
                    )
                    .map(([fileName]) => ({
                        label: fileName,
                        description: "task/" + fileName,
                    }))

                if (mdFiles.length > 0) {
                    const selected = await vscode.window.showQuickPick(
                        [
                            { label: "None", description: "Auto-create task file" },
                            ...mdFiles,
                        ],
                        { placeHolder: "Select a task file" },
                    )

                    if (selected && selected.label !== "None") {
                        taskFile = "task/" + selected.label
                    }
                } else {
                    showStatusBarMessage("No .md files in task/ directory", "info")
                }
            } catch {
                showStatusBarMessage("task/ directory not found", "info")
            }
        }
    }

    return { name, taskFile }
}

/**
 * Handle creating a new task space (clones currently open tabs)
 */
async function handleCreateTaskSpace(
    manager: TaskSpaceManager,
    statusBar: vscode.StatusBarItem,
    context?: vscode.ExtensionContext,
): Promise<void> {
    const details = await promptTaskSpaceDetails(manager, "Enter task space name")
    if (!details) return

    try {
        const taskSpace = await manager.createTaskSpace(details.name, details.taskFile)
        await manager.switchTaskSpace(taskSpace.id)
        updateStatusBar(statusBar, manager)

        showStatusBarMessage(
            `Task space "${details.name}" created (${taskSpace.tabs.length} tabs)`,
            "success",
        )

        if (details.taskFile && context) {
            await promptToInstallCodingAgentIntegration(context)
        }
    } catch (error) {
        showStatusBarMessage(`Failed to create task space: ${error}`, "error")
    }
}

/**
 * Handle pushing a clean new subtask onto the Task Stack (only its task/*.md file open)
 */
async function handlePushNewSubtask(
    manager: TaskSpaceManager,
    statusBar: vscode.StatusBarItem,
    context?: vscode.ExtensionContext,
): Promise<void> {
    const details = await promptTaskSpaceDetails(manager, "Enter subtask name")
    if (!details) return

    try {
        const subtask = await manager.pushNewSubtask(details.name, details.taskFile)
        updateStatusBar(statusBar, manager)

        showStatusBarMessage(
            `Pushed clean subtask "${subtask.name}" (stack depth: ${getPausedCount(manager)})`,
            "success",
        )

        if (details.taskFile && context) {
            await promptToInstallCodingAgentIntegration(context)
        }
    } catch (error) {
        showStatusBarMessage(`Failed to push subtask: ${error}`, "error")
    }
}

/**
 * Handle flat switching to a task space (without pushing current task onto the stack)
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

                // Flat switch task space (or resume parked stack if selecting stack head)
                const outcome = await manager.switchTaskSpace(taskSpace.id)

                progress.report({ increment: 100 })

                // Update status bar
                updateStatusBar(statusBar, manager)

                // Show confirmation
                const actionVerb =
                    outcome === "resumed-stack"
                        ? "Resumed stack head"
                        : outcome === "browsed-stack"
                          ? "Browsing stack frame"
                          : "Switched to"
                showStatusBarMessage(
                    `${actionVerb} "${taskSpace.name}" (${taskSpace.tabs.length} tabs)`,
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
    const stackState = manager.getStackState()
    const stackChain = manager
        .getTaskStackSpaces()
        .map((ts) => ts.name)
        .join(" → ")

    switch (stackState.mode) {
        case "on-stack": {
            const pausedCount = stackState.pausedTaskSpaceIds.length
            const name = activeTaskSpace?.name ?? "Task"
            const tabCount = activeTaskSpace?.tabs.length ?? 0
            statusBarItem.text = `$(layers) ${name} (${tabCount}) [stack: ${pausedCount}]`
            statusBarItem.backgroundColor = undefined
            statusBarItem.tooltip = `Active (Stack Head): ${name}\nTask Stack (bottom → head): ${stackChain}\nPress Alt+Shift+J to pop · Click to manage (Alt+Shift+T)`
            statusBarItem.show()
            return
        }
        case "browsing-stack": {
            const headSpace = manager.getTaskSpaceById(stackState.headTaskSpaceId)
            const headName = headSpace?.name ?? "head"
            const name = activeTaskSpace?.name ?? "Task"
            const tabCount = activeTaskSpace?.tabs.length ?? 0
            statusBarItem.text = `$(layers) ${name} (${tabCount}) [in stack · head: ${headName}]`
            statusBarItem.backgroundColor = undefined
            statusBarItem.tooltip = `Active (Browsing Stack Frame): ${name}\nTask Stack (bottom → head): ${stackChain}\nPress Alt+Shift+J to return to stack head "${headName}" · Click to manage (Alt+Shift+T)`
            statusBarItem.show()
            return
        }
        case "parked": {
            const headSpace = manager.getTaskSpaceById(stackState.headTaskSpaceId)
            const parkedSuffix = headSpace ? ` [parked: ${headSpace.name}]` : ""
            const parkedTooltip = `\nParked Stack (bottom → head): ${stackChain}\nPress Alt+Shift+J to resume stack head`
            if (activeTaskSpace) {
                statusBarItem.text = `$(book) ${activeTaskSpace.name} (${activeTaskSpace.tabs.length})${parkedSuffix}`
                statusBarItem.backgroundColor = undefined
                statusBarItem.tooltip = `Active (off-stack): ${activeTaskSpace.name}${parkedTooltip}\nClick to manage task spaces (Alt+Shift+T)`
            } else {
                statusBarItem.text = `$(book) No Task Space${parkedSuffix}`
                statusBarItem.backgroundColor = new vscode.ThemeColor(
                    "statusBarItem.warningBackground",
                )
                statusBarItem.tooltip = `No active task space${parkedTooltip}\nClick to manage task spaces (Alt+Shift+T)`
            }
            statusBarItem.show()
            return
        }
        case "empty": {
            if (activeTaskSpace) {
                statusBarItem.text = `$(book) ${activeTaskSpace.name} (${activeTaskSpace.tabs.length})`
                statusBarItem.backgroundColor = undefined
                statusBarItem.tooltip = `Active: ${activeTaskSpace.name}\nClick to manage task spaces (Alt+Shift+T)`
            } else {
                statusBarItem.text = "$(book) No Task Space"
                statusBarItem.backgroundColor = new vscode.ThemeColor(
                    "statusBarItem.warningBackground",
                )
                statusBarItem.tooltip =
                    "No active task space\nClick to manage task spaces (Alt+Shift+T)"
            }
            statusBarItem.show()
            return
        }
        default: {
            const _exhaustive: never = stackState
            return _exhaustive
        }
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
