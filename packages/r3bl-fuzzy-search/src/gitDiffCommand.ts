// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from "vscode"
import { spawn } from "child_process"
import * as fs from "fs"
import * as path from "path"
import { showStatusBarMessage } from "r3bl-common-code"
import { parseUnifiedDiff, DiffLine } from "./gitDiffParser"

export function formatGitDiffContext(
    selectionType: "uncommitted" | "commit",
    commitInfo?: CommitInfo,
): string {
    if (selectionType === "commit" && commitInfo) {
        return `commit, hash: ${commitInfo.hash}, cwd: ${commitInfo.cwd}, folder: ${commitInfo.folderName}`
    }
    return "uncommitted"
}

export function parseGitDiffContext(
    contextLine: string,
):
    | { type: "uncommitted" }
    | { type: "commit"; hash: string; cwd: string; folder: string }
    | undefined {
    if (contextLine === "uncommitted") {
        return { type: "uncommitted" }
    }
    if (contextLine.startsWith("commit")) {
        const parts = contextLine.split(",").map((p) => p.trim())
        const hash = parts
            .find((p) => p.startsWith("hash:"))
            ?.replace("hash:", "")
            .trim()
        const cwd = parts
            .find((p) => p.startsWith("cwd:"))
            ?.replace("cwd:", "")
            .trim()
        const folder = parts
            .find((p) => p.startsWith("folder:"))
            ?.replace("folder:", "")
            .trim()
        if (hash && cwd && folder) {
            return { type: "commit", hash, cwd, folder }
        }
    }
    return undefined
}

function runGitDiff(
    cwd: string,
    staged: boolean,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
        const args = staged ? ["diff", "--cached", "-U3"] : ["diff", "-U3"]
        const proc = spawn("git", args, { cwd })
        let stdout = ""
        let stderr = ""

        proc.stdout.on("data", (data: Buffer) => {
            stdout += data.toString()
        })
        proc.stderr.on("data", (data: Buffer) => {
            stderr += data.toString()
        })
        proc.on("close", (code) => {
            resolve({ stdout, stderr, exitCode: code ?? 1 })
        })
        proc.on("error", () => {
            resolve({ stdout: "", stderr: "Failed to spawn git process", exitCode: 1 })
        })
    })
}

export async function getUntrackedFiles(
    cwd: string,
    folderName: string,
    isMultiRoot: boolean,
    maxLinesPerFile: number,
): Promise<DiffLine[]> {
    return new Promise((resolve) => {
        const proc = spawn("git", ["ls-files", "--others", "--exclude-standard"], { cwd })
        let stdout = ""
        proc.stdout.on("data", (data: Buffer) => {
            stdout += data.toString()
        })
        proc.on("close", async (code) => {
            if (code !== 0 || !stdout.trim()) {
                resolve([])
                return
            }
            const filePaths = stdout
                .split("\n")
                .map((l) => l.trim())
                .filter((l) => l.length > 0)

            const result: DiffLine[] = []
            for (const relPath of filePaths) {
                const fullPath = path.join(cwd, relPath)
                try {
                    const fileBuffer = await fs.promises.readFile(fullPath)
                    // Skip binary files (containing null bytes)
                    if (fileBuffer.includes(0)) {
                        continue
                    }
                    const text = fileBuffer.toString("utf-8")
                    const lines = text.split("\n")
                    const fileLabel = isMultiRoot ? `${folderName}/${relPath}` : relPath
                    const limit = Math.min(lines.length, maxLinesPerFile)

                    for (let i = 0; i < limit; i++) {
                        result.push({
                            file: fileLabel,
                            line: i + 1,
                            content: lines[i],
                            type: "added",
                        })
                    }
                } catch {
                    continue
                }
            }
            resolve(result)
        })
        proc.on("error", () => resolve([]))
    })
}

function formatTimestamp(): string {
    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, "0")
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
}

export interface SectionData {
    label: string
    lines: DiffLine[]
}

export interface CommitInfo {
    hash: string // Full SHA
    shortHash: string // Abbreviated SHA
    subject: string // Commit message first line
    author: string // Author name
    relativeDate: string // e.g. "2 days ago"
    timestamp: number // Unix timestamp for sorting (%ct)
    cwd: string // Workspace folder path
    folderName: string // Workspace folder display name
}

