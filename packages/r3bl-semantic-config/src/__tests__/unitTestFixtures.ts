// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.
// Shared test utilities for unit testing pure functions.

/**
 * Creates a minimal mock TextDocument from an array of lines.
 * Only implements the subset of vscode.TextDocument used by our pure functions:
 * - lineCount
 * - lineAt(n).text
 */
export function mockDocument(lines: string[]) {
    return {
        lineCount: lines.length,
        lineAt: (i: number) => ({ text: lines[i] }),
    } as any
}
