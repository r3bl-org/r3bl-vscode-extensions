import * as vscode from 'vscode';
import { showStatusBarMessage } from 'r3bl-common-code';

/**
 * Represents a block of rustdoc comments.
 */
export interface RustdocBlock {
    startLine: number;
    endLine: number;
    type: 'module' | 'item'; // //! vs ///
}

/**
 * Detects rustdoc comment blocks in a document.
 * - `///` = item-level rustdoc
 * - `//!` = module-level rustdoc
 * - `//` (not followed by / or !) = regular comment, skipped
 */
export function findRustdocBlocks(document: vscode.TextDocument): RustdocBlock[] {
    const blocks: RustdocBlock[] = [];
    let currentBlock: RustdocBlock | null = null;

    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i).text;
        const trimmed = line.trimStart();

        // Check for module-level rustdoc: //!
        if (trimmed.startsWith('//!')) {
            if (currentBlock && currentBlock.type === 'module') {
                // Continue the current module block
                currentBlock.endLine = i;
            } else {
                // Start a new module block (end any previous block first)
                if (currentBlock) {
                    blocks.push(currentBlock);
                }
                currentBlock = { startLine: i, endLine: i, type: 'module' };
            }
        }
        // Check for item-level rustdoc: ///
        else if (trimmed.startsWith('///')) {
            if (currentBlock && currentBlock.type === 'item') {
                // Continue the current item block
                currentBlock.endLine = i;
            } else {
                // Start a new item block (end any previous block first)
                if (currentBlock) {
                    blocks.push(currentBlock);
                }
                currentBlock = { startLine: i, endLine: i, type: 'item' };
            }
        }
        // Any other line breaks the current block
        else {
            if (currentBlock) {
                blocks.push(currentBlock);
                currentBlock = null;
            }
        }
    }

    // Don't forget the last block
    if (currentBlock) {
        blocks.push(currentBlock);
    }

    return blocks;
}

/**
 * FoldingRangeProvider for rustdoc comments.
 * This registers folding regions for /// and //! comment blocks.
 */
export class RustdocFoldingProvider implements vscode.FoldingRangeProvider {
    provideFoldingRanges(
        document: vscode.TextDocument,
        _context: vscode.FoldingContext,
        _token: vscode.CancellationToken,
    ): vscode.FoldingRange[] {
        const blocks = findRustdocBlocks(document);
        return blocks.map(
            (block) =>
                new vscode.FoldingRange(
                    block.startLine,
                    block.endLine,
                    vscode.FoldingRangeKind.Comment,
                ),
        );
    }
}

/**
 * Folds all rustdoc blocks in the active editor.
 *
 * Uses `editor.createFoldingRangeFromSelection` for all blocks because:
 * - rust-analyzer doesn't register `//!` blocks as foldable
 * - `editor.fold` with `selectionLines` folds containing regions, not the comments themselves
 */
export async function foldAllRustdocs(silent: boolean = false): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        return;
    }

    if (editor.document.languageId !== 'rust') {
        return;
    }

    const blocks = findRustdocBlocks(editor.document);

    if (blocks.length === 0) {
        return;
    }

    // Save original selection only for manual invocation
    const originalSelection = silent ? null : editor.selection;

    // Create selections for all rustdoc blocks
    const selections = blocks.map((block) => {
        const startPos = new vscode.Position(block.startLine, 0);
        const endPos = new vscode.Position(
            block.endLine,
            editor.document.lineAt(block.endLine).text.length,
        );
        return new vscode.Selection(startPos, endPos);
    });

    // Set selections and create folding ranges
    editor.selections = selections;
    await vscode.commands.executeCommand('editor.createFoldingRangeFromSelection');

    // For manual invocation: restore original selection and reveal
    // For auto-fold: let VSCode handle cursor naturally (less jumpiness)
    if (originalSelection) {
        editor.selection = originalSelection;
        // Use Default reveal type - more reliable after fold operations
        // InCenterIfOutsideViewport doesn't always recalculate viewport correctly
        editor.revealRange(originalSelection, vscode.TextEditorRevealType.Default);
    }

    // Only show status message for manual invocation
    if (!silent) {
        const fileName = editor.document.uri.path.split('/').pop() ?? 'file';
        showStatusBarMessage(
            `Folded ${blocks.length} rustdoc blocks in ${fileName}`,
            'success',
        );
    }
}

/**
 * Unfolds all rustdoc blocks in the active editor.
 * Uses cursor positioning to unfold at each block's start line.
 */
export async function unfoldAllRustdocs(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        showStatusBarMessage('No active editor', 'warning');
        return;
    }

    if (editor.document.languageId !== 'rust') {
        showStatusBarMessage('Not a Rust file', 'warning');
        return;
    }

    const blocks = findRustdocBlocks(editor.document);

    if (blocks.length === 0) {
        showStatusBarMessage('No rustdocs found', 'info');
        return;
    }

    const originalSelection = editor.selection;

    // Unfold each block by positioning cursor and unfolding
    for (const block of blocks) {
        const pos = new vscode.Position(block.startLine, 0);
        editor.selection = new vscode.Selection(pos, pos);
        await vscode.commands.executeCommand('editor.unfold');
    }

    // Restore original selection and reveal
    editor.selection = originalSelection;
    editor.revealRange(originalSelection, vscode.TextEditorRevealType.Default);

    showStatusBarMessage(`Unfolded ${blocks.length} rustdoc blocks`, 'success');
}
