// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from "vscode"
import { showStatusBarMessage } from "r3bl-common-code"

export interface CuratedTarget {
    readonly label: string
    readonly description: string
    readonly shortLabel: string
}

export const CURATED_TARGETS: readonly CuratedTarget[] = [
    {
        label: "aarch64-apple-darwin",
        description: "macOS (Apple Silicon M1/M2/M3/M4)",
        shortLabel: "macOS ARM",
    },
    {
        label: "x86_64-unknown-linux-gnu",
        description: "Linux (Standard 64-bit)",
        shortLabel: "Linux x64",
    },
    {
        label: "x86_64-pc-windows-gnu",
        description: "Windows (MinGW / GNU toolchain)",
        shortLabel: "Win-GNU x64",
    },
    {
        label: "x86_64-pc-windows-msvc",
        description: "Windows (Visual Studio / MSVC toolchain)",
        shortLabel: "Win-MSVC x64",
    },
]

export type TargetItemKind = "host" | "curated" | "active-custom" | "custom-prompt"

export interface TargetQuickPickItem extends vscode.QuickPickItem {
    readonly targetKind: TargetItemKind
    readonly targetTriple?: string
}

let targetStatusBarItem: vscode.StatusBarItem | undefined

/**
 * Pure function to construct QuickPick items given the currently configured target.
 */
export function buildTargetQuickPickItems(
    currentTarget: string | undefined,
): TargetQuickPickItem[] {
    const trimmedCurrent = currentTarget?.trim() || undefined
    const isCurated = trimmedCurrent
        ? CURATED_TARGETS.some((target) => target.label === trimmedCurrent)
        : false
    const isCustomActive = Boolean(trimmedCurrent && !isCurated)

    const items: TargetQuickPickItem[] = []

    // 1. Host / Default option
    const isHostActive = !trimmedCurrent
    items.push({
        label: isHostActive ? "$(check) Host / Default" : "$(home) Host / Default",
        description: isHostActive
            ? "Clear setting — uses machine native target (Current)"
            : "Clear setting — uses machine native target",
        targetKind: "host",
        targetTriple: undefined,
    })

    // 2. If an active custom target is currently set, show it prominently near the top
    if (isCustomActive && trimmedCurrent) {
        items.push({
            label: `$(check) ${trimmedCurrent}`,
            description: "Active custom target (Current)",
            targetKind: "active-custom",
            targetTriple: trimmedCurrent,
        })
    }

    // 3. Curated targets
    for (const target of CURATED_TARGETS) {
        const isCurrent = target.label === trimmedCurrent
        items.push({
            label: isCurrent ? `$(check) ${target.label}` : target.label,
            description: isCurrent
                ? `${target.description} (Current)`
                : target.description,
            targetKind: "curated",
            targetTriple: target.label,
        })
    }

    // 4. Custom target prompt option
    items.push({
        label: "$(edit) Custom Target...",
        description: "Enter any other target manually via prompt",
        targetKind: "custom-prompt",
        targetTriple: undefined,
    })

    return items
}

/**
 * Pure function to map a target triple to a concise, human-readable label.
 */
export function getHumanReadableTargetLabel(target: string | undefined): string {
    const trimmed = target?.trim()
    if (!trimmed) {
        return "Host"
    }

    const curated = CURATED_TARGETS.find((t) => t.label === trimmed)
    if (curated) {
        return curated.shortLabel
    }

    if (trimmed.includes("wasm")) {
        return "Wasm32"
    }

    return trimmed
}

/**
 * Pure function to map a target triple to a status bar icon.
 * - Apple / macOS -> 🍎
 * - Linux -> 🐧
 * - Windows -> 🪟
 * - WebAssembly -> 🌐
 * - Default / Host / fallback -> $(chip)
 */
