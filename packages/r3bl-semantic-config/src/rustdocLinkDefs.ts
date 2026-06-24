import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { showStatusBarMessage } from 'r3bl-common-code';
import { findRustdocBlocks, RustdocBlock } from './rustdocFolding';

export function getCleanTerm(rawTerm: string): string {
    let term = rawTerm.replace(/^\[`?/, '').replace(/`?\]$/, '');
    term = term.replace(/^`/, '').replace(/`$/, '');
    return term;
}

export function buildRipgrepPattern(term: string): string {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return `^\\s*(///|//!)\\s*\\[\`?${escapedTerm}\`?\\]:\\s*(.+)`;
}

export function extractDefinitionContent(selectedDef: string): string {
    return selectedDef.replace(/^\s*(?:\/\/\/|\/\/!)\s*/, '');
}

export function determinePrefixToUse(
    lastLineText: string,
    blockType: 'module' | 'item',
): string {
    const targetPrefixMatch = lastLineText.match(/^(\s*(?:\/\/\/|\/\/!)\s*)/);
    return targetPrefixMatch
        ? targetPrefixMatch[1]
        : blockType === 'module'
          ? '//! '
          : '/// ';
}

export function buildExistingDefPattern(term: string): RegExp {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^\\s*(///|//!)\\s*\\[\\\`?${escapedTerm}\\\`?\\]:`);
}

export async function insertRustdocLinkDef(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'rust') {
        showStatusBarMessage('Not a Rust file', 'warning');
        return;
    }

    let term = editor.document.getText(editor.selection);

    // Smart Selection
    if (!term) {
        const cursorPosition = editor.selection.active;
        // Check for [`term`] or [term] or `term` near cursor
        const wordRange = editor.document.getWordRangeAtPosition(
            cursorPosition,
            /\[`?[^`\]]+`?\]/,
        );
        if (wordRange) {
            term = editor.document.getText(wordRange);
        } else {
            const fallbackWordRange =
                editor.document.getWordRangeAtPosition(cursorPosition);
            if (fallbackWordRange) {
                term = editor.document.getText(fallbackWordRange);
            }
        }
    }

    if (!term) {
        showStatusBarMessage(
            'Please select a term to find its link reference definition.',
            'warning',
        );
        return;
    }

    // Strip wrapping brackets/backticks
    term = getCleanTerm(term);

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        showStatusBarMessage('No workspace folder open', 'warning');
        return;
    }

    const cwd = workspaceFolders[0].uri.fsPath;

    // Regex to match existing definitions like `//! [`OSC`]: r3bl_tui...` or `/// [OSC]: ...`
    const rgPattern = buildRipgrepPattern(term);

    showStatusBarMessage(`Searching for [${term}]...`, 'info');

    execFile(
        'rg',
        ['-I', '-N', '--no-heading', '--color', 'never', rgPattern, '.'],
        { cwd },
        async (error, stdout, stderr) => {
            if (error) {
                if ((error as any).code === 'ENOENT') {
                    showStatusBarMessage(
                        'ripgrep (rg) is not installed or not in PATH',
                        'error',
                    );
                    return;
                }
                // rg returns 1 if no matches are found
                if ((error as any).code !== 1) {
                    showStatusBarMessage(
                        `Ripgrep error: ${stderr || error.message}`,
                        'error',
                    );
                    return;
                }
            }

            if (!stdout || stdout.trim() === '') {
                showStatusBarMessage(
                    `No link reference definitions found for [${term}]`,
                    'info',
                );
                return;
            }

            const lines = stdout
                .split('\n')
                .map((l) => l.trim())
                .filter((l) => l.length > 0);

            const uniqueDefs = new Set<string>();
            const config = vscode.workspace.getConfiguration('r3bl-semantic-config');
            const maxResults = config.get<number>('insertRustdocLinkDef.maxResults', 5);

            for (const line of lines) {
                if (!line.trim()) {
                    continue;
                }
                uniqueDefs.add(line);
                if (uniqueDefs.size >= maxResults) {
                    break;
                }
            }

            if (uniqueDefs.size === 0) {
                showStatusBarMessage(
                    `No link reference definitions found for [${term}]`,
                    'info',
                );
                return;
            }

            let selectedDef: string | undefined;
            if (uniqueDefs.size === 1) {
                selectedDef = Array.from(uniqueDefs)[0];
            } else {
                selectedDef = await vscode.window.showQuickPick(Array.from(uniqueDefs), {
                    placeHolder: `Select link reference definition for [${term}]`,
                });
            }

            if (!selectedDef) {
                return;
            }

            const blocks = findRustdocBlocks(editor.document);
            const cursorLine = editor.selection.active.line;

            const targetBlock = blocks.find(
                (b) => cursorLine >= b.startLine && cursorLine <= b.endLine,
            );

            if (!targetBlock) {
                showStatusBarMessage('Cursor is not inside a rustdoc block.', 'warning');
                return;
            }

            // Normalize the definition to match the block type
            const content = extractDefinitionContent(selectedDef);
            const lastLineText = editor.document.lineAt(targetBlock.endLine).text;

            // Check if a definition for this term already exists in this block
            const existingDefRegex = buildExistingDefPattern(term);

            let existingLineIndex = -1;
            for (let i = targetBlock.startLine; i <= targetBlock.endLine; i++) {
                const lineText = editor.document.lineAt(i).text;
                if (existingDefRegex.test(lineText)) {
                    existingLineIndex = i;
                    break;
                }
            }

            const prefixToUse = determinePrefixToUse(lastLineText, targetBlock.type);
            const stringToInsert = `${prefixToUse}${content}`;

            if (existingLineIndex !== -1) {
                const existingLineText = editor.document.lineAt(existingLineIndex).text;

                // If it's exactly the same content, do nothing
                if (existingLineText.trim() === stringToInsert.trim()) {
                    showStatusBarMessage(
                        `Definition for [${term}] already exists in this block`,
                        'info',
                    );
                    return;
                }

                // Replace the existing line
                const lineRange = editor.document.lineAt(existingLineIndex).range;
                await editor.edit((editBuilder) => {
                    editBuilder.replace(lineRange, stringToInsert);
                });
                showStatusBarMessage(
                    `Replaced existing link definition for [${term}]`,
                    'success',
                );
            } else {
                // Append to the end of the block
                const endPos = new vscode.Position(
                    targetBlock.endLine,
                    lastLineText.length,
                );
                await editor.edit((editBuilder) => {
                    editBuilder.insert(endPos, `\n${stringToInsert}`);
                });
                showStatusBarMessage(`Inserted link definition for [${term}]`, 'success');
            }
        },
    );
}
