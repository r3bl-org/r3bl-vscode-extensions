// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import {
    parseCommitLog,
    buildQuickPickItems,
    formatCommitHeader,
    CommitInfo,
    formatGitDiffContext,
    parseGitDiffContext,
    formatSection,
    buildGitDiffDocumentContent,
} from "../gitDiffCommand"
import { DiffLine } from "../gitDiffParser"

describe("formatGitDiffContext", () => {
    it('returns "uncommitted" for uncommitted type', () => {
        expect(formatGitDiffContext("uncommitted")).toBe("uncommitted")
    })

    it("returns formatted commit info for commit type", () => {
        const commitInfo: CommitInfo = {
            hash: "full_hash",
            shortHash: "short",
            subject: "sub",
            author: "auth",
            relativeDate: "date",
            timestamp: 123,
            cwd: "/path/to/repo",
            folderName: "my-repo",
        }
        const result = formatGitDiffContext("commit", commitInfo)
        expect(result).toBe(
            "commit, hash: full_hash, cwd: /path/to/repo, folder: my-repo",
        )
    })
})

describe("parseGitDiffContext", () => {
    it('parses "uncommitted"', () => {
        expect(parseGitDiffContext("uncommitted")).toEqual({ type: "uncommitted" })
    })

    it("parses formatted commit info", () => {
        const contextLine = "commit, hash: abc123full, cwd: /work/dir, folder: my-proj"
        expect(parseGitDiffContext(contextLine)).toEqual({
            type: "commit",
            hash: "abc123full",
            cwd: "/work/dir",
            folder: "my-proj",
        })
    })

    it("returns undefined for invalid format", () => {
        expect(parseGitDiffContext("invalid")).toBeUndefined()
        expect(parseGitDiffContext("commit, hash: abc")).toBeUndefined()
    })
})

describe("parseCommitLog", () => {
    it("parses multiple commits from normal output", () => {
        const output = [
            "abc123full\x00abc1234\x00Fix the bug\x00John\x002 days ago\x001711500000",
            "def456full\x00def5678\x00Add feature\x00Jane\x003 days ago\x001711400000",
            "ghi789full\x00ghi9012\x00Update docs\x00Bob\x004 days ago\x001711300000",
        ].join("\n")

        const result = parseCommitLog(output, "/path/to/repo", "my-repo")

        expect(result).toHaveLength(3)
        expect(result[0]).toEqual({
            hash: "abc123full",
            shortHash: "abc1234",
            subject: "Fix the bug",
            author: "John",
            relativeDate: "2 days ago",
            timestamp: 1711500000,
            cwd: "/path/to/repo",
            folderName: "my-repo",
        })
        expect(result[1].shortHash).toBe("def5678")
        expect(result[2].shortHash).toBe("ghi9012")
    })

    it("returns empty array for empty output", () => {
        expect(parseCommitLog("", "/path", "repo")).toEqual([])
        expect(parseCommitLog("   ", "/path", "repo")).toEqual([])
        expect(parseCommitLog("\n\n", "/path", "repo")).toEqual([])
    })

    it("handles subject containing pipe characters", () => {
        const output =
            "abc123\x00abc1\x00Fix A | Fix B | Fix C\x00John\x002 days ago\x001711500000"

        const result = parseCommitLog(output, "/path", "repo")

        expect(result).toHaveLength(1)
        expect(result[0].subject).toBe("Fix A | Fix B | Fix C")
    })

    it("handles subject with special characters", () => {
        const output =
            'abc123\x00abc1\x00Fix "quotes" and \\backslash\\ and émojis 🎉\x00John\x002 days ago\x001711500000'

        const result = parseCommitLog(output, "/path", "repo")

        expect(result).toHaveLength(1)
        expect(result[0].subject).toBe('Fix "quotes" and \\backslash\\ and émojis 🎉')
    })

    it("parses single commit", () => {
        const output = `abc123full\x00abc1234\x00Initial commit\x00John\x00${"5 days ago"}\x001711100000`

        const result = parseCommitLog(output, "/path", "repo")

        expect(result).toHaveLength(1)
        expect(result[0].subject).toBe("Initial commit")
        expect(result[0].timestamp).toBe(1711100000)
    })
})

describe("buildQuickPickItems", () => {
    const makeCommit = (overrides: Partial<CommitInfo> = {}): CommitInfo => ({
        hash: "abc123full",
        shortHash: "abc1234",
        subject: "Fix bug",
        author: "John",
        relativeDate: "2 days ago",
        timestamp: 1711500000,
        cwd: "/path/to/repo",
        folderName: "my-repo",
        ...overrides,
    })

    it('always has "Uncommitted Changes" as the first item', () => {
        const commits = [makeCommit()]
        const items = buildQuickPickItems(commits, false, 10)

        expect(items[0].type).toBe("uncommitted")
        expect(items[0].label).toContain("Uncommitted Changes")
    })

    it("has no folder prefix in single-root mode", () => {
        const commits = [makeCommit({ folderName: "my-repo" })]
        const items = buildQuickPickItems(commits, false, 10)

        const commitItem = items[1]
        expect(commitItem.label).not.toContain("[my-repo]")
        expect(commitItem.label).toContain("abc1234")
    })

    it("has folder prefix in multi-root mode", () => {
        const commits = [makeCommit({ folderName: "my-repo" })]
        const items = buildQuickPickItems(commits, true, 10)

        const commitItem = items[1]
        expect(commitItem.label).toContain("[my-repo]")
    })

    it("caps items at the configured limit", () => {
        const commits = Array.from({ length: 20 }, (_, i) =>
            makeCommit({
                shortHash: `hash${i}`,
                timestamp: 1711500000 - i * 1000,
            }),
        )
        const items = buildQuickPickItems(commits, false, 5)

        expect(items).toHaveLength(6)
    })

    it("sorts items by timestamp descending", () => {
        const commits = [
            makeCommit({ shortHash: "oldest", timestamp: 1000 }),
            makeCommit({ shortHash: "newest", timestamp: 3000 }),
            makeCommit({ shortHash: "middle", timestamp: 2000 }),
        ]
        const items = buildQuickPickItems(commits, false, 10)

        expect(items[1].label).toContain("newest")
        expect(items[2].label).toContain("middle")
        expect(items[3].label).toContain("oldest")
    })
})

