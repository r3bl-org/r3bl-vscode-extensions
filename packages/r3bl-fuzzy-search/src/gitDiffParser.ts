// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

export type DiffLineType = 'added' | 'context';

export interface DiffLine {
    file: string;
    line: number;
    content: string;
    type: DiffLineType;
}

interface Hunk {
    lines: DiffLine[];
    hasAdded: boolean;
}

/**
 * Parse unified diff output into DiffLine entries.
 * Only emits added and context lines — removed lines are skipped entirely.
 * Hunks with zero added lines are discarded.
 * Files where all hunks are discarded are omitted.
 */
export function parseUnifiedDiff(diffOutput: string): DiffLine[] {
    if (!diffOutput.trim()) {
        return [];
    }

    const result: DiffLine[] = [];
    const lines = diffOutput.split('\n');

    let currentFile: string | null = null;
    let newLineNum = 0;
    let currentHunk: Hunk | null = null;
    let inBinaryFile = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // New file diff header
        if (line.startsWith('diff --git ')) {
            // Flush previous hunk
            if (currentHunk && currentHunk.hasAdded) {
                result.push(...currentHunk.lines);
            }
            currentHunk = null;
            currentFile = null;
            inBinaryFile = false;
            continue;
        }

        // Binary file — skip entirely
        if (line.startsWith('Binary files ')) {
            inBinaryFile = true;
            continue;
        }

        if (inBinaryFile) {
            // Stay in binary skip mode until next diff header
            if (!line.startsWith('diff --git ')) {
                continue;
            }
        }

        // New file path (use the +++ line which has the new/current name)
        if (line.startsWith('+++ ')) {
            // +++ b/path/to/file or +++ /dev/null (for deleted files)
            const filePath = line.substring(4);
            if (filePath === '/dev/null') {
                currentFile = null;
            } else {
                // Strip the b/ prefix
                currentFile = filePath.startsWith('b/')
                    ? filePath.substring(2)
                    : filePath;
            }
            continue;
        }

        // Skip --- line
        if (line.startsWith('--- ')) {
            continue;
        }

        // Skip index, old mode, new mode lines
        if (
            line.startsWith('index ') ||
            line.startsWith('old mode ') ||
            line.startsWith('new mode ') ||
            line.startsWith('new file mode ') ||
            line.startsWith('deleted file mode ') ||
            line.startsWith('similarity index ') ||
            line.startsWith('rename from ') ||
            line.startsWith('rename to ')
        ) {
            continue;
        }

        // Hunk header: @@ -a,b +c,d @@
        const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (hunkMatch) {
            // Flush previous hunk
            if (currentHunk && currentHunk.hasAdded) {
                result.push(...currentHunk.lines);
            }
            currentHunk = { lines: [], hasAdded: false };
            newLineNum = parseInt(hunkMatch[1], 10);
            continue;
        }

        // Inside a hunk — only process if we have a valid file and hunk
        if (!currentFile || !currentHunk) {
            continue;
        }

        if (line.startsWith('+')) {
            // Added line
            currentHunk.lines.push({
                file: currentFile,
                line: newLineNum,
                content: line.substring(1),
                type: 'added',
            });
            currentHunk.hasAdded = true;
            newLineNum++;
        } else if (line.startsWith('-')) {
            // Removed line — skip entirely, don't increment newLineNum
            continue;
        } else if (line.startsWith(' ') || line === '') {
            // Context line (starts with space) or empty line within a hunk
            const content = line.startsWith(' ') ? line.substring(1) : line;
            currentHunk.lines.push({
                file: currentFile,
                line: newLineNum,
                content: content,
                type: 'context',
            });
            newLineNum++;
        }
        // Skip any other line (e.g., "\ No newline at end of file")
    }

    // Flush final hunk
    if (currentHunk && currentHunk.hasAdded) {
        result.push(...currentHunk.lines);
    }

    return result;
}