export function getTargetIcon(target: string | undefined): string {
    const trimmed = target?.trim().toLowerCase()
    if (!trimmed) {
        return "$(chip)"
    }
    if (trimmed.includes("apple") || trimmed.includes("darwin")) {
        return "🍎"
    }
    if (trimmed.includes("linux")) {
        return "🐧"
    }
    if (trimmed.includes("windows")) {
        return "🪟"
    }
    if (trimmed.includes("wasm")) {
        return "🌐"
    }
    return "$(chip)"
}

/**
 * Pure function to format the status bar label with human-readable text and target icon.
 */
export function formatStatusBarText(target: string | undefined): string {
    const icon = getTargetIcon(target)
    const humanLabel = getHumanReadableTargetLabel(target)
    return `${icon} ${humanLabel}`
}

/**
 * Pure function to format the status bar tooltip.
 */
export function formatStatusBarTooltip(target: string | undefined): string {
    const trimmed = target?.trim()
    if (!trimmed) {
        return "rust-analyzer cargo target: Host (default)\nClick to switch target"
    }
    const curated = CURATED_TARGETS.find((t) => t.label === trimmed)
    const labelSuffix = curated ? ` (${curated.shortLabel})` : ""
    return `rust-analyzer cargo target: ${trimmed}${labelSuffix}\nClick to switch target`
}

/**
 * Checks whether at least one workspace folder is currently open.
 */
export function hasOpenWorkspace(): boolean {
    const workspaceFolders = vscode.workspace.workspaceFolders
    return Boolean(workspaceFolders && workspaceFolders.length > 0)
}

/**
 * Determine configuration target scope (always Workspace since targets are project-scoped).
 */
export function getTargetConfigurationScope(): vscode.ConfigurationTarget {
    return vscode.ConfigurationTarget.Workspace
}

/**
 * Update rust-analyzer.cargo.target and reload workspace.
 */
export async function applyRustTarget(
    newTarget: string | undefined,
    scope: vscode.ConfigurationTarget = getTargetConfigurationScope(),
): Promise<void> {
    const rustAnalyzerConfig = vscode.workspace.getConfiguration("rust-analyzer")

    try {
        if (newTarget === undefined) {
            // When resetting to Host / Default, clear cargo.target from all configuration scopes
            // (WorkspaceFolder, Workspace, Global) so that a user-level setting does not shadow the reset.
            const inspect = rustAnalyzerConfig.inspect<string>("cargo.target")
            if (inspect?.workspaceFolderValue !== undefined) {
                await rustAnalyzerConfig.update(
                    "cargo.target",
                    undefined,
                    vscode.ConfigurationTarget.WorkspaceFolder,
                )
            }
            if (inspect?.workspaceValue !== undefined) {
                await rustAnalyzerConfig.update(
                    "cargo.target",
                    undefined,
                    vscode.ConfigurationTarget.Workspace,
                )
            }
            if (inspect?.globalValue !== undefined) {
                await rustAnalyzerConfig.update(
                    "cargo.target",
                    undefined,
                    vscode.ConfigurationTarget.Global,
                )
            }
            // Always ensure the target scope is cleared if inspect didn't detect any specific scope
            if (
                !inspect?.workspaceFolderValue &&
                !inspect?.workspaceValue &&
                !inspect?.globalValue
            ) {
                await rustAnalyzerConfig.update("cargo.target", undefined, scope)
            }
        } else {
            // Target switching is strictly project-scoped. Never write to Global.
            if (!hasOpenWorkspace()) {
                const msg =
                    "Cannot switch Rust target: Please open a project folder or workspace first."
                vscode.window.showWarningMessage(msg)
                showStatusBarMessage(msg, "warning")
                return
            }
            await rustAnalyzerConfig.update("cargo.target", newTarget, scope)
        }

        // Inform user via shared status bar message
        if (newTarget) {
            showStatusBarMessage(`Rust target switched to ${newTarget}`, "success")
        } else {
            showStatusBarMessage("Rust target reset to Host / Default", "info")
        }

        // Force immediate update of the status bar item
        updateTargetStatusBarItem()

        // Trigger rust-analyzer reload to re-read cargo metadata
        try {
            await vscode.commands.executeCommand("rust-analyzer.reloadWorkspace")
        } catch {
            // rust-analyzer command may fail if extension is not yet loaded
        }
    } catch (error) {
        showStatusBarMessage(`Failed to update rust target: ${error}`, "error")
    }
}

