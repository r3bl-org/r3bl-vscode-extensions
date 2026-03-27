// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.
// Minimal vscode module mock for unit testing pure functions.

export interface QuickPickItem {
    label: string;
    description?: string;
    detail?: string;
    picked?: boolean;
    alwaysShow?: boolean;
}

export const Uri = {
    file: (path: string) => ({ fsPath: path, scheme: 'file' }),
};

export const workspace = {
    fs: {
        writeFile: async () => {},
    },
};