describe("formatCommitHeader", () => {
    const commitInfo: CommitInfo = {
        hash: "abc123full",
        shortHash: "abc1234",
        subject: "Fix the bug",
        author: "John",
        relativeDate: "2 days ago",
        timestamp: 1711500000,
        cwd: "/path/to/repo",
        folderName: "my-repo",
    }

    it("produces correct header format", () => {
        const header = formatCommitHeader(commitInfo, 15, 3, false)

        expect(header).toBe(
            "# Git Commit: abc1234 — Fix the bug (John, 2 days ago)\n" +
                "# 15 changes - 3 files\n" +
                "#",
        )
    })

    it("has no folder prefix in single-root mode", () => {
        const header = formatCommitHeader(commitInfo, 15, 3, false)

        expect(header).not.toContain("[my-repo]")
    })

    it("has folder prefix in multi-root mode", () => {
        const header = formatCommitHeader(commitInfo, 15, 3, true)

        expect(header).toContain("[my-repo]")
        expect(header).toContain(
            "# Git Commit: [my-repo] abc1234 — Fix the bug (John, 2 days ago)",
        )
    })
})

describe("formatSection", () => {
    it("caps lines per file to maxLinesPerFile", () => {
        const lines: DiffLine[] = Array.from({ length: 10 }, (_, i) => ({
            file: "src/test.ts",
            line: i + 1,
            content: `line ${i + 1}`,
            type: "added",
        }))

        const result = formatSection({ label: "Unstaged Changes", lines }, 3)

        expect(result.text).toContain("src/test.ts:")
        expect(result.text).toContain("  1: line 1")
        expect(result.text).toContain("  3: line 3")
        expect(result.text).not.toContain("  4: line 4")
    })
})

describe("buildGitDiffDocumentContent", () => {
    it("orders sections as Unstaged Changes -> Staged Changes -> Untracked Files", () => {
        const unstaged: DiffLine[] = [
            { file: "a.ts", line: 1, content: "unstaged line", type: "added" },
        ]
        const staged: DiffLine[] = [
            { file: "b.ts", line: 1, content: "staged line", type: "added" },
        ]
        const untracked: DiffLine[] = [
            { file: "c.ts", line: 1, content: "untracked line", type: "added" },
        ]

        const docResult = buildGitDiffDocumentContent({
            selectionType: "uncommitted",
            allUnstaged: unstaged,
            allStaged: staged,
            allUntracked: untracked,
            isMultiRoot: false,
            maxLinesPerFile: 5,
        })

        const text = docResult.content
        const unstagedIdx = text.indexOf("Unstaged Changes")
        const stagedIdx = text.indexOf("Staged Changes")
        const untrackedIdx = text.indexOf("Untracked Files")

        expect(unstagedIdx).toBeGreaterThan(-1)
        expect(stagedIdx).toBeGreaterThan(unstagedIdx)
        expect(untrackedIdx).toBeGreaterThan(stagedIdx)
    })

    it("calculates stagedFileHeaderLineIndexes correctly", () => {
        const unstaged: DiffLine[] = [
            { file: "a.ts", line: 1, content: "unstaged line", type: "added" },
        ]
        const staged: DiffLine[] = [
            { file: "staged1.ts", line: 1, content: "staged line 1", type: "added" },
            { file: "staged2.ts", line: 1, content: "staged line 2", type: "added" },
        ]

        const docResult = buildGitDiffDocumentContent({
            selectionType: "uncommitted",
            allUnstaged: unstaged,
            allStaged: staged,
            allUntracked: [],
            isMultiRoot: false,
            maxLinesPerFile: 5,
        })

        const lines = docResult.content.split("\n")
        expect(docResult.stagedFileHeaderLineIndexes.length).toBe(2)

        for (const idx of docResult.stagedFileHeaderLineIndexes) {
            expect(lines[idx]).toMatch(/staged\d\.ts:/)
        }
    })

    it("renders historical commit view without untracked section", () => {
        const commitChanges: DiffLine[] = [
            { file: "commit_file.ts", line: 1, content: "commit line", type: "added" },
        ]
        const commitInfo: CommitInfo = {
            hash: "1234567890abcdef",
            shortHash: "1234567",
            subject: "Initial commit",
            author: "Author",
            relativeDate: "1 day ago",
            timestamp: 1000,
            cwd: "/repo",
            folderName: "repo",
        }

        const docResult = buildGitDiffDocumentContent({
            selectionType: "commit",
            commitInfo,
            allUnstaged: commitChanges,
            allStaged: [],
            allUntracked: [
                {
                    file: "untracked.ts",
                    line: 1,
                    content: "should ignore",
                    type: "added",
                },
            ],
            isMultiRoot: false,
            maxLinesPerFile: 5,
        })

        expect(docResult.content).toContain("# Git Commit: 1234567 — Initial commit")
        expect(docResult.content).toContain("commit_file.ts:")
        expect(docResult.content).not.toContain("Untracked Files")
        expect(docResult.collapsedFileHeaderLineIndexes.length).toBe(0)
    })
})
