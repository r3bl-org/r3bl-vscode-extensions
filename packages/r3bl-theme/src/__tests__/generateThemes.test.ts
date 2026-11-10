// Copyright (c) 2024-2026 R3BL LLC. Licensed under MIT License.

import * as fs from "fs"
import * as path from "path"
import {
    ALL_R3BL_THEMES,
    COMMENT_COLORS,
    COMMENT_SCOPES,
    R3BL_2027_ICON_THEME_ID,
    SEMANTIC_RULES_ITALIC,
    SEMANTIC_RULES_NO_ITALIC,
    SHARED_ERROR_LENS_COLORS,
    SHARED_INLAY_HINT_COLORS,
} from "r3bl-common-code/dist/themeConstants"
import {
    EDITIONS,
    VSCodeTheme,
    buildEditionPair,
    parseJsonc,
    stripItalicFontStyle,
} from "../generateThemes"

const PACKAGE_ROOT = path.resolve(__dirname, "..", "..")
const EDITIONS_DIR = path.join(PACKAGE_ROOT, "src", "editions")
const THEMES_DIR = path.join(PACKAGE_ROOT, "themes")
const ICON_THEME_PATH = path.join(
    PACKAGE_ROOT,
    "icons",
    R3BL_2027_ICON_THEME_ID,
    "theme.json",
)

