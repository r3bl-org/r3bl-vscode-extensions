// Copyright (c) 2024-2026 R3BL LLC. Licensed under MIT License.

import * as vscode from "vscode"
import { R3BL_2027_ICON_THEME_ID, R3BL_2027_THEMES } from "r3bl-common-code"

/**
 * Returns true if the given color theme name is one of the R3BL 2027 Theme variants.
 */
export function isR3BL2027Theme(theme?: string): boolean {
    return Boolean(theme && (R3BL_2027_THEMES as readonly string[]).includes(theme))
}

/**
 * Programmatically sets `workbench.iconTheme` to `R3BL 2027 Icons` (`r3bl-2027-icons`)
 * when an R3BL 2027 Theme variant is active. Leaves `workbench.iconTheme` untouched when
 * switching away to any other theme.
 */
export async function applyIconThemeForColorTheme(theme?: string): Promise<boolean> {
    const workbenchConfig = vscode.workspace.getConfiguration("workbench")
    const activeTheme = theme ?? workbenchConfig.get<string>("colorTheme")

    if (!isR3BL2027Theme(activeTheme)) {
        return false
    }

    const currentIconTheme = workbenchConfig.get<string>("iconTheme")
    if (currentIconTheme === R3BL_2027_ICON_THEME_ID) {
        return false
    }

    await workbenchConfig.update(
        "iconTheme",
        R3BL_2027_ICON_THEME_ID,
        vscode.ConfigurationTarget.Global,
    )
    return true
}
