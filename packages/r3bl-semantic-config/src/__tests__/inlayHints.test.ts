// Copyright (c) 2024-2026 R3BL LLC. Licensed under MIT License.

import * as vscode from "vscode"
import { getNextInlayHintsState, toggleInlayHints } from "../inlayHints"
import * as commonCode from "r3bl-common-code"

jest.mock("r3bl-common-code", () => ({
    showStatusBarMessage: jest.fn(),
}))

describe("inlayHints", () => {
    describe("getNextInlayHintsState", () => {
        it('returns "off" when current value is "on"', () => {
            expect(getNextInlayHintsState("on")).toBe("off")
        })

        it('returns "off" when current value is boolean true', () => {
            expect(getNextInlayHintsState(true)).toBe("off")
        })

        it('returns "on" when current value is "off"', () => {
            expect(getNextInlayHintsState("off")).toBe("on")
        })

        it('returns "on" when current value is boolean false', () => {
            expect(getNextInlayHintsState(false)).toBe("on")
        })

        it('returns "on" when current value is "offUnlessPressed"', () => {
            expect(getNextInlayHintsState("offUnlessPressed")).toBe("on")
        })

        it('returns "on" when current value is "onUnlessPressed"', () => {
            expect(getNextInlayHintsState("onUnlessPressed")).toBe("on")
        })

        it('returns "on" when current value is undefined', () => {
            expect(getNextInlayHintsState(undefined)).toBe("on")
        })

        it('returns "on" when current value is null', () => {
            expect(getNextInlayHintsState(null)).toBe("on")
        })

        it('returns "on" for unexpected or empty values', () => {
            expect(getNextInlayHintsState("")).toBe("on")
            expect(getNextInlayHintsState("random")).toBe("on")
        })
    })

    describe("toggleInlayHints", () => {
        let mockGet: jest.Mock
        let mockUpdate: jest.Mock

        beforeEach(() => {
            jest.clearAllMocks()
            mockGet = jest.fn()
            mockUpdate = jest.fn().mockResolvedValue(undefined)

            jest.spyOn(vscode.workspace, "getConfiguration").mockReturnValue({
                get: mockGet,
                update: mockUpdate,
                inspect: jest.fn(),
            } as unknown as vscode.WorkspaceConfiguration)
        })

        afterEach(() => {
            jest.restoreAllMocks()
        })

        it('toggles from "on" to "off" and updates global configuration', async () => {
            mockGet.mockReturnValue("on")

            const result = await toggleInlayHints()

            expect(result).toBe("off")
            expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith("editor")
            expect(mockGet).toHaveBeenCalledWith("inlayHints.enabled")
            expect(mockUpdate).toHaveBeenCalledWith(
                "inlayHints.enabled",
                "off",
                vscode.ConfigurationTarget.Global,
            )
            expect(commonCode.showStatusBarMessage).toHaveBeenCalledWith(
                "Inlay hints: off",
                "info",
            )
        })

        it('toggles from "off" to "on" and updates global configuration', async () => {
            mockGet.mockReturnValue("off")

            const result = await toggleInlayHints()

            expect(result).toBe("on")
            expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith("editor")
            expect(mockGet).toHaveBeenCalledWith("inlayHints.enabled")
            expect(mockUpdate).toHaveBeenCalledWith(
                "inlayHints.enabled",
                "on",
                vscode.ConfigurationTarget.Global,
            )
            expect(commonCode.showStatusBarMessage).toHaveBeenCalledWith(
                "Inlay hints: on",
                "info",
            )
        })

        it('toggles from "offUnlessPressed" to "on"', async () => {
            mockGet.mockReturnValue("offUnlessPressed")

            const result = await toggleInlayHints()

            expect(result).toBe("on")
            expect(mockUpdate).toHaveBeenCalledWith(
                "inlayHints.enabled",
                "on",
                vscode.ConfigurationTarget.Global,
            )
            expect(commonCode.showStatusBarMessage).toHaveBeenCalledWith(
                "Inlay hints: on",
                "info",
            )
        })
    })
})
