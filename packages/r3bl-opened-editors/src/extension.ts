// Copyright (c) 2026 R3BL LLC. Licensed under MIT License.

import * as vscode from "vscode"

/**
 * Activates the R3BL Opened Editors extension.
 * Registers the 'Show Opened Editors' dropdown command and the sidebar panel focus command.
 */
export function activate(context: vscode.ExtensionContext): void {
    const commandsToRegister: Array<{ id: string; targetCommand: string }> = [
        {
            id: "r3bl-opened-editors.openedEditors",
            targetCommand: "workbench.action.showAllEditors",
        },
        {
            id: "r3bl-opened-editors.focusOpenEditorsView",
            targetCommand: "workbench.files.action.focusOpenEditorsView",
        },
        {
            id: "r3bl-opened-editors.focusSidebar",
            targetCommand: "workbench.files.action.focusOpenEditorsView",
        },
    ]

    for (const { id, targetCommand } of commandsToRegister) {
        context.subscriptions.push(
            vscode.commands.registerCommand(id, () =>
                vscode.commands.executeCommand(targetCommand),
            ),
        )
    }
}

/**
 * Deactivates the R3BL Opened Editors extension.
 */
export function deactivate(): void {
    // Cleanup if needed
}
