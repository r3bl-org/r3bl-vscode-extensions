// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from 'vscode';
import * as path from 'path';
import { showStatusBarMessage } from 'r3bl-common-code';

// In-memory history of copied items (session only)
interface CopyHistoryItem {
    output: string;
    uri: vscode.Uri;
    selection: vscode.Selection;
    timestamp: Date;
}

const copyHistory: CopyHistoryItem[] = [];
const MAX_HISTORY_SIZE = 20;

export function activate(context: vscode.ExtensionContext) {
    const copyCommand = vscode.commands.registerCommand(
        'r3bl-copy-selection-path-and-range.copyPathAndRange',
        handleCopyPathAndRange,
    );

    const historyCommand = vscode.commands.registerCommand(
        'r3bl-copy-selection-path-and-range.showCopyHistory',
        showCopyHistory,
    );

    context.subscriptions.push(copyCommand, historyCommand);
}

export function deactivate() {}

async function handleCopyPathAndRange() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        showStatusBarMessage('No active editor', 'error');
        return;
    }

    const document = editor.document;
    const selection = editor.selection;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

    if (!workspaceFolder) {
        showStatusBarMessage('No workspace folder found', 'error');
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
    const output = isMultiLine
        ? `@${normalizedPath}${lineRange}`
        : `${normalizedPath}${lineRange}`;

    // Copy to clipboard
    await vscode.env.clipboard.writeText(output);

    // Add to history
    copyHistory.unshift({
        output,
        uri: document.uri,
        selection,
        timestamp: new Date(),
    });

    // Keep history size limited
    if (copyHistory.length > MAX_HISTORY_SIZE) {
        copyHistory.pop();
    }

    // Show success message in status bar
    showStatusBarMessage(`Copied: ${output}`, 'success');
}

async function showCopyHistory() {
    if (copyHistory.length === 0) {
        showStatusBarMessage('No copy history available', 'info');
        return;
    }

    // Create quick pick items with timestamps
    const items = copyHistory.map((item, index) => ({
        label: item.output,
        description: item.timestamp.toLocaleTimeString(),
        detail: `Copied ${getRelativeTime(item.timestamp)}`,
        item,
    }));

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a copied path to open',
        matchOnDescription: true,
        matchOnDetail: true,
    });

    if (selected) {
        // Open the file and navigate to the selection
        await vscode.window.showTextDocument(selected.item.uri, {
            selection: selected.item.selection,
            viewColumn: vscode.ViewColumn.Active,
            preserveFocus: false,
        });
    }
}

function getRelativeTime(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) {
        return 'just now';
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    }

    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
}

function calculateLineRange(selection: vscode.Selection): {
    lineRange: string;
    isMultiLine: boolean;
} {
    const startLine = selection.start.line + 1; // Convert to 1-based line numbers
    const endLine = selection.end.line + 1;

    // If selection spans multiple lines - use Claude Code format
    if (startLine !== endLine) {
        return { lineRange: `#L${startLine}-${endLine}`, isMultiLine: true };
    }

    // Single-line selection or no selection - use IDE-compatible format with line number
    return { lineRange: `:${startLine}`, isMultiLine: false };
}