export interface CommitQuickPickItem extends vscode.QuickPickItem {
    type: "uncommitted" | "commit"
    commitInfo?: CommitInfo // Present when type === 'commit'
}

export function parseCommitLog(
    output: string,
    cwd: string,
    folderName: string,
): CommitInfo[] {
    if (!output.trim()) {
        return []
    }
    const lines = output.split("\n").filter((l) => l.trim().length > 0)
    return lines.map((line) => {
        const [hash, shortHash, subject, author, relativeDate, timestampStr] =
            line.split("\0")
        return {
            hash,
            shortHash,
            subject,
            author,
            relativeDate,
            timestamp: parseInt(timestampStr, 10),
            cwd,
            folderName,
        }
    })
}

export function buildQuickPickItems(
    commits: CommitInfo[],
    isMultiRoot: boolean,
    limit: number,
): CommitQuickPickItem[] {
    const sorted = [...commits].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)

    const items: CommitQuickPickItem[] = [
        {
            label: "$(diff) Uncommitted Changes (Staged & Unstaged)",
            type: "uncommitted",
            alwaysShow: true,
        },
    ]

    for (const commit of sorted) {
        const folderPrefix = isMultiRoot ? `[${commit.folderName}] ` : ""
        items.push({
            label: `$(git-commit) ${folderPrefix}${commit.shortHash} — ${commit.subject}`,
            description: `${commit.author}, ${commit.relativeDate}`,
            type: "commit",
            commitInfo: commit,
        })
    }

    return items
}

export function formatCommitHeader(
    commitInfo: CommitInfo,
    changeCount: number,
    fileCount: number,
    isMultiRoot: boolean,
): string {
    const folderPrefix = isMultiRoot ? `[${commitInfo.folderName}] ` : ""
    return [
        `# Git Commit: ${folderPrefix}${commitInfo.shortHash} — ${commitInfo.subject} (${commitInfo.author}, ${commitInfo.relativeDate})`,
        `# ${changeCount} changes - ${fileCount} files`,
        "#",
    ].join("\n")
}

async function getRecentCommits(
    cwd: string,
    folderName: string,
    limit: number,
): Promise<CommitInfo[]> {
    return new Promise((resolve) => {
        const args = [
            "log",
            `-n${limit}`,
            "--no-color",
            "--pretty=format:%H%x00%h%x00%s%x00%an%x00%ar%x00%ct",
        ]
        const proc = spawn("git", args, { cwd })
        let stdout = ""
        let stderr = ""

        proc.stdout.on("data", (data: Buffer) => {
            stdout += data.toString()
        })
        proc.stderr.on("data", (data: Buffer) => {
            stderr += data.toString()
        })
        proc.on("close", (code) => {
            if (code !== 0) {
                resolve([])
                return
            }
            resolve(parseCommitLog(stdout, cwd, folderName))
        })
        proc.on("error", () => {
            resolve([])
        })
    })
}

function runGitShow(
    cwd: string,
    hash: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
        const args = ["show", "--first-parent", "-U3", "--no-color", "--patch", hash]
        const proc = spawn("git", args, { cwd })
        let stdout = ""
        let stderr = ""

        proc.stdout.on("data", (data: Buffer) => {
            stdout += data.toString()
        })
        proc.stderr.on("data", (data: Buffer) => {
            stderr += data.toString()
        })
        proc.on("close", (code) => {
            resolve({ stdout, stderr, exitCode: code ?? 1 })
        })
        proc.on("error", () => {
            resolve({ stdout: "", stderr: "Failed to spawn git process", exitCode: 1 })
        })
    })
}

