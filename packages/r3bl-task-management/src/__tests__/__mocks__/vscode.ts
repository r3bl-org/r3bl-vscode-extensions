// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.
// Minimal vscode module mock for unit testing pure functions.

import * as path from "path"

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

export enum QuickPickItemKind {
    Separator = -1,
    Default = 0,
}

export class ThemeIcon {
    id: string
    constructor(id: string) {
        this.id = id
    }
}

export class TabInputText {
    constructor(public readonly uri: Uri) {}
}

export class RelativePattern {
    constructor(
        public readonly base: unknown,
        public readonly pattern: string,
    ) {}
}

export const ViewColumn = {
    One: 1,
    Two: 2,
    Three: 3,
    Active: -1,
    Beside: -2,
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
    showWarningMessage: async () => undefined,
    showInformationMessage: async () => undefined,
    showErrorMessage: async () => undefined,
    showTextDocument: async () => ({}),
    onDidChangeActiveTextEditor: () => ({ dispose: () => {} }),
    activeTextEditor: undefined,
    tabGroups: {
        all: [] as Array<{
            viewColumn: number
            tabs: Array<{ input: unknown; isPinned: boolean; isActive: boolean }>
        }>,
        activeTabGroup: { viewColumn: 1 },
        close: async (
            tabsOrGroup:
                | { input: unknown; isPinned: boolean; isActive: boolean }
                | Array<{ input: unknown; isPinned: boolean; isActive: boolean }>,
        ): Promise<boolean> => {
            const toRemove = new Set(
                Array.isArray(tabsOrGroup) ? tabsOrGroup : [tabsOrGroup],
            )
            for (const group of window.tabGroups.all) {
                group.tabs = group.tabs.filter((t) => !toRemove.has(t))
            }
            return true
        },
    },
}

export class Uri {
    public readonly scheme: string
    public readonly fsPath: string
    private readonly raw: string

    private constructor(scheme: string, fsPath: string, raw?: string) {
        this.scheme = scheme
        this.fsPath = fsPath
        this.raw = raw ?? `${scheme}://${fsPath}`
    }

    public static file(fsPath: string): Uri {
        return new Uri("file", fsPath)
    }

    public static parse(value: string): Uri {
        const fsPath = value.startsWith("file://") ? value.slice("file://".length) : value
        const scheme = value.includes("://") ? value.split("://")[0] : "file"
        return new Uri(scheme, fsPath, value)
    }

    public static joinPath(base: Uri, ...pathSegments: string[]): Uri {
        const joined = path.posix.join(base.fsPath, ...pathSegments)
        return new Uri(base.scheme, joined)
    }

    public toString(): string {
        return this.raw
    }
}

export const __mockFiles = new Map<string, Uint8Array>()

export const workspace = {
    getConfiguration: () => ({
        get: <T>(_key: string, defaultValue?: T): T | undefined => defaultValue,
        update: async () => {},
        inspect: () => undefined,
    }),
    workspaceFolders: undefined as
        | Array<{ uri: Uri; name: string; index: number }>
        | undefined,
    onDidChangeConfiguration: () => ({ dispose: () => {} }),
    findFiles: async (): Promise<Uri[]> => [],
    fs: {
        readFile: async (uri: Uri): Promise<Uint8Array> => {
            const data = __mockFiles.get(uri.fsPath)
            if (!data) {
                throw new Error(`FileNotFound: ${uri.fsPath}`)
            }
            return data
        },
        writeFile: async (uri: Uri, content: Uint8Array): Promise<void> => {
            __mockFiles.set(uri.fsPath, new Uint8Array(content))
        },
        stat: async (uri: Uri) => {
            const data = __mockFiles.get(uri.fsPath)
            if (!data) {
                throw new Error(`FileNotFound: ${uri.fsPath}`)
            }
            return { type: 1, ctime: 0, mtime: 0, size: data.byteLength }
        },
        rename: async (src: Uri, dest: Uri): Promise<void> => {
            const data = __mockFiles.get(src.fsPath)
            if (data) {
                __mockFiles.set(dest.fsPath, data)
                __mockFiles.delete(src.fsPath)
            }
        },
        delete: async (uri: Uri): Promise<void> => {
            __mockFiles.delete(uri.fsPath)
        },
        createDirectory: async (_uri: Uri): Promise<void> => {},
    },
}

export const commands = {
    executeCommand: async () => undefined,
}
