// Copyright (c) 2024-2026 R3BL LLC. Licensed under MIT License.

import * as vscode from "vscode"
import { showStatusBarMessage } from "r3bl-common-code"

export type CommentBrightnessLevel = "dim" | "medium" | "bright"

export const COMMENT_COLORS: Record<CommentBrightnessLevel, string> = {
    dim: "#8B949E",
    medium: "#ABACAC",
    bright: "#E8DCF4",
}

export const COMMENT_DESCRIPTIONS: Record<CommentBrightnessLevel, string> = {
    dim: "Cool slate gray for maximum eye comfort (Default)",
    medium: "Neutral silver gray for balanced contrast",
    bright: "Vibrant lavender for high contrast",
}

export const ALL_R3BL_THEMES = [
    "R3BL Theme",
    "R3BL 2026 Theme",
    "R3BL Theme (No Italic)",
    "R3BL 2026 Theme (No Italic)",
] as const

export const COMMENT_SCOPES = [
    "comment",
    "punctuation.definition.comment",
    "unused.comment",
    "wildcard.comment",
    "comment.line.graphql",
    "string.block.description.graphql.DOCSTRING",
]

/**
 * Builds the updated `editor.tokenColorCustomizations` object, preserving any
 * existing non-R3BL theme blocks or unrelated textMate rules.
 */
export function buildTokenColorCustomizations(
    level: CommentBrightnessLevel,
    existing: Record<string, any> = {},
): Record<string, any> {
    const color = COMMENT_COLORS[level]
    const updated: Record<string, any> = { ...existing }

    for (const themeName of ALL_R3BL_THEMES) {
        const themeKey = `[${themeName}]`
        const existingThemeBlock =
            existing[themeKey] && typeof existing[themeKey] === "object"
                ? { ...existing[themeKey] }
                : {}

        // Preserve other rules not targeting comment scopes
        const otherRules = Array.isArray(existingThemeBlock.textMateRules)
            ? existingThemeBlock.textMateRules.filter((rule: any) => {
                  if (!rule || !rule.scope) return true
                  const scopes = Array.isArray(rule.scope) ? rule.scope : [rule.scope]
                  return !scopes.some((s: string) => COMMENT_SCOPES.includes(s))
              })
            : []

        updated[themeKey] = {
            ...existingThemeBlock,
            comments: color,
            textMateRules: [
                ...otherRules,
                {
                    scope: COMMENT_SCOPES,
                    settings: {
                        foreground: color,
                    },
                },
            ],
        }
    }

    return updated
}

/**
 * Removes R3BL theme customization blocks from `editor.tokenColorCustomizations`.
 * If the resulting object has no other keys, returns `undefined` so the setting can be cleared.
 */
export function removeR3BLTokenCustomizations(
    existing: Record<string, any> = {},
): Record<string, any> | undefined {
    const updated: Record<string, any> = { ...existing }
    for (const themeName of ALL_R3BL_THEMES) {
        delete updated[`[${themeName}]`]
    }
    return Object.keys(updated).length > 0 ? updated : undefined
}

/**
 * Applies the comment brightness level to `editor.tokenColorCustomizations`.
 */
export async function applyCommentBrightness(
    level?: CommentBrightnessLevel,
): Promise<void> {
    const config = vscode.workspace.getConfiguration()
    const activeLevel: CommentBrightnessLevel =
        level || config.get<CommentBrightnessLevel>("r3bl.commentBrightness") || "dim"

    const existing =
        config.get<Record<string, any>>("editor.tokenColorCustomizations") || {}

    const updated = buildTokenColorCustomizations(activeLevel, existing)

    await config.update(
        "editor.tokenColorCustomizations",
        updated,
        vscode.ConfigurationTarget.Global,
    )
}

/**
 * Shows a QuickPick menu allowing the user to pick one of the 3 brightness levels.
 */
export async function showCommentBrightnessQuickPick(): Promise<void> {
    const config = vscode.workspace.getConfiguration()
    const currentLevel =
        config.get<CommentBrightnessLevel>("r3bl.commentBrightness") || "dim"

    interface BrightnessQuickPickItem extends vscode.QuickPickItem {
        level: CommentBrightnessLevel
    }

    const items: BrightnessQuickPickItem[] = [
        {
            label: "$(color-mode) Dim",
            description: `${COMMENT_COLORS.dim} (Default)`,
            detail: COMMENT_DESCRIPTIONS.dim,
            picked: currentLevel === "dim",
            level: "dim",
        },
        {
            label: "$(color-mode) Medium",
            description: COMMENT_COLORS.medium,
            detail: COMMENT_DESCRIPTIONS.medium,
            picked: currentLevel === "medium",
            level: "medium",
        },
        {
            label: "$(color-mode) Bright",
            description: COMMENT_COLORS.bright,
            detail: COMMENT_DESCRIPTIONS.bright,
            picked: currentLevel === "bright",
            level: "bright",
        },
    ]

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `Select comment brightness (current: ${currentLevel})`,
        matchOnDescription: true,
        matchOnDetail: true,
    })

    if (selected) {
        await config.update(
            "r3bl.commentBrightness",
            selected.level,
            vscode.ConfigurationTarget.Global,
        )
        await applyCommentBrightness(selected.level)
        showStatusBarMessage(
            `Comment brightness set to ${selected.level} (${COMMENT_COLORS[selected.level]})`,
            "success",
        )
    }
}
