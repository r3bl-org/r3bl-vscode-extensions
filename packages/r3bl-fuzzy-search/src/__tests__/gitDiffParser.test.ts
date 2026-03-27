// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import { parseUnifiedDiff } from '../gitDiffParser';

describe('parseUnifiedDiff', () => {
    it('parses basic hunk with adds and context', () => {
        const diff = [
            'diff --git a/src/file.ts b/src/file.ts',
            'index abc1234..def5678 100644',
            '--- a/src/file.ts',
            '+++ b/src/file.ts',
            '@@ -10,6 +10,7 @@ some context header',
            ' line 10 context',
            ' line 11 context',
            '+new line 12',
            ' line 13 context',
            ' line 14 context',
            ' line 15 context',
        ].join('\n');

        const result = parseUnifiedDiff(diff);

        expect(result).toEqual([
            {
                file: 'src/file.ts',
                line: 10,
                content: 'line 10 context',
                type: 'context',
            },
            {
                file: 'src/file.ts',
                line: 11,
                content: 'line 11 context',
                type: 'context',
            },
            { file: 'src/file.ts', line: 12, content: 'new line 12', type: 'added' },
            {
                file: 'src/file.ts',
                line: 13,
                content: 'line 13 context',
                type: 'context',
            },
            {
                file: 'src/file.ts',
                line: 14,
                content: 'line 14 context',
                type: 'context',
            },
            {
                file: 'src/file.ts',
                line: 15,
                content: 'line 15 context',
                type: 'context',
            },
        ]);
    });

    it('discards pure-deletion hunk (only removed lines, no added lines)', () => {
        const diff = [
            'diff --git a/src/file.ts b/src/file.ts',
            '--- a/src/file.ts',
            '+++ b/src/file.ts',
            '@@ -10,5 +10,3 @@ context',
            ' context before',
            '-deleted line 1',
            '-deleted line 2',
            ' context after',
        ].join('\n');

        const result = parseUnifiedDiff(diff);
        expect(result).toEqual([]);
    });

    it('keeps added and context lines in mixed hunk, skips removed lines', () => {
        const diff = [
            'diff --git a/src/file.ts b/src/file.ts',
            '--- a/src/file.ts',
            '+++ b/src/file.ts',
            '@@ -10,5 +10,5 @@ context',
            ' context before',
            '-old line',
            '+new line',
            ' context after',
            ' more context',
        ].join('\n');

        const result = parseUnifiedDiff(diff);

        expect(result).toEqual([
            { file: 'src/file.ts', line: 10, content: 'context before', type: 'context' },
            { file: 'src/file.ts', line: 11, content: 'new line', type: 'added' },
            { file: 'src/file.ts', line: 12, content: 'context after', type: 'context' },
            { file: 'src/file.ts', line: 13, content: 'more context', type: 'context' },
        ]);
    });

    it('omits file where all hunks are pure deletions', () => {
        const diff = [
            'diff --git a/src/a.ts b/src/a.ts',
            '--- a/src/a.ts',
            '+++ b/src/a.ts',
            '@@ -5,4 +5,3 @@ context',
            ' ctx',
            '-removed',
            ' ctx',
            '@@ -20,4 +19,3 @@ context',
            ' ctx',
            '-also removed',
            ' ctx',
        ].join('\n');

        const result = parseUnifiedDiff(diff);
        expect(result).toEqual([]);
    });

    it('parses multiple files in one diff', () => {
        const diff = [
            'diff --git a/src/a.ts b/src/a.ts',
            '--- a/src/a.ts',
            '+++ b/src/a.ts',
            '@@ -1,3 +1,4 @@',
            ' line 1',
            '+added in a',
            ' line 2',
            ' line 3',
            'diff --git a/src/b.ts b/src/b.ts',
            '--- a/src/b.ts',
            '+++ b/src/b.ts',
            '@@ -5,3 +5,4 @@',
            ' line 5',
            '+added in b',
            ' line 6',
            ' line 7',
        ].join('\n');

        const result = parseUnifiedDiff(diff);

        const filesInResult = [...new Set(result.map((r) => r.file))];
        expect(filesInResult).toEqual(['src/a.ts', 'src/b.ts']);

        const aLines = result.filter((r) => r.file === 'src/a.ts');
        expect(aLines.find((l) => l.type === 'added')?.content).toBe('added in a');

        const bLines = result.filter((r) => r.file === 'src/b.ts');
        expect(bLines.find((l) => l.type === 'added')?.content).toBe('added in b');
    });

    it('uses new name for renamed files', () => {
        const diff = [
            'diff --git a/old-name.ts b/new-name.ts',
            'similarity index 90%',
            'rename from old-name.ts',
            'rename to new-name.ts',
            '--- a/old-name.ts',
            '+++ b/new-name.ts',
            '@@ -1,3 +1,4 @@',
            ' existing',
            '+added line',
            ' more existing',
            ' end',
        ].join('\n');

        const result = parseUnifiedDiff(diff);

        expect(result.length).toBeGreaterThan(0);
        expect(result.every((l) => l.file === 'new-name.ts')).toBe(true);
        expect(result.find((l) => l.type === 'added')?.content).toBe('added line');
    });

    it('skips binary files', () => {
        const diff = [
            'diff --git a/image.png b/image.png',
            'Binary files a/image.png and b/image.png differ',
            'diff --git a/src/code.ts b/src/code.ts',
            '--- a/src/code.ts',
            '+++ b/src/code.ts',
            '@@ -1,3 +1,4 @@',
            ' line 1',
            '+added line',
            ' line 3',
            ' line 4',
        ].join('\n');

        const result = parseUnifiedDiff(diff);

        expect(result.every((l) => l.file === 'src/code.ts')).toBe(true);
        expect(result.find((l) => l.type === 'added')?.content).toBe('added line');
    });

    it('returns empty array for empty diff', () => {
        expect(parseUnifiedDiff('')).toEqual([]);
        expect(parseUnifiedDiff('   ')).toEqual([]);
        expect(parseUnifiedDiff('\n\n')).toEqual([]);
    });

    it('tracks line numbers correctly across multiple hunks in one file', () => {
        const diff = [
            'diff --git a/src/file.ts b/src/file.ts',
            '--- a/src/file.ts',
            '+++ b/src/file.ts',
            '@@ -1,3 +1,4 @@',
            ' line 1',
            '+added at 2',
            ' line 2',
            ' line 3',
            '@@ -50,3 +51,4 @@',
            ' line 51',
            '+added at 52',
            ' line 52',
            ' line 53',
        ].join('\n');

        const result = parseUnifiedDiff(diff);

        const addedLines = result.filter((l) => l.type === 'added');
        expect(addedLines).toEqual([
            { file: 'src/file.ts', line: 2, content: 'added at 2', type: 'added' },
            { file: 'src/file.ts', line: 52, content: 'added at 52', type: 'added' },
        ]);
    });

    it('parses git show output (skips commit metadata header)', () => {
        // git show prepends commit info before the diff
        const diff = [
            'commit abc123def456789',
            'Author: John Doe <john@example.com>',
            'Date:   Thu Mar 27 10:00:00 2026 -0400',
            '',
            '    Fix the bug',
            '',
            'diff --git a/src/file.ts b/src/file.ts',
            'index abc1234..def5678 100644',
            '--- a/src/file.ts',
            '+++ b/src/file.ts',
            '@@ -10,3 +10,4 @@ some context',
            ' line 10',
            ' line 11',
            '+new line 12',
            ' line 13',
        ].join('\n');

        const result = parseUnifiedDiff(diff);

        expect(result).toHaveLength(4);
        expect(result[0]).toEqual({
            file: 'src/file.ts',
            line: 10,
            content: 'line 10',
            type: 'context',
        });
        expect(result[2]).toEqual({
            file: 'src/file.ts',
            line: 12,
            content: 'new line 12',
            type: 'added',
        });
    });

    it('parses --first-parent merge commit diff output', () => {
        // --first-parent produces a normal unified diff, not combined format
        const diff = [
            'commit abc123def456789',
            'Merge: aaa111 bbb222',
            'Author: John Doe <john@example.com>',
            'Date:   Thu Mar 27 10:00:00 2026 -0400',
            '',
            '    Merge branch feature into main',
            '',
            'diff --git a/src/feature.ts b/src/feature.ts',
            'new file mode 100644',
            'index 0000000..abc1234',
            '--- /dev/null',
            '+++ b/src/feature.ts',
            '@@ -0,0 +1,3 @@',
            '+export function newFeature() {',
            '+    return true;',
            '+}',
            'diff --git a/src/main.ts b/src/main.ts',
            'index abc1234..def5678 100644',
            '--- a/src/main.ts',
            '+++ b/src/main.ts',
            '@@ -5,3 +5,4 @@ existing code',
            ' line 5',
            ' line 6',
            '+import { newFeature } from "./feature";',
            ' line 7',
        ].join('\n');

        const result = parseUnifiedDiff(diff);

        const featureLines = result.filter((l) => l.file === 'src/feature.ts');
        expect(featureLines).toHaveLength(3);
        expect(featureLines[0].content).toBe('export function newFeature() {');
        expect(featureLines.every((l) => l.type === 'added')).toBe(true);

        const mainLines = result.filter((l) => l.file === 'src/main.ts');
        expect(mainLines).toHaveLength(4);
        expect(mainLines.find((l) => l.type === 'added')?.content).toBe(
            'import { newFeature } from "./feature";',
        );
    });

    it('assigns correct sequential line numbers to context between added lines', () => {
        const diff = [
            'diff --git a/src/file.ts b/src/file.ts',
            '--- a/src/file.ts',
            '+++ b/src/file.ts',
            '@@ -10,7 +10,9 @@',
            ' context 10',
            '+added 11',
            ' context 12',
            ' context 13',
            '+added 14',
            ' context 15',
            ' context 16',
        ].join('\n');

        const result = parseUnifiedDiff(diff);

        expect(result).toEqual([
            { file: 'src/file.ts', line: 10, content: 'context 10', type: 'context' },
            { file: 'src/file.ts', line: 11, content: 'added 11', type: 'added' },
            { file: 'src/file.ts', line: 12, content: 'context 12', type: 'context' },
            { file: 'src/file.ts', line: 13, content: 'context 13', type: 'context' },
            { file: 'src/file.ts', line: 14, content: 'added 14', type: 'added' },
            { file: 'src/file.ts', line: 15, content: 'context 15', type: 'context' },
            { file: 'src/file.ts', line: 16, content: 'context 16', type: 'context' },
        ]);
    });
});
