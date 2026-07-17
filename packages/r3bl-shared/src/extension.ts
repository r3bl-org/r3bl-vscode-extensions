// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from "vscode"
import { StatusBarMessageQueue, StatusBarMessageType } from "./statusBarMessageQueue"

/**
 * R3BL Shared Utilities Extension
 *
 * This extension provides shared APIs for all R3BL extensions.
 * It runs invisibly in the background and manages:
 * - Centralized status bar message queue (prevents message overlap)
 * - Common utilities shared across R3BL extensions
 *
 * Other R3BL extensions depend on this extension via extensionDependencies.
 */

export interface R3BLSharedAPI {
    /**
     * Show a status bar message with queuing support.
     * All R3BL extensions should use this instead of direct VSCode notifications.
     * Messages are queued and displayed sequentially to prevent overlapping.
     */
    showStatusBarMessage(message: string, type: StatusBarMessageType): void

    /**
     * Get the StatusBarMessageType enum for convenience
     */
    StatusBarMessageType: typeof StatusBarMessageType
}

export function activate(context: vscode.ExtensionContext): R3BLSharedAPI {
    console.log("R3BL Shared Utilities extension is now active")

    // Return API for other R3BL extensions to consume
    return {
        showStatusBarMessage(
            message: string,
            type: StatusBarMessageType = StatusBarMessageType.Info,
        ): void {
            StatusBarMessageQueue.show(message, type)
        },
        StatusBarMessageType,
    }
}

export function deactivate() {
    StatusBarMessageQueue.dispose()
}
