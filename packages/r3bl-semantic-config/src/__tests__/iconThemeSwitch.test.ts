// Copyright (c) 2024-2026 R3BL LLC. Licensed under MIT License.

import * as vscode from "vscode"
import { R3BL_2027_ICON_THEME_ID } from "r3bl-common-code"
import { applyIconThemeForColorTheme, isR3BL2027Theme } from "../iconThemeSwitch"

describe("iconThemeSwitch", () => {
    describe("isR3BL2027Theme", () => {
        it("returns true for both R3BL 2027 Theme variants", () => {
            expect(isR3BL2027Theme("R3BL 2027 Theme")).toBe(true)
            expect(isR3BL2027Theme("R3BL 2027 Theme (No Italic)")).toBe(true)
        })

        it("returns false for earlier R3BL themes, other themes, and undefined", () => {
            expect(isR3BL2027Theme("R3BL 2026 Theme")).toBe(false)
            expect(isR3BL2027Theme("R3BL 2026 Theme (No Italic)")).toBe(false)
            expect(isR3BL2027Theme("R3BL Theme")).toBe(false)
            expect(isR3BL2027Theme("R3BL Theme (No Italic)")).toBe(false)
            expect(isR3BL2027Theme("Catppuccin Mocha")).toBe(false)
            expect(isR3BL2027Theme(undefined)).toBe(false)
        })
    })

    describe("applyIconThemeForColorTheme", () => {
        let state: Record<string, string | undefined>
        let updateMock: jest.Mock

        beforeEach(() => {
            state = {
                colorTheme: "R3BL 2026 Theme",
                iconTheme: "vs-seti",
            }
            updateMock = jest.fn(async (key: string, val: string) => {
                state[key] = val
            })

            jest.spyOn(vscode.workspace, "getConfiguration").mockImplementation(
                () =>
                    ({
                        get: (key: string) => state[key],
                        update: updateMock,
                        inspect: () => undefined,
                    }) as any,
            )
        })

        afterEach(() => {
            jest.restoreAllMocks()
        })

        it("switches workbench.iconTheme to r3bl-2027-icons when R3BL 2027 Theme is selected", async () => {
            const changed = await applyIconThemeForColorTheme("R3BL 2027 Theme")
            expect(changed).toBe(true)
            expect(updateMock).toHaveBeenCalledWith(
                "iconTheme",
                R3BL_2027_ICON_THEME_ID,
                vscode.ConfigurationTarget.Global,
            )
            expect(state.iconTheme).toBe(R3BL_2027_ICON_THEME_ID)
        })

        it("switches workbench.iconTheme to r3bl-2027-icons when R3BL 2027 Theme (No Italic) is selected", async () => {
            const changed = await applyIconThemeForColorTheme(
                "R3BL 2027 Theme (No Italic)",
            )
            expect(changed).toBe(true)
            expect(state.iconTheme).toBe(R3BL_2027_ICON_THEME_ID)
        })

        it("does not perform a redundant update if r3bl-2027-icons is already active", async () => {
            state.iconTheme = R3BL_2027_ICON_THEME_ID
            const changed = await applyIconThemeForColorTheme("R3BL 2027 Theme")
            expect(changed).toBe(false)
            expect(updateMock).not.toHaveBeenCalled()
        })

        it("leaves workbench.iconTheme untouched when switching away to R3BL 2026 Theme or another theme", async () => {
            state.iconTheme = R3BL_2027_ICON_THEME_ID
            const changed2026 = await applyIconThemeForColorTheme("R3BL 2026 Theme")
            expect(changed2026).toBe(false)
            expect(updateMock).not.toHaveBeenCalled()
            expect(state.iconTheme).toBe(R3BL_2027_ICON_THEME_ID)

            const changedOther = await applyIconThemeForColorTheme("Default Dark Modern")
            expect(changedOther).toBe(false)
            expect(updateMock).not.toHaveBeenCalled()
            expect(state.iconTheme).toBe(R3BL_2027_ICON_THEME_ID)
        })
    })
})
