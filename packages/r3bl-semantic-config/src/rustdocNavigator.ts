import * as vscode from 'vscode';
import { showStatusBarMessage } from 'r3bl-common-code';
import { findRustdocBlocks, RustdocBlock } from './rustdocFolding';

interface RustdocHeading {
    line: number;
    level: number;
    text: string;
}

interface RustdocQuickPickItem extends vscode.QuickPickItem {
    targetLine: number;
}

/**
 * Extracts markdown headings from within a rustdoc block.
 * Parses lines like `/// # Heading` or `//! ## Sub-heading`.
 */
function findHeadingsInBlock(
    document: vscode.TextDocument,
    block: RustdocBlock,
): RustdocHeading[] {
    const headings: RustdocHeading[] = [];
    const prefix = block.type === 'module' ? '//!' : '///';

    for (let i = block.startLine; i <= block.endLine; i++) {
        const line = document.lineAt(i).text;
        const trimmed = line.trimStart();

        // Strip the rustdoc prefix
        if (!trimmed.startsWith(prefix)) continue;
        const afterPrefix = trimmed.slice(prefix.length);

        // Strip leading whitespace after prefix
        const content = afterPrefix.replace(/^\s+/, '');

        // Match heading: one or more # followed by a space and text
        const match = content.match(/^(#{1,6})\s+(.+)/);
        if (match) {
            headings.push({
                line: i,
                level: match[1].length,
                text: match[2].trim(),
            });
        }
    }

    return headings;
}

/**
 * Generates a display label for a rustdoc block.
 * Uses the first heading if available, otherwise the first non-empty content line.
 */
function getBlockLabel(document: vscode.TextDocument, block: RustdocBlock): string {
    const prefix = block.type === 'module' ? '//!' : '///';
    const headings = findHeadingsInBlock(document, block);

    if (headings.length > 0) {
        return `${prefix} ${'#'.repeat(headings[0].level)} ${headings[0].text}`;
    }

    // Fall back to first non-empty content line
    for (let i = block.startLine; i <= block.endLine; i++) {
        const line = document.lineAt(i).text.trimStart();
        if (!line.startsWith(prefix)) continue;
        const content = line.slice(prefix.length).trim();
        if (content.length > 0) {
            const truncated =
                content.length > 60 ? content.slice(0, 57) + '...' : content;
            return `${prefix} ${truncated}`;
        }
    }

    return `${prefix} (empty block)`;
}

/**
 * Finds the start line of the link reference definitions section at the bottom
 * of a rustdoc block. Link ref defs look like `/// [label]: URL`.
 * Returns the line number of the first (topmost) link ref def, or undefined.
 */
function findLinkRefDefsStart(
    document: vscode.TextDocument,
    block: RustdocBlock,
): number | undefined {
    const prefix = block.type === 'module' ? '//!' : '///';
    let firstLinkRefDefLine: number | undefined = undefined;

    // Scan from bottom up to find the contiguous link ref def section
    for (let i = block.endLine; i >= block.startLine; i--) {
        const line = document.lineAt(i).text.trimStart();
        if (!line.startsWith(prefix)) break;

        const afterPrefix = line.slice(prefix.length);
        const content = afterPrefix.trim();

        if (/^\[.*\]:/.test(content)) {
            // Link ref def line: [label]: ...
            firstLinkRefDefLine = i;
        } else if (firstLinkRefDefLine !== undefined) {
            // We've already found link ref defs below; check if this is a
            // continuation (indented) or empty line within the section
            if (content === '' || /^\s{4}/.test(afterPrefix)) {
                continue;
            } else {
                break;
            }
        } else {
            // Haven't found any link ref defs yet, stop
            break;
        }
    }

    return firstLinkRefDefLine;
}

/**
 * Returns the rustdoc block containing the given cursor line, or undefined.
 */
function findContainingBlock(
    blocks: RustdocBlock[],
    cursorLine: number,
): RustdocBlock | undefined {
    return blocks.find(
        (block) => cursorLine >= block.startLine && cursorLine <= block.endLine,
    );
}

/**
 * Moves the cursor to the given line and centers it in the viewport.
 */
function navigateToLine(editor: vscode.TextEditor, line: number): void {
    const pos = new vscode.Position(line, 0);
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
}

/**
 * Main entry point for the rustdoc structure navigator command.
 *
 * - Cursor inside a rustdoc block: shows headings within that block.
 * - Cursor outside any rustdoc block: shows all rustdoc blocks in the file.
 */
export async function navigateRustdocs(): Promise<void> {
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
        showStatusBarMessage('No rustdoc blocks found', 'info');
        return;
    }

    const cursorLine = editor.selection.active.line;
    const containingBlock = findContainingBlock(blocks, cursorLine);

    if (containingBlock) {
        // Mode A: cursor inside a rustdoc block — show TOC with TOP/BOTTOM/LINK REFS
        const headings = findHeadingsInBlock(editor.document, containingBlock);
        const linkRefDefsStart = findLinkRefDefsStart(editor.document, containingBlock);

        const items: RustdocQuickPickItem[] = [];

        // <TOP>
        items.push({
            label: '<TOP>',
            description: `line ${containingBlock.startLine + 1}`,
            targetLine: containingBlock.startLine,
        });

        // Separator before headings
        if (headings.length > 0) {
            items.push({
                label: 'Headings',
                kind: vscode.QuickPickItemKind.Separator,
                targetLine: -1,
            });
        }

        // Headings
        for (const h of headings) {
            items.push({
                label: `${'  '.repeat(h.level - 1)}${'#'.repeat(h.level)} ${h.text}`,
                description: `line ${h.line + 1}`,
                targetLine: h.line,
            });
        }

        // Separator before navigation targets
        items.push({
            label: '',
            kind: vscode.QuickPickItemKind.Separator,
            targetLine: -1,
        });

        // <LINK REF DEFS> (only if they exist)
        if (linkRefDefsStart !== undefined) {
            items.push({
                label: '<LINK REF DEFS>',
                description: `line ${linkRefDefsStart + 1}`,
                targetLine: linkRefDefsStart,
            });
        }

        // <BOTTOM>
        items.push({
            label: '<BOTTOM>',
            description: `line ${containingBlock.endLine + 1}`,
            targetLine: containingBlock.endLine,
        });

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Navigate to heading in this rustdoc block',
            matchOnDescription: true,
        });

        if (selected) {
            navigateToLine(editor, selected.targetLine);
        }
    } else {
        // Mode B: cursor outside any rustdoc block — show all blocks
        const items: RustdocQuickPickItem[] = blocks.map((block) => {
            const lineCount = block.endLine - block.startLine + 1;
            return {
                label: getBlockLabel(editor.document, block),
                description: `line ${block.startLine + 1}`,
                detail: `${block.type === 'module' ? '//!' : '///'} block, ${lineCount} lines`,
                targetLine: block.startLine,
            };
        });

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Navigate to rustdoc block',
            matchOnDescription: true,
        });

        if (selected) {
            navigateToLine(editor, selected.targetLine);
        }
    }
}
