// Copyright (c) 2024-2026 R3BL LLC. Licensed under MIT License.

import * as fs from "fs/promises"
import * as path from "path"
import {
    COMMENT_COLORS,
    COMMENT_SCOPES,
    SEMANTIC_RULES_ITALIC,
    SEMANTIC_RULES_NO_ITALIC,
    SHARED_ERROR_LENS_COLORS,
    SHARED_INLAY_HINT_COLORS,
    SHARED_LINE_HIGHLIGHT_COLORS,
} from "r3bl-common-code/dist/themeConstants"

export interface TokenColorRule {
    name?: string
    scope?: string | string[]
    settings: {
        foreground?: string
        background?: string
        fontStyle?: string
    }
}

export interface VSCodeTheme {
    $schema?: string
    name: string
    type?: string
    colors: Record<string, string>
    semanticHighlighting?: boolean
    semanticTokenColors?: Record<
        string,
        string | { foreground?: string; fontStyle?: string }
    >
    tokenColors: TokenColorRule[]
}

export interface EditionSpec {
    sourceFile: string
    italicName: string
    italicOutputFile: string
    noItalicName: string
    noItalicOutputFile: string
}

export const EDITIONS: EditionSpec[] = [
    {
        sourceFile: "r3bl-theme.edition.jsonc",
        italicName: "R3BL Theme",
        italicOutputFile: "r3bl-theme-color-theme.json",
        noItalicName: "R3BL Theme (No Italic)",
        noItalicOutputFile: "r3bl-theme-no-italic-color-theme.json",
    },
    {
        sourceFile: "r3bl-2026.edition.json",
        italicName: "R3BL 2026 Theme",
        italicOutputFile: "r3bl-2026-theme.json",
        noItalicName: "R3BL 2026 Theme (No Italic)",
        noItalicOutputFile: "r3bl-2026-theme-no-italic.json",
    },
    {
        sourceFile: "r3bl-2027.edition.json",
        italicName: "R3BL 2027 Theme",
        italicOutputFile: "r3bl-2027-theme.json",
        noItalicName: "R3BL 2027 Theme (No Italic)",
        noItalicOutputFile: "r3bl-2027-theme-no-italic.json",
    },
]

/**
 * Parses JSONC (JSON with `//` line comments, block comments, and trailing commas)
 * while preserving `//` sequences inside string literals (e.g. `"vscode://schemas/color-theme"`).
 */
export function parseJsonc<T = unknown>(input: string): T {
    let stripped = ""
    let inString = false
    let escaped = false
    let i = 0

    while (i < input.length) {
        const ch = input[i]
        const next = input[i + 1]

        if (inString) {
            stripped += ch
            if (escaped) {
                escaped = false
            } else if (ch === "\\") {
                escaped = true
            } else if (ch === '"') {
                inString = false
            }
            i++
            continue
        }

        if (ch === '"') {
            inString = true
            stripped += ch
            i++
            continue
        }

        // Line comment: // ...
        if (ch === "/" && next === "/") {
            i += 2
            while (i < input.length && input[i] !== "\n") {
                i++
            }
            continue
        }

        // Block comment: /* ... */
        if (ch === "/" && next === "*") {
            i += 2
            while (i < input.length && !(input[i] === "*" && input[i + 1] === "/")) {
                i++
            }
            i += 2
            continue
        }

        stripped += ch
        i++
    }

    // Strip trailing commas outside strings
    let finalJson = ""
    inString = false
    escaped = false
    for (let j = 0; j < stripped.length; j++) {
        const ch = stripped[j]
        if (inString) {
            finalJson += ch
            if (escaped) {
                escaped = false
            } else if (ch === "\\") {
                escaped = true
            } else if (ch === '"') {
                inString = false
            }
            continue
        }

        if (ch === '"') {
            inString = true
            finalJson += ch
            continue
        }

        if (ch === ",") {
            let k = j + 1
            while (k < stripped.length && /\s/.test(stripped[k])) {
                k++
            }
            if (stripped[k] === "}" || stripped[k] === "]") {
                continue
            }
        }

        finalJson += ch
    }

    return JSON.parse(finalJson) as T
}

/**
 * Removes the `"italic"` token from a VS Code `fontStyle` string while preserving
 * other modifiers such as `"bold"`, `"underline"`, or `"strikethrough"`.
 */
export function stripItalicFontStyle(fontStyle: string): string {
    return fontStyle
        .split(/\s+/)
        .filter((token) => token.length > 0 && token !== "italic")
        .join(" ")
}

/**
 * Strips generic comment rules matching `COMMENT_SCOPES` from `tokenColors` and appends
 * the single canonical R3BL default comment rule (`COMMENT_COLORS.dim`, non-italic).
 */
export function normalizeCommentTokenRules(rules: TokenColorRule[]): TokenColorRule[] {
    const commentScopeSet = new Set<string>(COMMENT_SCOPES)
    const filtered: TokenColorRule[] = []

    for (const rule of rules) {
        if (!rule.scope) {
            filtered.push({ ...rule, settings: { ...rule.settings } })
            continue
        }

        if (typeof rule.scope === "string") {
            if (!commentScopeSet.has(rule.scope)) {
                filtered.push({ ...rule, settings: { ...rule.settings } })
            }
            continue
        }

        const remainingScopes = rule.scope.filter((s) => !commentScopeSet.has(s))
        if (remainingScopes.length > 0) {
            filtered.push({
                ...rule,
                scope: remainingScopes,
                settings: { ...rule.settings },
            })
        }
    }

    filtered.push({
        name: "R3BL Default Comments",
        scope: [...COMMENT_SCOPES],
        settings: {
            foreground: COMMENT_COLORS.dim,
            fontStyle: "",
        },
    })

    return filtered
}