export function formatSection(
    section: SectionData,
    maxLinesPerFile?: number,
): { lines: string[]; text: string; fileHeaderLineIndexes: number[] } {
    const uniqueFiles = new Set(section.lines.map((l) => l.file)).size
    const addedCount = section.lines.filter((l) => l.type === "added").length
    const output: string[] = []
    const fileHeaderLineIndexes: number[] = []

    output.push(`# ── ${section.label} (${addedCount} changes - ${uniqueFiles} files) ──`)
    output.push("")

    const byFile = new Map<string, DiffLine[]>()
    for (const line of section.lines) {
        if (!byFile.has(line.file)) {
            byFile.set(line.file, [])
        }
        byFile.get(line.file)!.push(line)
    }

    const limit = maxLinesPerFile ?? Infinity

    for (const [file, fileLines] of byFile) {
        fileHeaderLineIndexes.push(output.length)
        output.push(`${file}:`)

        const cappedLines = fileLines.slice(0, limit)
        for (const dl of cappedLines) {
            if (dl.type === "added") {
                output.push(`  ${dl.line}: ${dl.content}`)
            } else {
                output.push(`  ${dl.line}  ${dl.content}`)
            }
        }
        output.push("")
    }

    return {
        lines: output,
        text: output.join("\n"),
        fileHeaderLineIndexes,
    }
}

export interface BuildDocumentOptions {
    selectionType: "uncommitted" | "commit"
    commitInfo?: CommitInfo
    allUnstaged: DiffLine[]
    allStaged: DiffLine[]
    allUntracked: DiffLine[]
    isMultiRoot: boolean
    maxLinesPerFile: number
}

export interface BuildDocumentResult {
    content: string
    collapsedFileHeaderLineIndexes: number[]
    // Backwards compatibility alias
    stagedFileHeaderLineIndexes: number[]
}

export function buildGitDiffDocumentContent(
    options: BuildDocumentOptions,
): BuildDocumentResult {
    const {
        selectionType,
        commitInfo,
        allUnstaged,
        allStaged,
        allUntracked,
        isMultiRoot,
        maxLinesPerFile,
    } = options

    const totalAdded =
        allUnstaged.filter((l) => l.type === "added").length +
        allStaged.filter((l) => l.type === "added").length +
        allUntracked.filter((l) => l.type === "added").length

    const totalFiles = new Set([
        ...allUnstaged.map((l) => l.file),
        ...allStaged.map((l) => l.file),
        ...allUntracked.map((l) => l.file),
    ]).size

    const outputLines: string[] = []
    const collapsedFileHeaderLineIndexes: number[] = []

    if (selectionType === "commit" && commitInfo) {
        outputLines.push(
            formatCommitHeader(commitInfo, totalAdded, totalFiles, isMultiRoot),
        )
    } else {
        outputLines.push("# Git Diff: Workspace Changes")
    }

    const contextLine = formatGitDiffContext(selectionType, commitInfo)
    outputLines.push(`# Context: ${contextLine}`)

    if (selectionType !== "commit") {
        outputLines.push(`# ${totalAdded} changes - ${totalFiles} files`)
        outputLines.push("#")
    }

    if (selectionType === "uncommitted") {
        if (allUnstaged.length > 0) {
            const formatted = formatSection(
                { label: "Unstaged Changes", lines: allUnstaged },
                maxLinesPerFile,
            )
            outputLines.push(...formatted.lines)
        }
        if (allStaged.length > 0) {
            const baseLine = outputLines.length
            const formatted = formatSection(
                { label: "Staged Changes", lines: allStaged },
                maxLinesPerFile,
            )
            for (const relIdx of formatted.fileHeaderLineIndexes) {
                collapsedFileHeaderLineIndexes.push(baseLine + relIdx)
            }
            outputLines.push(...formatted.lines)
        }
        if (allUntracked.length > 0) {
            const formatted = formatSection(
                { label: "Untracked Files", lines: allUntracked },
                maxLinesPerFile,
            )
            outputLines.push(...formatted.lines)
        }
    } else {
        const formatted = formatSection(
            { label: `Commit ${commitInfo?.shortHash ?? ""}`, lines: allUnstaged },
            maxLinesPerFile,
        )
        outputLines.push(...formatted.lines)
    }

    return {
        content: outputLines.join("\n"),
        collapsedFileHeaderLineIndexes,
        stagedFileHeaderLineIndexes: collapsedFileHeaderLineIndexes,
    }
}

