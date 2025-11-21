// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from 'vscode';

/**
 * Status bar message types supported by r3bl-shared extension.
 */
export type StatusBarMessageType = 'info' | 'success' | 'warning' | 'error';

/**
 * Call a method on the r3bl-shared extension API with automatic error handling.
 *
 * @param apiMethod - The name of the API method to call on r3bl-shared.exports
 * @param args - Arguments to pass to the API method
 * @returns true if the API call succeeded, false if r3bl-shared is not available
 *
 * @example
 * ```typescript
 * callSharedAPI('showStatusBarMessage', 'Hello', 'success');
 * ```
 */
export function callSharedAPI(apiMethod: string, ...args: any[]): boolean {
    const sharedExt = vscode.extensions.getExtension('R3BL.r3bl-shared');

    if (sharedExt?.isActive && sharedExt.exports?.[apiMethod]) {
        sharedExt.exports[apiMethod](...args);
        return true;
    } else {
        // Show error with option to install r3bl-shared
        vscode.window
            .showErrorMessage(
                'R3BL Shared extension is not active. Please ensure it is installed and enabled.',
                'Install Extension',
            )
            .then((choice) => {
                if (choice === 'Install Extension') {
                    vscode.env.openExternal(
                        vscode.Uri.parse('vscode:extension/R3BL.r3bl-shared'),
                    );
                }
            });
        return false;
    }
}

/**
 * Type-safe wrapper for r3bl-shared's showStatusBarMessage API.
 * Displays a transient status bar message with the centralized FIFO queue.
 *
 * @param message - The message to display in the status bar
 * @param type - The type of message (info, success, warning, error)
 *
 * @example
 * ```typescript
 * import { showStatusBarMessage } from 'r3bl-common-code';
 *
 * showStatusBarMessage('Task created!', 'success');
 * showStatusBarMessage('Please check your settings', 'warning');
 * ```
 */
export function showStatusBarMessage(
    message: string,
    type: StatusBarMessageType = 'info',
): void {
    callSharedAPI('showStatusBarMessage', message, type);
}
