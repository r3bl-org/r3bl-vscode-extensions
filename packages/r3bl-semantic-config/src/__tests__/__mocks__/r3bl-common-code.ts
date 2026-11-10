// Copyright (c) 2024-2026 R3BL LLC. Licensed under MIT License.
// Mock for r3bl-common-code (showStatusBarMessage depends on vscode at runtime,
// while pure theme constants are re-exported directly).

export function showStatusBarMessage(_message: string, _type: string): void {
    // no-op in tests
}

export * from "r3bl-common-code/dist/themeConstants"