/**
 * Interactive command to switch the active Rust target.
 */
export async function switchRustTarget(): Promise<void> {
    if (!hasOpenWorkspace()) {
        const msg =
            "Cannot switch Rust target: Please open a project folder or workspace first."
        vscode.window.showWarningMessage(msg)
        showStatusBarMessage(msg, "warning")
        return
    }

    const config = vscode.workspace.getConfiguration("rust-analyzer")
    const currentTarget = config.get<string>("cargo.target") || undefined

    const items = buildTargetQuickPickItems(currentTarget)
    const selection = await vscode.window.showQuickPick(items, {
        placeHolder: "Select rust-analyzer cargo target",
        matchOnDescription: true,
    })

    if (!selection) {
        return
    }

    if (selection.targetKind === "custom-prompt") {
        const customTarget = await vscode.window.showInputBox({
            prompt: "Enter target triple (e.g., thumbv7em-none-eabihf, wasm32-unknown-unknown)",
            placeHolder: "target-triple",
            value: currentTarget,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return "Target triple cannot be empty"
                }
                return null
            },
        })

        if (customTarget !== undefined) {
            await applyRustTarget(customTarget.trim())
        }
    } else {
        await applyRustTarget(selection.targetTriple)
    }
}

/**
 * Updates the target status bar item text and visibility.
 */
export function updateTargetStatusBarItem(): void {
    if (!targetStatusBarItem) {
        return
    }

    const pluginConfig = vscode.workspace.getConfiguration("r3bl-semantic-config")
    const showInStatusBar = pluginConfig.get<boolean>("rustTarget.showInStatusBar", true)

    if (!showInStatusBar) {
        targetStatusBarItem.hide()
        return
    }

    // Only show if editing a rust file or in a workspace with rust files
    const activeEditor = vscode.window.activeTextEditor
    const isRustFile = activeEditor?.document.languageId === "rust"

    if (isRustFile || vscode.workspace.workspaceFolders?.length) {
        const config = vscode.workspace.getConfiguration("rust-analyzer")
        const currentTarget = config.get<string>("cargo.target") || undefined

        targetStatusBarItem.text = formatStatusBarText(currentTarget)
        targetStatusBarItem.tooltip = formatStatusBarTooltip(currentTarget)
        targetStatusBarItem.show()
    } else {
        targetStatusBarItem.hide()
    }
}

/**
 * Initializes the status bar item and sets up event listeners.
 */
export function initializeRustTargetStatusBar(context: vscode.ExtensionContext): void {
    targetStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        90,
    )
    targetStatusBarItem.command = "r3bl-semantic-config.switchRustTarget"

    updateTargetStatusBarItem()

    const onActiveEditorChange = vscode.window.onDidChangeActiveTextEditor(() => {
        updateTargetStatusBarItem()
    })

    const onConfigChange = vscode.workspace.onDidChangeConfiguration((e) => {
        if (
            e.affectsConfiguration("rust-analyzer.cargo.target") ||
            e.affectsConfiguration("r3bl-semantic-config.rustTarget.showInStatusBar")
        ) {
            updateTargetStatusBarItem()
        }
    })

    context.subscriptions.push(targetStatusBarItem, onActiveEditorChange, onConfigChange)
}

/**
 * Disposes the target status bar item.
 */
export function disposeRustTargetStatusBar(): void {
    if (targetStatusBarItem) {
        targetStatusBarItem.dispose()
        targetStatusBarItem = undefined
    }
}
