// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.
// Minimal vscode module mock for unit testing pure functions.

export enum FoldingRangeKind {
    Comment = 1,
    Imports = 2,
    Region = 3,
}

export class FoldingRange {
    start: number
    end: number
    kind?: FoldingRangeKind

    constructor(start: number, end: number, kind?: FoldingRangeKind) {
        this.start = start
        this.end = end
        this.kind = kind
    }
}

export enum ConfigurationTarget {
    Global = 1,
    Workspace = 2,
    WorkspaceFolder = 3,
}

export enum StatusBarAlignment {
    Left = 1,
    Right = 2,
}

export const window = {
    createStatusBarItem: () => ({
        text: "",
        tooltip: "",
        command: "",
        show: () => {},
        hide: () => {},
        dispose: () => {},
    }),
    showQuickPick: async () => undefined,
    showInputBox: async () => undefined,
    onDidChangeActiveTextEditor: () => ({ dispose: () => {} }),
    activeTextEditor: undefined,
}

export const workspace = {
    getConfiguration: () => ({
        get: () => undefined,
        update: async () => {},
    }),
    workspaceFolders: undefined,
    onDidChangeConfiguration: () => ({ dispose: () => {} }),
}

export const commands = {
    executeCommand: async () => undefined,
}