/**
 * Strips `"italic"` from all `tokenColors` and `semanticTokenColors` entries.
 */
function stripItalicsFromTheme(
    tokenColors: TokenColorRule[],
    semanticTokenColors: Record<
        string,
        string | { foreground?: string; fontStyle?: string }
    >,
): {
    tokenColors: TokenColorRule[]
    semanticTokenColors: Record<
        string,
        string | { foreground?: string; fontStyle?: string }
    >
} {
    const cleanTokenColors = tokenColors.map((rule) => {
        const settings = { ...rule.settings }
        if (typeof settings.fontStyle === "string") {
            settings.fontStyle = stripItalicFontStyle(settings.fontStyle)
        }
        return {
            ...rule,
            ...(Array.isArray(rule.scope) ? { scope: [...rule.scope] } : {}),
            settings,
        }
    })

    const cleanSemanticTokens: Record<
        string,
        string | { foreground?: string; fontStyle?: string }
    > = {}
    for (const [key, val] of Object.entries(semanticTokenColors)) {
        if (typeof val === "string") {
            cleanSemanticTokens[key] = val
        } else {
            cleanSemanticTokens[key] = {
                ...val,
                ...(typeof val.fontStyle === "string"
                    ? { fontStyle: stripItalicFontStyle(val.fontStyle) }
                    : {}),
            }
        }
    }

    return {
        tokenColors: cleanTokenColors,
        semanticTokenColors: cleanSemanticTokens,
    }
}

/**
 * Builds both the Italic and `(No Italic)` theme objects from a parsed source edition.
 */
export function buildEditionPair(
    source: VSCodeTheme,
    spec: EditionSpec,
): { italicTheme: VSCodeTheme; noItalicTheme: VSCodeTheme } {
    const mergedColors: Record<string, string> = {
        ...source.colors,
        ...SHARED_INLAY_HINT_COLORS,
        ...SHARED_ERROR_LENS_COLORS,
        ...SHARED_LINE_HIGHLIGHT_COLORS,
    }

    const normalizedTokenColors = normalizeCommentTokenRules(source.tokenColors || [])

    const italicSemanticTokenColors: Record<
        string,
        string | { foreground?: string; fontStyle?: string }
    > = {
        ...(source.semanticTokenColors || {}),
        ...SEMANTIC_RULES_ITALIC,
    }

    const italicTheme: VSCodeTheme = {
        $schema: source.$schema || "vscode://schemas/color-theme",
        name: spec.italicName,
        type: source.type || "dark",
        colors: mergedColors,
        semanticHighlighting: true,
        semanticTokenColors: italicSemanticTokenColors,
        tokenColors: normalizedTokenColors,
    }

    const rawNoItalicSemantic: Record<
        string,
        string | { foreground?: string; fontStyle?: string }
    > = {
        ...(source.semanticTokenColors || {}),
        ...SEMANTIC_RULES_NO_ITALIC,
    }

    const stripped = stripItalicsFromTheme(normalizedTokenColors, rawNoItalicSemantic)

    const noItalicTheme: VSCodeTheme = {
        $schema: source.$schema || "vscode://schemas/color-theme",
        name: spec.noItalicName,
        type: source.type || "dark",
        colors: { ...mergedColors },
        semanticHighlighting: true,
        semanticTokenColors: stripped.semanticTokenColors,
        tokenColors: stripped.tokenColors,
    }

    return { italicTheme, noItalicTheme }
}

async function writeThemeJson(outputPath: string, data: VSCodeTheme): Promise<void> {
    const raw = JSON.stringify(data, null, 4) + "\n"
    await fs.writeFile(outputPath, raw, "utf8")
}

export async function generateAllThemes(
    packageRoot: string = path.resolve(__dirname, ".."),
): Promise<void> {
    const editionsDir = path.join(packageRoot, "src", "editions")
    const themesDir = path.join(packageRoot, "themes")
    await fs.mkdir(themesDir, { recursive: true })

    for (const spec of EDITIONS) {
        const sourcePath = path.join(editionsDir, spec.sourceFile)
        const rawSource = await fs.readFile(sourcePath, "utf8")
        const parsedSource = parseJsonc<VSCodeTheme>(rawSource)

        const { italicTheme, noItalicTheme } = buildEditionPair(parsedSource, spec)

        await writeThemeJson(path.join(themesDir, spec.italicOutputFile), italicTheme)
        await writeThemeJson(path.join(themesDir, spec.noItalicOutputFile), noItalicTheme)
    }
}

if (require.main === module) {
    generateAllThemes()
        .then(() => {
            console.log(`Generated ${EDITIONS.length * 2} theme files successfully.`)
        })
        .catch((err) => {
            console.error("Failed to generate themes:", err)
            process.exit(1)
        })
}
