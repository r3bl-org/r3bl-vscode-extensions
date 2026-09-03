// Copyright (c) 2026 R3BL LLC. Licensed under MIT License.

import * as vscode from "vscode"
import { activate, deactivate } from "../extension"
import { commands, registeredCommands } from "./__mocks__/vscode"

describe("r3bl-opened-editors extension", () => {
    let mockContext: vscode.ExtensionContext

    beforeEach(() => {
        registeredCommands.clear()
        jest.clearAllMocks()

        mockContext = {
            subscriptions: [],
        } as unknown as vscode.ExtensionContext
    })

    test("registers all commands on activation", () => {
        activate(mockContext)

        expect(registeredCommands.has("r3bl-opened-editors.openedEditors")).toBe(true)
        expect(registeredCommands.has("r3bl-opened-editors.focusOpenEditorsView")).toBe(
            true,
        )
        expect(registeredCommands.has("r3bl-opened-editors.focusSidebar")).toBe(true)
        expect(mockContext.subscriptions.length).toBe(3)
    })

    test("openedEditors command triggers workbench.action.showAllEditors", async () => {
        activate(mockContext)

        const handler = registeredCommands.get("r3bl-opened-editors.openedEditors")
        expect(handler).toBeDefined()
        await handler!()
        expect(commands.executeCommand).toHaveBeenCalledWith(
            "workbench.action.showAllEditors",
        )
    })

    test("focusOpenEditorsView command triggers workbench.files.action.focusOpenEditorsView", async () => {
        activate(mockContext)

        const focusHandler = registeredCommands.get(
            "r3bl-opened-editors.focusOpenEditorsView",
        )
        expect(focusHandler).toBeDefined()
        await focusHandler!()
        expect(commands.executeCommand).toHaveBeenCalledWith(
            "workbench.files.action.focusOpenEditorsView",
        )

        jest.clearAllMocks()
        const aliasHandler = registeredCommands.get("r3bl-opened-editors.focusSidebar")
        expect(aliasHandler).toBeDefined()
        await aliasHandler!()
        expect(commands.executeCommand).toHaveBeenCalledWith(
            "workbench.files.action.focusOpenEditorsView",
        )
    })

    test("deactivate does not throw", () => {
        expect(() => deactivate()).not.toThrow()
    })
})
