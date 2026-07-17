// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from "vscode"
import { SearchInput } from "./types"

export async function collectSearchInput(): Promise<SearchInput | undefined> {
    const config = vscode.workspace.getConfiguration("r3blFuzzySearch")
    const defaultExcludes = config.get<string>(
        "defaultExcludePattern",
        "**/node_modules/**,**/.git/**,**/.vscode/**,**/target/**",
    )
    const defaultRespectGitignore = config.get<boolean>("respectGitignore", true)

    // Use QuickPick for better UX - shows both query input and exclude patterns
    const quickPick = vscode.window.createQuickPick()
    quickPick.title = "R3BL Fuzzy Search"
    quickPick.placeholder = "Enter search query (e.g., console.log, function, import)"
    quickPick.ignoreFocusOut = true
    quickPick.matchOnDescription = false
    quickPick.matchOnDetail = false

    // Helper function to create items with current state
    const createItems = (excludes: string, respectGitignore: boolean) => [
        {
            label: "$(filter) Exclude Patterns",
            description: excludes || "None",
            detail: respectGitignore
                ? "■ .gitignore  •  Icons toggle .gitignore, change patterns"
                : "□ .gitignore  •  Icons toggle .gitignore, change patterns",
            alwaysShow: true,
        },
    ]

    // Show current exclude patterns as items (for reference)
    quickPick.items = createItems(defaultExcludes, defaultRespectGitignore)

    // Add buttons to modify excludes and toggle gitignore
    quickPick.buttons = [
        {
            iconPath: new vscode.ThemeIcon("settings-gear"),
            tooltip: "Modify Exclude Patterns",
        },
        {
            iconPath: new vscode.ThemeIcon("search-stop"),
            tooltip: "Toggle .gitignore Respect",
        },
    ]

    return new Promise((resolve) => {
        let currentExcludes = defaultExcludes
        let currentRespectGitignore = defaultRespectGitignore
        let isTemporaryHide = false // Track if hide is temporary (for showing InputBox)

        quickPick.onDidAccept(() => {
            const query = quickPick.value.trim()

            // If user typed a query, execute search
            if (query) {
                quickPick.hide()
                resolve({
                    query,
                    excludePatterns: currentExcludes,
                    respectGitignore: currentRespectGitignore,
                })
            }
        })

        quickPick.onDidTriggerButton(async (button) => {
            const buttonIndex = quickPick.buttons.indexOf(button)

            if (buttonIndex === 0) {
                // User clicked settings button - hide QuickPick and show exclude patterns input
                isTemporaryHide = true
                quickPick.hide()

                const newExcludes = await vscode.window.showInputBox({
                    prompt: "Files to exclude (comma-separated globs)",
                    value: currentExcludes,
                    placeHolder: "e.g., **/test/**, **/dist/**",
                    ignoreFocusOut: true,
                })

                if (newExcludes !== undefined) {
                    currentExcludes = newExcludes
                }

                // Show QuickPick again with updated values
                quickPick.items = createItems(currentExcludes, currentRespectGitignore)
                isTemporaryHide = false
                quickPick.show()
            } else if (buttonIndex === 1) {
                // User clicked toggle gitignore button
                currentRespectGitignore = !currentRespectGitignore
                // Update the display
                quickPick.items = createItems(currentExcludes, currentRespectGitignore)
            }
        })

        quickPick.onDidHide(() => {
            // Only dispose and resolve if this is not a temporary hide
            if (!isTemporaryHide) {
                quickPick.dispose()
                resolve(undefined)
            }
        })

        quickPick.show()
    })
}
