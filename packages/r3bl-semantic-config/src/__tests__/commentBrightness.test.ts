// Copyright (c) 2024-2026 R3BL LLC. Licensed under MIT License.

import {
    COMMENT_COLORS,
    COMMENT_DESCRIPTIONS,
    ALL_R3BL_THEMES,
    COMMENT_SCOPES,
    buildTokenColorCustomizations,
    removeR3BLTokenCustomizations,
    CommentBrightnessLevel,
} from "../commentBrightness"

describe("commentBrightness", () => {
    describe("constants and color mappings", () => {
        it("maps dim to #8B949E (cool slate gray)", () => {
            expect(COMMENT_COLORS.dim).toBe("#8B949E")
        })

        it("maps medium to #ABACAC (neutral silver gray)", () => {
            expect(COMMENT_COLORS.medium).toBe("#ABACAC")
        })

        it("maps bright to #E8DCF4 (vibrant lavender)", () => {
            expect(COMMENT_COLORS.bright).toBe("#E8DCF4")
        })

        it("covers all 4 R3BL themes", () => {
            expect(ALL_R3BL_THEMES).toHaveLength(4)
            expect(ALL_R3BL_THEMES).toContain("R3BL Theme")
            expect(ALL_R3BL_THEMES).toContain("R3BL 2026 Theme")
            expect(ALL_R3BL_THEMES).toContain("R3BL Theme (No Italic)")
            expect(ALL_R3BL_THEMES).toContain("R3BL 2026 Theme (No Italic)")
        })

        it("defines helpful descriptions for each level", () => {
            const levels: CommentBrightnessLevel[] = ["dim", "medium", "bright"]
            for (const level of levels) {
                expect(COMMENT_DESCRIPTIONS[level]).toBeDefined()
                expect(COMMENT_DESCRIPTIONS[level].length).toBeGreaterThan(0)
            }
        })
    })

    describe("buildTokenColorCustomizations", () => {
        it("creates customizations for all 4 R3BL themes from empty object", () => {
            const result = buildTokenColorCustomizations("dim")

            for (const theme of ALL_R3BL_THEMES) {
                const themeKey = `[${theme}]`
                expect(result[themeKey]).toBeDefined()
                expect(result[themeKey].comments).toBe("#8B949E")
                expect(result[themeKey].textMateRules).toEqual([
                    {
                        scope: COMMENT_SCOPES,
                        settings: {
                            foreground: "#8B949E",
                        },
                    },
                ])
            }
        })

        it("applies medium and bright colors correctly", () => {
            const mediumResult = buildTokenColorCustomizations("medium")
            expect(mediumResult["[R3BL 2026 Theme]"].comments).toBe("#ABACAC")
            expect(
                mediumResult["[R3BL 2026 Theme]"].textMateRules[0].settings.foreground,
            ).toBe("#ABACAC")

            const brightResult = buildTokenColorCustomizations("bright")
            expect(brightResult["[R3BL Theme]"].comments).toBe("#E8DCF4")
            expect(
                brightResult["[R3BL Theme]"].textMateRules[0].settings.foreground,
            ).toBe("#E8DCF4")
        })

        it("preserves non-R3BL theme blocks", () => {
            const existing = {
                "[Default Dark Modern]": {
                    comments: "#6A9955",
                },
                "[Monokai]": {
                    comments: "#75715E",
                },
            }

            const result = buildTokenColorCustomizations("dim", existing)

            expect(result["[Default Dark Modern]"]).toEqual({ comments: "#6A9955" })
            expect(result["[Monokai]"]).toEqual({ comments: "#75715E" })
            expect(result["[R3BL 2026 Theme]"].comments).toBe("#8B949E")
        })

        it("preserves unrelated textMateRules in existing R3BL blocks while replacing comment rule", () => {
            const existing = {
                "[R3BL Theme]": {
                    comments: "#000000",
                    textMateRules: [
                        {
                            scope: ["markup.heading"],
                            settings: { foreground: "#FF0000" },
                        },
                        {
                            scope: COMMENT_SCOPES,
                            settings: { foreground: "#000000" },
                        },
                    ],
                },
            }

            const result = buildTokenColorCustomizations("medium", existing)
            const r3blRules = result["[R3BL Theme]"].textMateRules

            expect(r3blRules).toHaveLength(2)
            expect(r3blRules[0]).toEqual({
                scope: ["markup.heading"],
                settings: { foreground: "#FF0000" },
            })
            expect(r3blRules[1]).toEqual({
                scope: COMMENT_SCOPES,
                settings: { foreground: "#ABACAC" },
            })
        })
    })

    describe("removeR3BLTokenCustomizations", () => {
        it("removes all R3BL blocks and returns undefined if empty", () => {
            const existing = buildTokenColorCustomizations("dim")
            const result = removeR3BLTokenCustomizations(existing)
            expect(result).toBeUndefined()
        })

        it("removes all R3BL blocks and keeps non-R3BL blocks", () => {
            const existing = {
                "[Monokai]": { comments: "#75715E" },
                ...buildTokenColorCustomizations("bright"),
            }

            const result = removeR3BLTokenCustomizations(existing)
            expect(result).toEqual({
                "[Monokai]": { comments: "#75715E" },
            })
        })
    })
})