export async function foldLineIndexes(
    editor: vscode.TextEditor,
    lineIndexes: number[],
): Promise<void> {
    if (lineIndexes.length === 0) {
        return
    }
    try {
        for (const idx of lineIndexes) {
            const pos = new vscode.Position(idx, 0)
            editor.selection = new vscode.Selection(pos, pos)
            await vscode.commands.executeCommand("editor.fold")
        }
    } catch {
        // Ignore errors
    } finally {
        // Position cursor at top of document (line 0, col 0) so VS Code does not auto-unfold the region under cursor
        const topPos = new vscode.Position(0, 0)
        editor.selection = new vscode.Selection(topPos, topPos)
    }
}

export async function showGitDiffSearchEditor(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders
    if (!workspaceFolders || workspaceFolders.length === 0) {
        showStatusBarMessage("Please open a folder first", "error")
        return
    }

    const isMultiRoot = workspaceFolders.length > 1

    const config = vscode.workspace.getConfiguration("r3blFuzzySearch")
    const limit = config.get<number>("commitHistoryLimit") ?? 10
    const maxLinesPerFile = config.get<number>("gitDiffMaxLinesPerFile") ?? 5

    const allCommits: CommitInfo[] = []
    for (const folder of workspaceFolders) {
        const cwd = folder.uri.fsPath
        const commits = await getRecentCommits(cwd, folder.name, limit)
        allCommits.push(...commits)
    }

    const items = buildQuickPickItems(allCommits, isMultiRoot, limit)

    const selection = await vscode.window.showQuickPick(items, {
        placeHolder: "Select uncommitted changes or a recent commit",
        matchOnDescription: true,
        matchOnDetail: true,
    })

    if (!selection) {
        return
    }

    let allUnstaged: DiffLine[] = []
    let allStaged: DiffLine[] = []
    let allUntracked: DiffLine[] = []
    const timestamp = formatTimestamp()

    if (selection.type === "uncommitted") {
        for (const folder of workspaceFolders) {
            const cwd = folder.uri.fsPath
            const [unstagedResult, stagedResult, untrackedFiles] = await Promise.all([
                runGitDiff(cwd, false),
                runGitDiff(cwd, true),
                getUntrackedFiles(cwd, folder.name, isMultiRoot, maxLinesPerFile),
            ])

            if (
                unstagedResult.stderr.includes("not a git repository") ||
                stagedResult.stderr.includes("not a git repository")
            ) {
                if (workspaceFolders.length === 1) {
                    vscode.window.showErrorMessage(
                        "This workspace is not a git repository",
                    )
                    return
                }
                continue
            }

            let unstaged = parseUnifiedDiff(unstagedResult.stdout)
            let staged = parseUnifiedDiff(stagedResult.stdout)

            if (isMultiRoot) {
                const prefix = folder.name
                unstaged = unstaged.map((l) => ({ ...l, file: `${prefix}/${l.file}` }))
                staged = staged.map((l) => ({ ...l, file: `${prefix}/${l.file}` }))
            }

            allUnstaged.push(...unstaged)
            allStaged.push(...staged)
            allUntracked.push(...untrackedFiles)
        }

        if (
            allUnstaged.length === 0 &&
            allStaged.length === 0 &&
            allUntracked.length === 0
        ) {
            showStatusBarMessage("No uncommitted changes", "info")
            return
        }
    } else if (selection.type === "commit" && selection.commitInfo) {
        const commit = selection.commitInfo
        const result = await runGitShow(commit.cwd, commit.hash)

        if (result.exitCode !== 0) {
            vscode.window.showErrorMessage(
                `Failed to get diff for commit ${commit.shortHash}: ${result.stderr}`,
            )
            return
        }

        let commitChanges = parseUnifiedDiff(result.stdout)

        if (commitChanges.length === 0) {
            showStatusBarMessage("No changes in this commit", "info")
            return
        }

        if (isMultiRoot) {
            const prefix = commit.folderName
            commitChanges = commitChanges.map((l) => ({
                ...l,
                file: `${prefix}/${l.file}`,
            }))
        }

        allUnstaged = commitChanges
    }

    const docResult = buildGitDiffDocumentContent({
        selectionType: selection.type,
        commitInfo: selection.commitInfo,
        allUnstaged,
        allStaged,
        allUntracked,
        isMultiRoot,
        maxLinesPerFile,
    })

    const filePath = `/tmp/git-diff-${timestamp}.code-search`
    const fileUri = vscode.Uri.file(filePath)
    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(docResult.content, "utf-8"))

    const doc = await vscode.workspace.openTextDocument(fileUri)
    const editor = await vscode.window.showTextDocument(doc, { preview: false })

    if (docResult.collapsedFileHeaderLineIndexes.length > 0) {
        await new Promise((r) => setTimeout(r, 100))
        await foldLineIndexes(editor, docResult.collapsedFileHeaderLineIndexes)
    }
}

