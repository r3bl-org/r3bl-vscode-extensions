// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from 'vscode';

/**
 * Represents a block of `use` statements at the top of a Rust file.
 */
export interface ImportBlock {
    startLine: number;
    endLine: number;
}

/**
 * Finds the contiguous block of `use` statements at the top of a Rust file.
 *
 * Scans from line 0, skipping preamble (blank lines, `//!` module docs,
 * `#![...]` inner attributes, regular `//` comments). Once the first `use`
 * line is found, continues through single-line and multi-line `use` statements,
 * blank lines between use groups, and comments between use groups.
 *
 * Returns null if:
 * - No `use` statements are found at the top of the file
 * - The import block spans fewer than 2 lines (not worth folding)
 *
 * Only detects top-of-file imports. `use` statements in inner modules or
 * test blocks are ignored.
 */
export function findImportBlock(document: vscode.TextDocument): ImportBlock | null {
    let importStart: number | null = null;
    let importEnd: number | null = null;
    let braceDepth = 0;
    let insideMultiLineUse = false;
    let seenUse = false;

    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i).text;
        const trimmed = line.trimStart();

        // Inside a multi-line use statement — track braces until closed
        if (insideMultiLineUse) {
            importEnd = i;
            for (const ch of trimmed) {
                if (ch === '{') braceDepth++;
                if (ch === '}') braceDepth--;
            }
            if (braceDepth <= 0) {
                insideMultiLineUse = false;
                braceDepth = 0;
            }
            continue;
        }

        // Preamble: skip these before any `use` is seen, and also between use groups
        if (trimmed === '') {
            // Blank lines are allowed in preamble and between use groups
            continue;
        }
        if (trimmed.startsWith('//!') || trimmed.startsWith('///')) {
            // Doc comments: only skip in preamble (before first use)
            if (!seenUse) continue;
            // After first use, a doc comment means we've left the import block
            break;
        }
        if (trimmed.startsWith('//')) {
            // Regular comments: allowed in preamble and between use groups
            continue;
        }
        if (trimmed.startsWith('#![') || trimmed.startsWith('#![ ')) {
            // Inner attributes: only in preamble
            if (!seenUse) continue;
            break;
        }

        // Check for `use` statement
        if (
            trimmed.startsWith('use ') ||
            trimmed === 'use{' ||
            trimmed.startsWith('use{')
        ) {
            if (importStart === null) {
                importStart = i;
            }
            importEnd = i;
            seenUse = true;

            // Check if this is a multi-line use (open brace without close)
            braceDepth = 0;
            for (const ch of trimmed) {
                if (ch === '{') braceDepth++;
                if (ch === '}') braceDepth--;
            }
            if (braceDepth > 0) {
                insideMultiLineUse = true;
            } else {
                braceDepth = 0;
            }
            continue;
        }

        // Any other non-use line after we've seen use statements — block ends
        if (seenUse) {
            break;
        }

        // Non-use, non-preamble line before any use — no top-of-file imports
        break;
    }

    if (importStart === null || importEnd === null) {
        return null;
    }

    // Minimum 2 lines to be worth folding
    if (importEnd - importStart < 1) {
        return null;
    }

    return { startLine: importStart, endLine: importEnd };
}

/**
 * FoldingRangeProvider for Rust `use` statements at the top of files.
 * Registers a single folding region of kind Imports.
 */
export class RustUseStatementsFoldingProvider implements vscode.FoldingRangeProvider {
    provideFoldingRanges(
        document: vscode.TextDocument,
        _context: vscode.FoldingContext,
        _token: vscode.CancellationToken,
    ): vscode.FoldingRange[] {
        const block = findImportBlock(document);
        if (!block) {
            return [];
        }
        return [
            new vscode.FoldingRange(
                block.startLine,
                block.endLine,
                vscode.FoldingRangeKind.Imports,
            ),
        ];
    }
}
