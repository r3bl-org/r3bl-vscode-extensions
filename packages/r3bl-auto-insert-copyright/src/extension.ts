// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode"
import { showStatusBarMessage } from "r3bl-common-code"
import * as copyrightService from "./copyright/copyrightService"

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Perform a copyright check upon extension activation.
    copyrightService.handleCopyrightCheck(vscode.window.activeTextEditor)

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const disposable = vscode.commands.registerCommand(
        "r3bl-auto-insert-copyright.prepend_copyright",
        () => {
            const copyrightAdded = copyrightService.handleManualCopyrightCheck(
                vscode.window.activeTextEditor,
            )
            if (copyrightAdded) {
                showStatusBarMessage("Copyright Added", "success")
            } else {
                showStatusBarMessage(
                    "Copyright could not be added to this file",
                    "warning",
                )
            }
        },
    )

    // Create listener for automatically handling copyright checks.
    vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor | undefined) => {
        copyrightService.handleCopyrightCheck(editor)
    })

    context.subscriptions.push(disposable)
}

// This method is called when your extension is deactivated
export function deactivate() {
    // No cleanup needed
}
