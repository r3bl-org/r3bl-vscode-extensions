// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from "vscode"
import * as fs from "fs/promises"
import { showStatusBarMessage } from "r3bl-common-code"
import {
    foldAllRustdocs,
    unfoldAllRustdocs,
    RustdocFoldingProvider,
} from "./rustdocFolding"
import { navigateRustdocs } from "./rustdocNavigator"
import {
    RustUseStatementsFoldingProvider,
    findImportBlock,
} from "./rustUseStatementsFolding"
import { insertRustdocLinkDef } from "./rustdocLinkDefs"

// Debounced Flycheck state
let debounceTimeout: NodeJS.Timeout | undefined
let countdownInterval: NodeJS.Timeout | undefined
let statusBarItem: vscode.StatusBarItem | undefined

// Constants
const ROCKET_DISPLAY_DURATION_MS = 700

const SEMANTIC_CONFIG = {
    "editor.semanticHighlighting.enabled": true,
    "editor.semanticTokenColorCustomizations": {
        rules: {
            function: {
                foreground: "#4B8CDC",
            },
            method: {
                foreground: "#4B8CDC",
            },
            unresolvedReference: {
                foreground: "#ff6edb",
                fontStyle: "strikethrough",
            },
            "*.deprecated": {
                fontStyle: "strikethrough",
            },
            namespace: {
                foreground: "#7b939d",
            },
            "method.static": "#4B8CDC",
            "function.static": "#4B8CDC",
            macro: "#4B8CDC",
            struct: "#DDE86E",
            enum: "#FCB141",
            enumMember: {
                foreground: "#FFCE66",
            },
            "*.reference": {
                fontStyle: "italic",
            },
            "*.mutable": {
                fontStyle: "bold",
            },
            "variable.mutable": {
                fontStyle: "bold italic",
            },
            property: "#ad83da",
            variable: "#E192EF",
            parameter: "#7c86f4",
            selfTypeKeyword: "#ce55b7",
            selfKeyword: "#ce55b7",
            lifetime: "#c56db599",
            attributeBracket: "#2469ae",
            angle: "#2469ae",
            escapeSequence: "#2d78c2",
            formatSpecifier: "#2d78c2",
            typeAlias: "#ecc68e",
            operator: {
                fontStyle: "bold",
                foreground: "#4d6a9f",
            },
            "operator.unsafe": "#e02b9d",
            "function.unsafe": "#e02b9d",
            "method.unsafe": "#e02b9d",
            keyword: {
                foreground: "#a8709e",
                fontStyle: "italic bold",
            },
            "*.controlFlow": {
                fontStyle: "bold",
                foreground: "#d14178",
            },
            "*.static": {
                fontStyle: "bold",
                foreground: "#6665c7",
            },
            constParameter: {
                fontStyle: "bold",
                foreground: "#6665c7",
            },
            "*.constant": {
                fontStyle: "bold",
                foreground: "#c465c7",
            },
            "*.trait": "#d1de73",
        },
    },
}

