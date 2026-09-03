// Copyright (c) 2026 R3BL LLC. Licensed under MIT License.
// Mock for r3bl-common-code (depends on vscode at runtime).

export enum StatusBarMessageType {
    Info = "info",
    Success = "success",
    Warning = "warning",
    Error = "error",
}

export function showStatusBarMessage(
    _message: string,
    _type: StatusBarMessageType | string,
): void {
    // no-op in tests
}
