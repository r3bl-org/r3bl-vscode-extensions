// Copyright (c) 2026 R3BL LLC. Licensed under MIT License.
// Minimal vscode mock for unit testing.

export const Uri = {
    file: (fsPath: string) => ({ fsPath, scheme: "file" }),
}

export const env = {
    clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
    },
}

export const window = {
    showErrorMessage: jest.fn().mockResolvedValue(undefined),
}

export const workspace = {
    getConfiguration: () => ({
        get: <T>(_key: string, defaultValue?: T): T => defaultValue as T,
    }),
}

export const registeredCommands = new Map<string, (...args: any[]) => any>()

export const commands = {
    executeCommand: jest
        .fn()
        .mockImplementation((command: string, ...args: unknown[]) => {
            const handler = registeredCommands.get(command)
            if (handler) {
                return handler(...args)
            }
            return Promise.resolve()
        }),
    registerCommand: jest
        .fn()
        .mockImplementation((id: string, handler: (...args: unknown[]) => unknown) => {
            registeredCommands.set(id, handler)
            return {
                dispose: () => {
                    registeredCommands.delete(id)
                },
            }
        }),
}