export function activate(context: vscode.ExtensionContext) {
    // Check if R3BL theme is active and auto-apply settings
    const currentTheme = vscode.workspace.getConfiguration("workbench").get("colorTheme")
    if (currentTheme === "R3BL Theme" || currentTheme === "R3BL 2026 Theme") {
        applySemanticConfig()
    }

    // Command to enable R3BL semantic highlighting
    const enableCommand = vscode.commands.registerCommand(
        "r3bl-semantic-config.enable",
        () => {
            applySemanticConfig()
            showStatusBarMessage("R3BL Semantic Highlighting enabled", "success")
        },
    )

    // Command to disable R3BL semantic highlighting
    const disableCommand = vscode.commands.registerCommand(
        "r3bl-semantic-config.disable",
        () => {
            removeSemanticConfig()
            showStatusBarMessage("R3BL Semantic Highlighting disabled", "success")
        },
    )

    // Command to fold all rustdoc comments
    const foldRustdocsCommand = vscode.commands.registerCommand(
        "r3bl-semantic-config.foldRustdocs",
        foldAllRustdocs,
    )

    // Command to unfold all rustdoc comments
    const unfoldRustdocsCommand = vscode.commands.registerCommand(
        "r3bl-semantic-config.unfoldRustdocs",
        unfoldAllRustdocs,
    )

    // Command to navigate rustdoc structure
    const navigateRustdocsCommand = vscode.commands.registerCommand(
        "r3bl-semantic-config.navigateRustdocs",
        navigateRustdocs,
    )

    // Command to scroll current line to top
    const scrollToTopCommand = vscode.commands.registerCommand(
        "r3bl-semantic-config.scrollToTop",
        scrollToTop,
    )

    // Command to insert rustdoc link reference definition
    const insertRustdocLinkDefCommand = vscode.commands.registerCommand(
        "r3bl-semantic-config.insertRustdocLinkDef",
        insertRustdocLinkDef,
    )

    // Register FoldingRangeProvider for rustdoc comments
    const rustdocFoldingProvider = vscode.languages.registerFoldingRangeProvider(
        { language: "rust" },
        new RustdocFoldingProvider(),
    )

    // Register FoldingRangeProvider for use statements (always available)
    const useStatementsFoldingProvider = vscode.languages.registerFoldingRangeProvider(
        { language: "rust" },
        new RustUseStatementsFoldingProvider(),
    )

    // Initialize auto-fold rustdocs on file open
    initializeAutoFoldRustdocs(context)

    // Initialize auto-fold use statements on file open
    initializeAutoFoldUseStatements(context)

    // Initialize debounced flycheck
    initializeDebouncedFlycheck(context)

    // Watch for theme changes and auto-apply semantic config
    const themeWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("workbench.colorTheme")) {
            const theme = vscode.workspace.getConfiguration("workbench").get("colorTheme")
            if (theme === "R3BL Theme" || theme === "R3BL 2026 Theme") {
                applySemanticConfig()
            }
        }
    })

    context.subscriptions.push(
        enableCommand,
        disableCommand,
        foldRustdocsCommand,
        unfoldRustdocsCommand,
        navigateRustdocsCommand,
        scrollToTopCommand,
        insertRustdocLinkDefCommand,
        rustdocFoldingProvider,
        useStatementsFoldingProvider,
        themeWatcher,
    )
}

/**
 * Scrolls the editor so that the current cursor line is at the top of the viewport.
 */
async function scrollToTop(): Promise<void> {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
        return
    }

    const position = editor.selection.active
    const range = new vscode.Range(position, position)
    editor.revealRange(range, vscode.TextEditorRevealType.AtTop)
}

// Auto-fold rustdocs when opening Rust files
function initializeAutoFoldRustdocs(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration("r3bl-semantic-config")
    const getEnabled = () => config.get<boolean>("autoFoldRustdocsOnOpen", false)

    // Track documents that have already been auto-folded this session
    // This prevents re-folding when switching back to an already-open tab
    const alreadyFolded = new Set<string>()

    // Small delay to let VSCode restore cursor position before we fold
    const CURSOR_RESTORE_DELAY_MS = 50

    // Listen for when a text editor becomes active
    const editorWatcher = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
        if (!editor) return
        if (!getEnabled()) return
        if (editor.document.languageId !== "rust") return

        const uriString = editor.document.uri.toString()

        // Skip if already folded this session (e.g., switching back to tab)
        if (alreadyFolded.has(uriString)) {
            return
        }

        // Wait for VSCode to restore cursor position
        await new Promise((resolve) => setTimeout(resolve, CURSOR_RESTORE_DELAY_MS))

        // Only fold if this file is still the active editor
        const currentEditor = vscode.window.activeTextEditor
        if (currentEditor?.document.uri.toString() === uriString) {
            await foldAllRustdocs(true) // silent = true for auto-fold
            alreadyFolded.add(uriString)
        }
    })

    // Clean up tracking when documents are closed
    const closeWatcher = vscode.workspace.onDidCloseTextDocument((document) => {
        alreadyFolded.delete(document.uri.toString())
    })

    // Handle the currently active editor on startup
    const activeEditor = vscode.window.activeTextEditor
    if (activeEditor && getEnabled() && activeEditor.document.languageId === "rust") {
        const uriString = activeEditor.document.uri.toString()
        setTimeout(() => {
            const currentEditor = vscode.window.activeTextEditor
            if (
                currentEditor?.document.uri.toString() === uriString &&
                !alreadyFolded.has(uriString)
            ) {
                foldAllRustdocs(true)
                alreadyFolded.add(uriString)
            }
        }, 100)
    }

    context.subscriptions.push(editorWatcher, closeWatcher)
}