export async function refreshGitDiffSearchEditor(): Promise<void> {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
        return
    }

    const doc = editor.document
    if (!doc.fileName.endsWith(".code-search")) {
        return
    }

    // Scan top 20 lines for # Context:
    const firstLines = doc.getText(new vscode.Range(0, 0, 20, 0)).split("\n")
    const contextHeader = firstLines.find((l) => l.startsWith("# Context:"))

    if (!contextHeader) {
        return
    }

    const contextLine = contextHeader.replace("# Context:", "").trim()
    const context = parseGitDiffContext(contextLine)

    if (!context) {
        return
    }

    const config = vscode.workspace.getConfiguration("r3blFuzzySearch")
    const maxLinesPerFile = config.get<number>("gitDiffMaxLinesPerFile") ?? 5

    let allUnstaged: DiffLine[] = []
    let allStaged: DiffLine[] = []
    let allUntracked: DiffLine[] = []
    let commitInfo: CommitInfo | undefined

    const workspaceFolders = vscode.workspace.workspaceFolders
    if (!workspaceFolders) {
        return
    }
    const isMultiRoot = workspaceFolders.length > 1

    if (context.type === "uncommitted") {
        for (const folder of workspaceFolders) {
            const cwd = folder.uri.fsPath
            const [unstagedResult, stagedResult, untrackedFiles] = await Promise.all([
                runGitDiff(cwd, false),
                runGitDiff(cwd, true),
                getUntrackedFiles(cwd, folder.name, isMultiRoot, maxLinesPerFile),
            ])

            if (
                unstagedResult.stderr.includes("not a git repository") ||
                stagedResult.stderr.includes("not a git repository")
            ) {
                continue
            }

            let unstaged = parseUnifiedDiff(unstagedResult.stdout)
            let staged = parseUnifiedDiff(stagedResult.stdout)

            if (isMultiRoot) {
                const prefix = folder.name
                unstaged = unstaged.map((l) => ({ ...l, file: `${prefix}/${l.file}` }))
                staged = staged.map((l) => ({ ...l, file: `${prefix}/${l.file}` }))
            }

            allUnstaged.push(...unstaged)
            allStaged.push(...staged)
            allUntracked.push(...untrackedFiles)
        }
    } else if (context.type === "commit") {
        const result = await runGitShow(context.cwd, context.hash)
        if (result.exitCode !== 0) {
            showStatusBarMessage(`Refresh failed: ${result.stderr}`, "error")
            return
        }

        let commitChanges = parseUnifiedDiff(result.stdout)
        if (isMultiRoot) {
            commitChanges = commitChanges.map((l) => ({
                ...l,
                file: `${context.folder}/${l.file}`,
            }))
        }
        allUnstaged = commitChanges
        commitInfo = {
            hash: context.hash,
            shortHash: context.hash.substring(0, 7),
            subject: "Refreshed Commit",
            author: "",
            relativeDate: "",
            timestamp: Date.now(),
            cwd: context.cwd,
            folderName: context.folder,
        }
    }

    const docResult = buildGitDiffDocumentContent({
        selectionType: context.type,
        commitInfo,
        allUnstaged,
        allStaged,
        allUntracked,
        isMultiRoot,
        maxLinesPerFile,
    })

    const edit = new vscode.WorkspaceEdit()
    const fullRange = new vscode.Range(
        doc.lineAt(0).range.start,
        doc.lineAt(doc.lineCount - 1).range.end,
    )
    edit.replace(doc.uri, fullRange, docResult.content)
    await vscode.workspace.applyEdit(edit)

    if (docResult.collapsedFileHeaderLineIndexes.length > 0) {
        await new Promise((r) => setTimeout(r, 100))
        await foldLineIndexes(editor, docResult.collapsedFileHeaderLineIndexes)
    }

    showStatusBarMessage("Git diff refreshed", "success")
}