describe("generateThemes", () => {
    describe("stripItalicFontStyle", () => {
        it("removes standalone italic and preserves other fontStyle modifiers", () => {
            expect(stripItalicFontStyle("italic")).toBe("")
            expect(stripItalicFontStyle("italic bold")).toBe("bold")
            expect(stripItalicFontStyle("bold italic")).toBe("bold")
            expect(stripItalicFontStyle("underline italic")).toBe("underline")
            expect(stripItalicFontStyle("bold")).toBe("bold")
            expect(stripItalicFontStyle("")).toBe("")
        })
    })

    describe("parseJsonc", () => {
        it("strips // and /* */ comments and trailing commas without corrupting URLs", () => {
            const sample = `
            // Leading comment with https://example.com
            {
                "$schema": "vscode://schemas/color-theme", // inline comment
                /* block comment */
                "colors": {
                    "editor.background": "#1e1e2e",
                },
            }`
            const parsed = parseJsonc<{
                $schema: string
                colors: Record<string, string>
            }>(sample)
            expect(parsed.$schema).toBe("vscode://schemas/color-theme")
            expect(parsed.colors["editor.background"]).toBe("#1e1e2e")
        })
    })

    describe("generated theme files in themes/", () => {
        it("covers all 6 R3BL themes in package.json and themeConstants", () => {
            expect(ALL_R3BL_THEMES).toHaveLength(6)
            const pkg = JSON.parse(
                fs.readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8"),
            )
            const contributedLabels = pkg.contributes.themes.map(
                (t: { label: string }) => t.label,
            )
            for (const themeName of ALL_R3BL_THEMES) {
                expect(contributedLabels).toContain(themeName)
            }
        })

        for (const spec of EDITIONS) {
            describe(`${spec.italicName} & ${spec.noItalicName}`, () => {
                let expectedItalic: VSCodeTheme
                let expectedNoItalic: VSCodeTheme
                let diskItalic: VSCodeTheme
                let diskNoItalic: VSCodeTheme

                beforeAll(() => {
                    const rawSource = fs.readFileSync(
                        path.join(EDITIONS_DIR, spec.sourceFile),
                        "utf8",
                    )
                    const parsedSource = parseJsonc<VSCodeTheme>(rawSource)
                    const pair = buildEditionPair(parsedSource, spec)
                    expectedItalic = pair.italicTheme
                    expectedNoItalic = pair.noItalicTheme

                    diskItalic = JSON.parse(
                        fs.readFileSync(
                            path.join(THEMES_DIR, spec.italicOutputFile),
                            "utf8",
                        ),
                    )
                    diskNoItalic = JSON.parse(
                        fs.readFileSync(
                            path.join(THEMES_DIR, spec.noItalicOutputFile),
                            "utf8",
                        ),
                    )
                })

                it("matches generator output with zero drift on disk", () => {
                    expect(diskItalic).toEqual(expectedItalic)
                    expect(diskNoItalic).toEqual(expectedNoItalic)
                })

                it("applies shared inlay hint and ErrorLens colors identically", () => {
                    for (const [key, hex] of Object.entries(SHARED_INLAY_HINT_COLORS)) {
                        expect(diskItalic.colors[key]).toBe(hex)
                        expect(diskNoItalic.colors[key]).toBe(hex)
                    }
                    for (const [key, hex] of Object.entries(SHARED_ERROR_LENS_COLORS)) {
                        expect(diskItalic.colors[key]).toBe(hex)
                        expect(diskNoItalic.colors[key]).toBe(hex)
                    }
                })

                it("normalizes default comment scopes to dim (#8B949E)", () => {
                    for (const theme of [diskItalic, diskNoItalic]) {
                        const lastRule = theme.tokenColors[theme.tokenColors.length - 1]
                        expect(lastRule.scope).toEqual(COMMENT_SCOPES)
                        expect(lastRule.settings.foreground).toBe(COMMENT_COLORS.dim)
                        expect(lastRule.settings.fontStyle).toBe("")
                    }
                })

                it("applies R3BL semantic token rules to both variants", () => {
                    expect(diskItalic.semanticHighlighting).toBe(true)
                    expect(diskNoItalic.semanticHighlighting).toBe(true)
                    expect(diskItalic.semanticTokenColors?.keyword).toEqual(
                        SEMANTIC_RULES_ITALIC.keyword,
                    )
                    expect(diskNoItalic.semanticTokenColors?.keyword).toEqual(
                        SEMANTIC_RULES_NO_ITALIC.keyword,
                    )
                })

                it("contains zero italic fontStyle entries anywhere in the (No Italic) variant", () => {
                    for (const rule of diskNoItalic.tokenColors) {
                        if (rule.settings?.fontStyle) {
                            expect(rule.settings.fontStyle).not.toContain("italic")
                        }
                    }
                    for (const val of Object.values(
                        diskNoItalic.semanticTokenColors || {},
                    )) {
                        if (typeof val === "object" && val.fontStyle) {
                            expect(val.fontStyle).not.toContain("italic")
                        }
                    }
                })
            })
        }

        it("preserves Catppuccin Mocha workbench and Neovim rainbow bracket colors in R3BL 2027 Theme", () => {
            const theme2027: VSCodeTheme = JSON.parse(
                fs.readFileSync(path.join(THEMES_DIR, "r3bl-2027-theme.json"), "utf8"),
            )
            expect(theme2027.colors["editor.background"]).toBe("#1e1e2e")
            expect(theme2027.colors["editorBracketHighlight.foreground1"]).toBe("#f38ba8")
            expect(theme2027.colors["editorBracketHighlight.foreground2"]).toBe("#94e2d5")
            expect(theme2027.colors["editorBracketHighlight.foreground3"]).toBe("#f9e2af")
            expect(theme2027.colors["editorBracketHighlight.foreground4"]).toBe("#89b4fa")
            expect(theme2027.colors["editorBracketHighlight.foreground5"]).toBe("#f5c2e7")
            expect(theme2027.colors["editorBracketHighlight.foreground6"]).toBe("#f2cdcd")
        })
    })

    describe("bundled R3BL 2027 Icons", () => {
        it("contributes r3bl-2027-icons and resolves all referenced SVG icon files", () => {
            const pkg = JSON.parse(
                fs.readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8"),
            )
            expect(pkg.contributes.iconThemes).toEqual([
                {
                    id: R3BL_2027_ICON_THEME_ID,
                    label: "R3BL 2027 Icons",
                    path: "./icons/r3bl-2027-icons/theme.json",
                },
            ])

            expect(fs.existsSync(ICON_THEME_PATH)).toBe(true)
            const iconTheme = JSON.parse(fs.readFileSync(ICON_THEME_PATH, "utf8"))
            const iconThemeDir = path.dirname(ICON_THEME_PATH)
            const defs = iconTheme.iconDefinitions as Record<string, { iconPath: string }>
            const entries = Object.entries(defs)
            expect(entries.length).toBeGreaterThan(100)

            for (const [, def] of entries) {
                const resolvedSvg = path.resolve(iconThemeDir, def.iconPath)
                expect(fs.existsSync(resolvedSvg)).toBe(true)
            }
        })
    })
})