// Auto-fold use statements when opening Rust files
function initializeAutoFoldUseStatements(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration("r3bl-semantic-config")
    const getEnabled = () => config.get<boolean>("autoFoldUseStatementsOnOpen", false)

    // Track documents that have already been auto-folded this session
    const alreadyFolded = new Set<string>()

    // One-time conflict detection per session
    let conflictChecked = false

    const CURSOR_RESTORE_DELAY_MS = 50

    const editorWatcher = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
        if (!editor) return
        if (editor.document.languageId !== "rust") return

        // Check for conflicting settings once per session, on first Rust file open
        if (!conflictChecked) {
            conflictChecked = true
            checkFoldingImportsConflict()
        }

        if (!getEnabled()) return

        const uriString = editor.document.uri.toString()
        if (alreadyFolded.has(uriString)) return

        await new Promise((resolve) => setTimeout(resolve, CURSOR_RESTORE_DELAY_MS))

        const currentEditor = vscode.window.activeTextEditor
        if (currentEditor?.document.uri.toString() === uriString) {
            await foldUseStatements(currentEditor)
            alreadyFolded.add(uriString)
        }
    })

    const closeWatcher = vscode.workspace.onDidCloseTextDocument((document) => {
        alreadyFolded.delete(document.uri.toString())
    })

    // Handle the currently active editor on startup
    const activeEditor = vscode.window.activeTextEditor
    if (activeEditor && getEnabled() && activeEditor.document.languageId === "rust") {
        const uriString = activeEditor.document.uri.toString()
        setTimeout(async () => {
            const currentEditor = vscode.window.activeTextEditor
            if (
                currentEditor?.document.uri.toString() === uriString &&
                !alreadyFolded.has(uriString)
            ) {
                await foldUseStatements(currentEditor)
                alreadyFolded.add(uriString)
            }
        }, 100)
    }

    context.subscriptions.push(editorWatcher, closeWatcher)
}

// Fold only use statement block in the given editor
async function foldUseStatements(editor: vscode.TextEditor): Promise<void> {
    const importBlock = findImportBlock(editor.document)
    if (!importBlock) return

    const originalSelection = editor.selection
    const startPos = new vscode.Position(importBlock.startLine, 0)
    const endPos = new vscode.Position(
        importBlock.endLine,
        editor.document.lineAt(importBlock.endLine).text.length,
    )
    editor.selections = [new vscode.Selection(startPos, endPos)]
    await vscode.commands.executeCommand("editor.createFoldingRangeFromSelection")
    editor.selection = originalSelection
}

// Warn if editor.foldingImportsByDefault conflicts with our setting
function checkFoldingImportsConflict() {
    const autoFoldEnabled = vscode.workspace
        .getConfiguration("r3bl-semantic-config")
        .get<boolean>("autoFoldUseStatementsOnOpen", false)
    const foldingImportsByDefault = vscode.workspace
        .getConfiguration("editor")
        .get<boolean>("foldingImportsByDefault", false)

    if (!autoFoldEnabled && foldingImportsByDefault) {
        vscode.window
            .showWarningMessage(
                "editor.foldingImportsByDefault is true — this may auto-fold Rust use statements even though autoFoldUseStatementsOnOpen is false.",
                "Open Settings",
            )
            .then((choice) => {
                if (choice === "Open Settings") {
                    vscode.commands.executeCommand(
                        "workbench.action.openSettings",
                        "editor.foldingImportsByDefault",
                    )
                }
            })
    }
}

