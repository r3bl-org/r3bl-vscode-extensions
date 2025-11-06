// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    const copyCommand = vscode.commands.registerCommand(
        'r3bl-copy-selection-path-and-range.copyPathAndRange',
        handleCopyPathAndRange
    );

    context.subscriptions.push(copyCommand);
}

export function deactivate() {}

async function handleCopyPathAndRange() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    const document = editor.document;
    const selection = editor.selection;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
    }

    // Calculate relative path from workspace root
    const absolutePath = document.uri.fsPath;
    const relativePath = path.relative(workspaceFolder.uri.fsPath, absolutePath);

    // Normalize path separators to forward slashes for consistency
    const normalizedPath = relativePath.replace(/\\/g, '/');

    // Calculate line range and determine if it's multi-line
    const { lineRange, isMultiLine } = calculateLineRange(selection);

    // Format the output (add @ prefix for multi-line selections)
    const output = isMultiLine ? `@${normalizedPath}${lineRange}` : `${normalizedPath}${lineRange}`;

    // Copy to clipboard
    await vscode.env.clipboard.writeText(output);

    // Show confirmation message
    vscode.window.showInformationMessage(`Copied: ${output}`);
}

function calculateLineRange(selection: vscode.Selection): { lineRange: string; isMultiLine: boolean } {
    const startLine = selection.start.line + 1; // Convert to 1-based line numbers
    const endLine = selection.end.line + 1;

    // If selection spans multiple lines - use Claude Code format
    if (startLine !== endLine) {
        return { lineRange: `#L${startLine}-${endLine}`, isMultiLine: true };
    }

    // Single-line selection or no selection - use IDE-compatible format with line number
    return { lineRange: `:${startLine}`, isMultiLine: false };
}
