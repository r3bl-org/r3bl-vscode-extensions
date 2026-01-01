import * as vscode from 'vscode';
import { showStatusBarMessage } from 'r3bl-common-code';

/**
 * Represents a block of rustdoc comments.
 */
interface RustdocBlock {
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
function findRustdocBlocks(document: vscode.TextDocument): RustdocBlock[] {
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

    // Save current selection
    const originalSelection = editor.selection;

    // Create all selections at once (multi-cursor)
    const selections = blocks.map((block) => {
        const startPos = new vscode.Position(block.startLine, 0);
        const endPos = new vscode.Position(
            block.endLine,
            editor.document.lineAt(block.endLine).text.length,
        );
        return new vscode.Selection(startPos, endPos);
    });

    // Set all selections at once
    editor.selections = selections;

    // Single fold command for all selections
    await vscode.commands.executeCommand('editor.createFoldingRangeFromSelection');

    // Restore selection and ensure cursor is visible
    editor.selection = originalSelection;
    editor.revealRange(
        originalSelection,
        vscode.TextEditorRevealType.InCenterIfOutsideViewport,
    );

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

    // Save current selection to restore later
    const originalSelection = editor.selection;

    // Unfold each block
    for (const block of blocks) {
        // Position cursor at start of block
        const pos = new vscode.Position(block.startLine, 0);
        editor.selection = new vscode.Selection(pos, pos);

        // Unfold at cursor
        await vscode.commands.executeCommand('editor.unfold');
    }

    // Restore original selection
    editor.selection = originalSelection;

    showStatusBarMessage(`Unfolded ${blocks.length} rustdoc blocks`, 'success');
}
