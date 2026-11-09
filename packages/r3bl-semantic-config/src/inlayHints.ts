// Copyright (c) 2024-2026 R3BL LLC. Licensed under MIT License.

import * as vscode from "vscode"
import { showStatusBarMessage } from "r3bl-common-code"

/**
 * Determine the next inlay hints state given the current setting value.
 *
 * State transition rules:
 * - If currently "on" or boolean true -> "off"
 * - Otherwise (e.g. "off", false, "offUnlessPressed", "onUnlessPressed", undefined) -> "on"
 */
export function getNextInlayHintsState(currentValue: unknown): "on" | "off" {
    if (currentValue === "on" || currentValue === true) {
        return "off"
    }
    return "on"
}

/**
 * Toggles editor inlay hints globally between "on" and "off".
 */
export async function toggleInlayHints(): Promise<"on" | "off"> {
    const config = vscode.workspace.getConfiguration("editor")
    const currentValue = config.get<unknown>("inlayHints.enabled")
    const nextValue = getNextInlayHintsState(currentValue)

    await config.update(
        "inlayHints.enabled",
        nextValue,
        vscode.ConfigurationTarget.Global,
    )
    showStatusBarMessage(`Inlay hints: ${nextValue}`, "info")

    return nextValue
}