// Debounced Flycheck Implementation
function initializeDebouncedFlycheck(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration(
        "r3bl-semantic-config.debouncedFlycheck",
    )
    const enabled = config.get<boolean>("enabled", true)

    if (!enabled) {
        return
    }

    // Create status bar item (high priority to ensure visibility)
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        10000,
    )
    statusBarItem.name = "Debounced Flycheck"
    statusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.warningBackground",
    )
    context.subscriptions.push(statusBarItem)

    // Auto-disable rust-analyzer.checkOnSave if configured
    const autoDisable = config.get<boolean>("autoDisableCheckOnSave", true)
    if (autoDisable) {
        disableCheckOnSave()
    }

    // Get configured languages
    const languages = config.get<string[]>("languages", ["rust"])

    // Watch for text document changes
    const documentWatcher = vscode.workspace.onDidChangeTextDocument((event) => {
        if (!languages.includes(event.document.languageId)) {
            return
        }

        const delayMs = config.get<number>("delayMs", 1000)
        startDebounce(delayMs)
    })

    // Register manual flycheck command that cancels pending debounce
    const flycheckCommand = vscode.commands.registerCommand(
        "r3bl-semantic-config.runFlycheck",
        () => {
            // Cancel pending debounced flycheck
            cancelDebounce()

            // Run flycheck immediately
            vscode.commands.executeCommand("rust-analyzer.runFlycheck")
        },
    )

    // Watch for configuration changes
    const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("r3bl-semantic-config.debouncedFlycheck")) {
            // Reload configuration
            const newConfig = vscode.workspace.getConfiguration(
                "r3bl-semantic-config.debouncedFlycheck",
            )
            const newEnabled = newConfig.get<boolean>("enabled", true)

            if (!newEnabled) {
                cancelDebounce()
                if (statusBarItem) {
                    statusBarItem.hide()
                }
            }
        }
    })

    context.subscriptions.push(documentWatcher, flycheckCommand, configWatcher)
}

async function disableCheckOnSave() {
    const rustAnalyzerConfig = vscode.workspace.getConfiguration("rust-analyzer")
    const currentValue = rustAnalyzerConfig.get("checkOnSave")

    if (currentValue !== false) {
        try {
            await rustAnalyzerConfig.update(
                "checkOnSave",
                false,
                vscode.ConfigurationTarget.Global,
            )
            showStatusBarMessage(
                "Disabled rust-analyzer.checkOnSave (debounced flycheck handling)",
                "info",
            )
        } catch (error) {
            showStatusBarMessage(
                `Failed to disable rust-analyzer.checkOnSave: ${error}`,
                "error",
            )
        }
    }
}

function startDebounce(delayMs: number) {
    // Cancel existing timers
    if (debounceTimeout) {
        clearTimeout(debounceTimeout)
    }
    if (countdownInterval) {
        clearInterval(countdownInterval)
    }

    const startTime = Date.now()

    // Update status bar with countdown
    const updateStatusBar = () => {
        if (!statusBarItem) return

        const remaining = Math.max(0, delayMs - (Date.now() - startTime))
        statusBarItem.text = `$(watch) Flycheck in ${(remaining / 1000).toFixed(1)}s`
        statusBarItem.tooltip = "Debounced flycheck pending - will run after typing stops"
    }

    updateStatusBar()
    if (statusBarItem) {
        statusBarItem.show()
    }

    countdownInterval = setInterval(updateStatusBar, 100)

    debounceTimeout = setTimeout(() => {
        if (countdownInterval) {
            clearInterval(countdownInterval)
            countdownInterval = undefined
        }

        if (statusBarItem) {
            statusBarItem.text = "$(rocket) Running flycheck..."
        }

        vscode.commands.executeCommand("rust-analyzer.runFlycheck")

        // Keep the rocket visible so user can see it
        setTimeout(() => {
            if (statusBarItem) {
                statusBarItem.hide()
            }
        }, ROCKET_DISPLAY_DURATION_MS)

        debounceTimeout = undefined
    }, delayMs)
}

