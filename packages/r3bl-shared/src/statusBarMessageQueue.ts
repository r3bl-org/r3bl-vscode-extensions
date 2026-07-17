// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from "vscode"

export enum StatusBarMessageType {
    Info = "info",
    Success = "success",
    Warning = "warning",
    Error = "error",
}

export type FeedbackMechanism = "none" | "notification" | "statusbar"

interface QueuedMessage {
    message: string
    type: StatusBarMessageType
}

/**
 * Centralized message queue for status bar messages.
 * This class is used ONLY by the r3bl-shared extension to manage the queue.
 * Other extensions should use the StatusBarMessage wrapper instead.
 */
export class StatusBarMessageQueue {
    private static statusBarItem: vscode.StatusBarItem | undefined
    private static hideTimeout: NodeJS.Timeout | undefined
    private static messageQueue: QueuedMessage[] = []
    private static isProcessingQueue = false

    private static readonly DEFAULT_DURATIONS = {
        success: 3000,
        info: 3000,
        warning: 4000,
        error: 5000,
    }

    /**
     * Show a message using the centralized queue.
     * This is the actual implementation used by r3bl-shared extension.
     */
    static show(
        message: string,
        type: StatusBarMessageType = StatusBarMessageType.Info,
    ): void {
        console.log("[StatusBarMessageQueue.show] Called with:", { message, type })

        const config = vscode.workspace.getConfiguration("r3bl")
        const feedbackMechanism = config.get<FeedbackMechanism>(
            "transientFeedbackMechanism",
            "statusbar",
        )

        console.log("[StatusBarMessageQueue.show] Config:", { feedbackMechanism })

        switch (feedbackMechanism) {
            case "none":
                return

            case "notification":
                this.showAsNotification(message, type)
                break

            case "statusbar":
            default:
                this.messageQueue.push({ message, type })
                this.processQueue()
                break
        }
    }

    private static processQueue(): void {
        if (this.isProcessingQueue || this.messageQueue.length === 0) {
            return
        }

        this.isProcessingQueue = true
        const queuedMessage = this.messageQueue.shift()!

        const config = vscode.workspace.getConfiguration("r3bl")
        const maxLength = config.get<number>("statusbarMessageMaxLength", 50)
        const durationMs = this.getDuration(queuedMessage.type)

        this.showInStatusBar(
            queuedMessage.message,
            queuedMessage.type,
            durationMs,
            maxLength,
        )

        this.hideTimeout = setTimeout(() => {
            this.hide()
            this.isProcessingQueue = false
            this.processQueue()
        }, durationMs)
    }

    private static getDuration(type: StatusBarMessageType): number {
        const config = vscode.workspace.getConfiguration("r3bl.statusbarMessage")

        switch (type) {
            case StatusBarMessageType.Success:
                return config.get<number>(
                    "successDuration",
                    this.DEFAULT_DURATIONS.success,
                )
            case StatusBarMessageType.Info:
                return config.get<number>("infoDuration", this.DEFAULT_DURATIONS.info)
            case StatusBarMessageType.Warning:
                return config.get<number>(
                    "warningDuration",
                    this.DEFAULT_DURATIONS.warning,
                )
            case StatusBarMessageType.Error:
                return config.get<number>("errorDuration", this.DEFAULT_DURATIONS.error)
            default:
                return this.DEFAULT_DURATIONS.info
        }
    }

    private static showAsNotification(message: string, type: StatusBarMessageType): void {
        switch (type) {
            case StatusBarMessageType.Error:
                vscode.window.showErrorMessage(message)
                break
            case StatusBarMessageType.Warning:
                vscode.window.showWarningMessage(message)
                break
            case StatusBarMessageType.Success:
            case StatusBarMessageType.Info:
            default:
                vscode.window.showInformationMessage(message)
                break
        }
    }

    private static showInStatusBar(
        message: string,
        type: StatusBarMessageType,
        durationMs: number,
        maxLength: number,
    ): void {
        if (!this.statusBarItem) {
            this.statusBarItem = vscode.window.createStatusBarItem(
                vscode.StatusBarAlignment.Left,
                100,
            )
        }

        const displayMessage = this.truncateMessage(message, maxLength)
        const icon = this.getIcon(type)
        const color = this.getColor(type)

        this.statusBarItem.text = `${icon} ${displayMessage}`
        this.statusBarItem.color = color
        this.statusBarItem.tooltip = message
        this.statusBarItem.show()
    }

    private static truncateMessage(message: string, maxLength: number): string {
        if (message.length <= maxLength) {
            return message
        }
        return message.substring(0, maxLength - 3) + "..."
    }

    static hide(): void {
        if (this.statusBarItem) {
            this.statusBarItem.hide()
        }
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout)
            this.hideTimeout = undefined
        }
    }

    static dispose(): void {
        this.hide()
        if (this.statusBarItem) {
            this.statusBarItem.dispose()
            this.statusBarItem = undefined
        }
    }

    private static getIcon(type: StatusBarMessageType): string {
        switch (type) {
            case StatusBarMessageType.Success:
                return "$(check)"
            case StatusBarMessageType.Warning:
                return "$(warning)"
            case StatusBarMessageType.Error:
                return "$(error)"
            case StatusBarMessageType.Info:
            default:
                return "$(info)"
        }
    }

    private static getColor(
        type: StatusBarMessageType,
    ): string | vscode.ThemeColor | undefined {
        switch (type) {
            case StatusBarMessageType.Error:
                return new vscode.ThemeColor("errorForeground")
            case StatusBarMessageType.Warning:
                return new vscode.ThemeColor("editorWarning.foreground")
            case StatusBarMessageType.Success:
                return new vscode.ThemeColor("terminal.ansiGreen")
            default:
                return undefined
        }
    }
}
