// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import {
    parseCommitLog,
    buildQuickPickItems,
    formatCommitHeader,
    CommitInfo,
    formatGitDiffContext,
    parseGitDiffContext,
} from '../gitDiffCommand';

describe('formatGitDiffContext', () => {
    it('returns "uncommitted" for uncommitted type', () => {
        expect(formatGitDiffContext('uncommitted')).toBe('uncommitted');
    });

    it('returns formatted commit info for commit type', () => {
        const commitInfo: CommitInfo = {
            hash: 'full_hash',
            shortHash: 'short',
            subject: 'sub',
            author: 'auth',
            relativeDate: 'date',
            timestamp: 123,
            cwd: '/path/to/repo',
            folderName: 'my-repo',
        };
        const result = formatGitDiffContext('commit', commitInfo);
        expect(result).toBe(
            'commit, hash: full_hash, cwd: /path/to/repo, folder: my-repo',
        );
    });
});

describe('parseGitDiffContext', () => {
    it('parses "uncommitted"', () => {
        expect(parseGitDiffContext('uncommitted')).toEqual({ type: 'uncommitted' });
    });

    it('parses formatted commit info', () => {
        const contextLine = 'commit, hash: abc123full, cwd: /work/dir, folder: my-proj';
        expect(parseGitDiffContext(contextLine)).toEqual({
            type: 'commit',
            hash: 'abc123full',
            cwd: '/work/dir',
            folder: 'my-proj',
        });
    });

    it('returns undefined for invalid format', () => {
        expect(parseGitDiffContext('invalid')).toBeUndefined();
        expect(parseGitDiffContext('commit, hash: abc')).toBeUndefined();
    });
});

describe('parseCommitLog', () => {
    it('parses multiple commits from normal output', () => {
        const output = [
            'abc123full\x00abc1234\x00Fix the bug\x00John\x002 days ago\x001711500000',
            'def456full\x00def5678\x00Add feature\x00Jane\x003 days ago\x001711400000',
            'ghi789full\x00ghi9012\x00Update docs\x00Bob\x004 days ago\x001711300000',
        ].join('\n');

        const result = parseCommitLog(output, '/path/to/repo', 'my-repo');

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({
            hash: 'abc123full',
            shortHash: 'abc1234',
            subject: 'Fix the bug',
            author: 'John',
            relativeDate: '2 days ago',
            timestamp: 1711500000,
            cwd: '/path/to/repo',
            folderName: 'my-repo',
        });
        expect(result[1].shortHash).toBe('def5678');
        expect(result[2].shortHash).toBe('ghi9012');
    });

    it('returns empty array for empty output', () => {
        expect(parseCommitLog('', '/path', 'repo')).toEqual([]);
        expect(parseCommitLog('   ', '/path', 'repo')).toEqual([]);
        expect(parseCommitLog('\n\n', '/path', 'repo')).toEqual([]);
    });

    it('handles subject containing pipe characters', () => {
        const output =
            'abc123\x00abc1\x00Fix A | Fix B | Fix C\x00John\x002 days ago\x001711500000';

        const result = parseCommitLog(output, '/path', 'repo');

        expect(result).toHaveLength(1);
        expect(result[0].subject).toBe('Fix A | Fix B | Fix C');
    });

    it('handles subject with special characters', () => {
        const output =
            'abc123\x00abc1\x00Fix "quotes" and \\backslash\\ and émojis 🎉\x00John\x002 days ago\x001711500000';

        const result = parseCommitLog(output, '/path', 'repo');

        expect(result).toHaveLength(1);
        expect(result[0].subject).toBe('Fix "quotes" and \\backslash\\ and émojis 🎉');
    });

    it('parses single commit', () => {
        const output = `abc123full\x00abc1234\x00Initial commit\x00John\x00${'5 days ago'}\x001711100000`;

        const result = parseCommitLog(output, '/path', 'repo');

        expect(result).toHaveLength(1);
        expect(result[0].subject).toBe('Initial commit');
        expect(result[0].timestamp).toBe(1711100000);
    });
});

describe('buildQuickPickItems', () => {
    const makeCommit = (overrides: Partial<CommitInfo> = {}): CommitInfo => ({
        hash: 'abc123full',
        shortHash: 'abc1234',
        subject: 'Fix bug',
        author: 'John',
        relativeDate: '2 days ago',
        timestamp: 1711500000,
        cwd: '/path/to/repo',
        folderName: 'my-repo',
        ...overrides,
    });

    it('always has "Uncommitted Changes" as the first item', () => {
        const commits = [makeCommit()];
        const items = buildQuickPickItems(commits, false, 10);

        expect(items[0].type).toBe('uncommitted');
        expect(items[0].label).toContain('Uncommitted Changes');
    });

    it('has no folder prefix in single-root mode', () => {
        const commits = [makeCommit({ folderName: 'my-repo' })];
        const items = buildQuickPickItems(commits, false, 10);

        const commitItem = items[1];
        expect(commitItem.label).not.toContain('[my-repo]');
        expect(commitItem.label).toContain('abc1234');
    });

    it('has folder prefix in multi-root mode', () => {
        const commits = [makeCommit({ folderName: 'my-repo' })];
        const items = buildQuickPickItems(commits, true, 10);

        const commitItem = items[1];
        expect(commitItem.label).toContain('[my-repo]');
    });

    it('caps items at the configured limit', () => {
        const commits = Array.from({ length: 20 }, (_, i) =>
            makeCommit({
                shortHash: `hash${i}`,
                timestamp: 1711500000 - i * 1000,
            }),
        );
        const items = buildQuickPickItems(commits, false, 5);

        // 1 uncommitted + 5 commits = 6 total
        expect(items).toHaveLength(6);
    });

    it('sorts items by timestamp descending', () => {
        const commits = [
            makeCommit({ shortHash: 'oldest', timestamp: 1000 }),
            makeCommit({ shortHash: 'newest', timestamp: 3000 }),
            makeCommit({ shortHash: 'middle', timestamp: 2000 }),
        ];
        const items = buildQuickPickItems(commits, false, 10);

        // Skip index 0 (Uncommitted Changes)
        expect(items[1].label).toContain('newest');
        expect(items[2].label).toContain('middle');
        expect(items[3].label).toContain('oldest');
    });
});

describe('formatCommitHeader', () => {
    const commitInfo: CommitInfo = {
        hash: 'abc123full',
        shortHash: 'abc1234',
        subject: 'Fix the bug',
        author: 'John',
        relativeDate: '2 days ago',
        timestamp: 1711500000,
        cwd: '/path/to/repo',
        folderName: 'my-repo',
    };

    it('produces correct header format', () => {
        const header = formatCommitHeader(commitInfo, 15, 3, false);

        expect(header).toBe(
            '# Git Commit: abc1234 — Fix the bug (John, 2 days ago)\n' +
                '# 15 changes - 3 files\n' +
                '#',
        );
    });

    it('has no folder prefix in single-root mode', () => {
        const header = formatCommitHeader(commitInfo, 15, 3, false);

        expect(header).not.toContain('[my-repo]');
    });

    it('has folder prefix in multi-root mode', () => {
        const header = formatCommitHeader(commitInfo, 15, 3, true);

        expect(header).toContain('[my-repo]');
        expect(header).toContain(
            '# Git Commit: [my-repo] abc1234 — Fix the bug (John, 2 days ago)',
        );
    });
});