function cancelDebounce() {
    if (debounceTimeout) {
        clearTimeout(debounceTimeout)
        debounceTimeout = undefined
    }
    if (countdownInterval) {
        clearInterval(countdownInterval)
        countdownInterval = undefined
    }
    if (statusBarItem) {
        statusBarItem.hide()
    }
}

async function applySemanticConfig() {
    const config = vscode.workspace.getConfiguration()

    try {
        // First clean existing token customizations to avoid pollution
        await config.update(
            "editor.tokenColorCustomizations",
            undefined,
            vscode.ConfigurationTarget.Global,
        )
        await config.update(
            "editor.semanticTokenColorCustomizations",
            undefined,
            vscode.ConfigurationTarget.Global,
        )

        // Then apply fresh configuration
        for (const [key, value] of Object.entries(SEMANTIC_CONFIG)) {
            await config.update(key, value, vscode.ConfigurationTarget.Global)
        }

        // Check for duplicate settings after successful application
        await checkForDuplicateSettings()

        showStatusBarMessage("R3BL semantic highlighting applied", "success")
    } catch (error) {
        showStatusBarMessage(`Failed to apply semantic config: ${error}`, "error")
    }
}

async function removeSemanticConfig() {
    const config = vscode.workspace.getConfiguration()

    try {
        // Reset to undefined (removes the setting)
        for (const key of Object.keys(SEMANTIC_CONFIG)) {
            await config.update(key, undefined, vscode.ConfigurationTarget.Global)
        }
        showStatusBarMessage("R3BL semantic highlighting removed", "success")
    } catch (error) {
        showStatusBarMessage(`Failed to remove semantic config: ${error}`, "error")
    }
}

async function checkForDuplicateSettings() {
    try {
        const settingsPath = getSettingsPath()
        const settingsContent = await fs.readFile(settingsPath, "utf8")

        // Count occurrences of "editor.semanticHighlighting.enabled"
        const matches = settingsContent.match(/"editor\.semanticHighlighting\.enabled"/g)
        const count = matches ? matches.length : 0

        if (count > 1) {
            const message = `Multiple 'editor.semanticHighlighting.enabled' entries detected in settings.json (${count} found). This can happen with language-specific overrides and may cause conflicts. Please consolidate to a single entry.`

            const action = await vscode.window.showWarningMessage(
                message,
                "Open Settings",
                "Ignore",
            )

            if (action === "Open Settings") {
                await vscode.commands.executeCommand("workbench.action.openSettingsJson")
            }
        }
    } catch (error) {
        // Show error in VS Code dialog to understand what's failing
        showStatusBarMessage(`Failed to check for duplicate settings: ${error}`, "error")
        console.warn("Failed to check for duplicate settings:", error)
    }
}

function getSettingsPath(): string {
    const isWindows = process.platform === "win32"
    const isMac = process.platform === "darwin"
    const isInsiders = vscode.env.appName.includes("Insiders")

    if (isWindows) {
        const appFolder = isInsiders ? "Code - Insiders" : "Code"
        return `${process.env.APPDATA}/${appFolder}/User/settings.json`
    } else if (isMac) {
        const appFolder = isInsiders ? "Code - Insiders" : "Code"
        return `${process.env.HOME}/Library/Application Support/${appFolder}/User/settings.json`
    } else {
        const appFolder = isInsiders ? "Code - Insiders" : "Code"
        return `${process.env.HOME}/.config/${appFolder}/User/settings.json`
    }
}

export function deactivate() {
    // Clean up debounce timers
    if (debounceTimeout) {
        clearTimeout(debounceTimeout)
    }
    if (countdownInterval) {
        clearInterval(countdownInterval)
    }
    if (statusBarItem) {
        statusBarItem.hide()
        statusBarItem.dispose()
    }
}
