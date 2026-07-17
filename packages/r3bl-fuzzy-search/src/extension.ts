// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from "vscode"
import { showStatusBarMessage } from "r3bl-common-code"
import { SearchPanel } from "./searchPanel"
import { checkDependencies, checkGitDependency } from "./dependencyChecker"
import { showGitDiffSearchEditor, refreshGitDiffSearchEditor } from "./gitDiffCommand"

export function activate(context: vscode.ExtensionContext) {
    console.log("R3BL Fuzzy Search extension is now active")

    // Register the interactive search command
    const searchDisposable = vscode.commands.registerCommand(
        "r3bl-fuzzy-search.searchInFiles",
        async () => {
            // Check dependencies
            const depsOk = await checkDependencies()
            if (!depsOk) {
                return
            }

            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
            if (!workspaceFolder) {
                showStatusBarMessage("Please open a folder first", "error")
                return
            }

            SearchPanel.createOrShow(context.extensionUri, workspaceFolder.uri.fsPath)
        },
    )

    // Register the git diff search editor command
    const gitDiffDisposable = vscode.commands.registerCommand(
        "r3bl-fuzzy-search.showUnstagedChanges",
        async () => {
            const gitOk = await checkGitDependency()
            if (!gitOk) {
                return
            }
            await showGitDiffSearchEditor()
        },
    )

    // Register the refresh git diff search editor command
    const refreshGitDiffDisposable = vscode.commands.registerCommand(
        "r3bl-fuzzy-search.refreshGitDiff",
        async () => {
            await refreshGitDiffSearchEditor()
        },
    )

    context.subscriptions.push(
        searchDisposable,
        gitDiffDisposable,
        refreshGitDiffDisposable,
    )
}

export function deactivate() {
    console.log("R3BL Fuzzy Search extension is now deactivated")
}
