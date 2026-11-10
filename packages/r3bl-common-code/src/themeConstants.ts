// Copyright (c) 2024-2026 R3BL LLC. Licensed under MIT License.

/**
 * Shared theme constants, color overlays, and semantic token rules used across
 * `r3bl-theme` (build-time theme generation) and `r3bl-semantic-config` (runtime).
 *
 * IMPORTANT: Keep this module free of `vscode` runtime imports so plain Node.js
 * build scripts and unit tests can import it directly.
 */

export const ITALIC_THEMES = [
    "R3BL Theme",
    "R3BL 2026 Theme",
    "R3BL 2027 Theme",
] as const

export const NO_ITALIC_THEMES = [
    "R3BL Theme (No Italic)",
    "R3BL 2026 Theme (No Italic)",
    "R3BL 2027 Theme (No Italic)",
] as const

export const ALL_R3BL_THEMES = [...ITALIC_THEMES, ...NO_ITALIC_THEMES] as const

export const R3BL_2027_THEMES = [
    "R3BL 2027 Theme",
    "R3BL 2027 Theme (No Italic)",
] as const

export const R3BL_2027_ICON_THEME_ID = "r3bl-2027-icons"

export const SHARED_INLAY_HINT_COLORS = {
    "editorInlayHint.background": "#4cb2a933",
    "editorInlayHint.foreground": "#ced491ee",
    "editorInlayHint.parameterBackground": "#3068ab33",
    "editorInlayHint.parameterForeground": "#48acccee",
    "editorInlayHint.typeBackground": "#6b356c33",
    "editorInlayHint.typeForeground": "#f2d1f2cc",
} as const

export const SHARED_ERROR_LENS_COLORS = {
    "errorLens.errorForeground": "#febbf3",
    "errorLens.warningForeground": "#f4d29f",
    "errorLens.infoForeground": "#96dcff",
    "errorLens.hintForeground": "#c1ffc1",
} as const

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

export const COMMENT_SCOPES = [
    "comment",
    "punctuation.definition.comment",
    "unused.comment",
    "wildcard.comment",
    "comment.line.graphql",
    "string.block.description.graphql.DOCSTRING",
]

export const BASE_SEMANTIC_RULES = {
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
    "*.mutable": {
        fontStyle: "bold",
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
} as const

export const SEMANTIC_RULES_ITALIC = {
    ...BASE_SEMANTIC_RULES,
    "*.reference": {
        fontStyle: "italic",
    },
    "variable.mutable": {
        fontStyle: "bold italic",
    },
    keyword: {
        foreground: "#a8709e",
        fontStyle: "italic bold",
    },
} as const

export const SEMANTIC_RULES_NO_ITALIC = {
    ...BASE_SEMANTIC_RULES,
    "*.reference": {
        fontStyle: "",
    },
    "variable.mutable": {
        fontStyle: "bold",
    },
    keyword: {
        foreground: "#a8709e",
        fontStyle: "bold",
    },
} as const
