// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { showStatusBarMessage } from 'r3bl-common-code';
import { parseUnifiedDiff, DiffLine } from './gitDiffParser';

export function formatGitDiffContext(
    selectionType: 'uncommitted' | 'commit',
    commitInfo?: CommitInfo,
): string {
    if (selectionType === 'commit' && commitInfo) {
        return `commit, hash: ${commitInfo.hash}, cwd: ${commitInfo.cwd}, folder: ${commitInfo.folderName}`;
    }
    return 'uncommitted';
}

export function parseGitDiffContext(
    contextLine: string,
):
    | { type: 'uncommitted' }
    | { type: 'commit'; hash: string; cwd: string; folder: string }
    | undefined {
    if (contextLine === 'uncommitted') {
        return { type: 'uncommitted' };
    }
    if (contextLine.startsWith('commit')) {
        const parts = contextLine.split(',').map((p) => p.trim());
        const hash = parts
            .find((p) => p.startsWith('hash:'))
            ?.replace('hash:', '')
            .trim();
        const cwd = parts
            .find((p) => p.startsWith('cwd:'))
            ?.replace('cwd:', '')
            .trim();
        const folder = parts
            .find((p) => p.startsWith('folder:'))
            ?.replace('folder:', '')
            .trim();
        if (hash && cwd && folder) {
            return { type: 'commit', hash, cwd, folder };
        }
    }
    return undefined;
}

function runGitDiff(
    cwd: string,
    staged: boolean,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
        const args = staged ? ['diff', '--cached', '-U3'] : ['diff', '-U3'];
        const proc = spawn('git', args, { cwd });
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data: Buffer) => {
            stdout += data.toString();
        });
        proc.stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
        });
        proc.on('close', (code) => {
            resolve({ stdout, stderr, exitCode: code ?? 1 });
        });
        proc.on('error', () => {
            resolve({ stdout: '', stderr: 'Failed to spawn git process', exitCode: 1 });
        });
    });
}

function formatTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

interface SectionData {
    label: string;
    lines: DiffLine[];
}

export interface CommitInfo {
    hash: string; // Full SHA
    shortHash: string; // Abbreviated SHA
    subject: string; // Commit message first line
    author: string; // Author name
    relativeDate: string; // e.g. "2 days ago"
    timestamp: number; // Unix timestamp for sorting (%ct)
    cwd: string; // Workspace folder path
    folderName: string; // Workspace folder display name
}

export interface CommitQuickPickItem extends vscode.QuickPickItem {
    type: 'uncommitted' | 'commit';
    commitInfo?: CommitInfo; // Present when type === 'commit'
}

export function parseCommitLog(
    output: string,
    cwd: string,
    folderName: string,
): CommitInfo[] {
    if (!output.trim()) {
        return [];
    }
    const lines = output.split('\n').filter((l) => l.trim().length > 0);
    return lines.map((line) => {
        const [hash, shortHash, subject, author, relativeDate, timestampStr] =
            line.split('\0');
        return {
            hash,
            shortHash,
            subject,
            author,
            relativeDate,
            timestamp: parseInt(timestampStr, 10),
            cwd,
            folderName,
        };
    });
}

export function buildQuickPickItems(
    commits: CommitInfo[],
    isMultiRoot: boolean,
    limit: number,
): CommitQuickPickItem[] {
    const sorted = [...commits].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);

    const items: CommitQuickPickItem[] = [
        {
            label: '$(diff) Uncommitted Changes (Staged & Unstaged)',
            type: 'uncommitted',
            alwaysShow: true,
        },
    ];

    for (const commit of sorted) {
        const folderPrefix = isMultiRoot ? `[${commit.folderName}] ` : '';
        items.push({
            label: `$(git-commit) ${folderPrefix}${commit.shortHash} — ${commit.subject}`,
            description: `${commit.author}, ${commit.relativeDate}`,
            type: 'commit',
            commitInfo: commit,
        });
    }

    return items;
}

export function formatCommitHeader(
    commitInfo: CommitInfo,
    changeCount: number,
    fileCount: number,
    isMultiRoot: boolean,
): string {
    const folderPrefix = isMultiRoot ? `[${commitInfo.folderName}] ` : '';
    return [
        `# Git Commit: ${folderPrefix}${commitInfo.shortHash} — ${commitInfo.subject} (${commitInfo.author}, ${commitInfo.relativeDate})`,
        `# ${changeCount} changes - ${fileCount} files`,
        '#',
    ].join('\n');
}

async function getRecentCommits(
    cwd: string,
    folderName: string,
    limit: number,
): Promise<CommitInfo[]> {
    return new Promise((resolve) => {
        // %H  - Full hash
        // %h  - Abbreviated hash
        // %s  - Subject (first line of commit message)
        // %an - Author name
        // %ar - Relative date
        // %ct - Author date, UNIX timestamp
        // Using \0 as delimiter because commit subjects can contain pipes or commas.
        const args = [
            'log',
            `-n${limit}`,
            '--no-color',
            '--pretty=format:%H%x00%h%x00%s%x00%an%x00%ar%x00%ct',
        ];
        const proc = spawn('git', args, { cwd });
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data: Buffer) => {
            stdout += data.toString();
        });
        proc.stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
        });
        proc.on('close', (code) => {
            if (code !== 0) {
                // If it's not a git repo or has no commits, resolve with empty array
                resolve([]);
                return;
            }
            resolve(parseCommitLog(stdout, cwd, folderName));
        });
        proc.on('error', () => {
            resolve([]);
        });
    });
}

function runGitShow(
    cwd: string,
    hash: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
        // --first-parent ensures merge commits produce a normal unified diff (not combined format),
        // which is compatible with the existing parseUnifiedDiff() parser.
        const args = ['show', '--first-parent', '-U3', '--no-color', '--patch', hash];
        const proc = spawn('git', args, { cwd });
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data: Buffer) => {
            stdout += data.toString();
        });
        proc.stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
        });
        proc.on('close', (code) => {
            resolve({ stdout, stderr, exitCode: code ?? 1 });
        });
        proc.on('error', () => {
            resolve({ stdout: '', stderr: 'Failed to spawn git process', exitCode: 1 });
        });
    });
}

function formatSection(section: SectionData): string {
    const uniqueFiles = new Set(section.lines.map((l) => l.file)).size;
    const addedCount = section.lines.filter((l) => l.type === 'added').length;
    const output: string[] = [];

    output.push(
        `# ── ${section.label} (${addedCount} changes - ${uniqueFiles} files) ──`,
    );
    output.push('');

    // Group by file, preserving order of first appearance
    const byFile = new Map<string, DiffLine[]>();
    for (const line of section.lines) {
        if (!byFile.has(line.file)) {
            byFile.set(line.file, []);
        }
        byFile.get(line.file)!.push(line);
    }

    for (const [file, fileLines] of byFile) {
        output.push(`${file}:`);
        for (const dl of fileLines) {
            if (dl.type === 'added') {
                output.push(`  ${dl.line}: ${dl.content}`);
            } else {
                output.push(`  ${dl.line}  ${dl.content}`);
            }
        }
        output.push('');
    }

    return output.join('\n');
}

export async function showGitDiffSearchEditor(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        showStatusBarMessage('Please open a folder first', 'error');
        return;
    }

    const isMultiRoot = workspaceFolders.length > 1;

    // 1. Get the commit history limit from configuration
    const config = vscode.workspace.getConfiguration('r3blFuzzySearch');
    const limit = config.get<number>('commitHistoryLimit') ?? 10;

    // 2. Collect recent commits from all workspace folders
    const allCommits: CommitInfo[] = [];
    for (const folder of workspaceFolders) {
        const cwd = folder.uri.fsPath;
        const commits = await getRecentCommits(cwd, folder.name, limit);
        allCommits.push(...commits);
    }

    // 3. Build QuickPick items (sorts by timestamp, caps at limit)
    const items = buildQuickPickItems(allCommits, isMultiRoot, limit);

    // 4. Show QuickPick
    const selection = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select uncommitted changes or a recent commit',
        matchOnDescription: true,
        matchOnDetail: true,
    });

    if (!selection) {
        return;
    }

    let allUnstaged: DiffLine[] = [];
    let allStaged: DiffLine[] = [];
    const timestamp = formatTimestamp();

    if (selection.type === 'uncommitted') {
        // Handle uncommitted changes (existing logic)
        for (const folder of workspaceFolders) {
            const cwd = folder.uri.fsPath;
            const [unstagedResult, stagedResult] = await Promise.all([
                runGitDiff(cwd, false),
                runGitDiff(cwd, true),
            ]);

            // Check for "not a git repo" error
            if (
                unstagedResult.stderr.includes('not a git repository') ||
                stagedResult.stderr.includes('not a git repository')
            ) {
                if (workspaceFolders.length === 1) {
                    vscode.window.showErrorMessage(
                        'This workspace is not a git repository',
                    );
                    return;
                }
                continue;
            }

            let unstaged = parseUnifiedDiff(unstagedResult.stdout);
            let staged = parseUnifiedDiff(stagedResult.stdout);

            if (isMultiRoot) {
                const prefix = folder.name;
                unstaged = unstaged.map((l) => ({ ...l, file: `${prefix}/${l.file}` }));
                staged = staged.map((l) => ({ ...l, file: `${prefix}/${l.file}` }));
            }

            allUnstaged.push(...unstaged);
            allStaged.push(...staged);
        }

        if (allUnstaged.length === 0 && allStaged.length === 0) {
            showStatusBarMessage('No uncommitted changes', 'info');
            return;
        }
    } else if (selection.type === 'commit' && selection.commitInfo) {
        // Handle a specific commit
        const commit = selection.commitInfo;
        const result = await runGitShow(commit.cwd, commit.hash);

        if (result.exitCode !== 0) {
            vscode.window.showErrorMessage(
                `Failed to get diff for commit ${commit.shortHash}: ${result.stderr}`,
            );
            return;
        }

        let commitChanges = parseUnifiedDiff(result.stdout);

        if (commitChanges.length === 0) {
            showStatusBarMessage('No changes in this commit', 'info');
            return;
        }

        if (isMultiRoot) {
            const prefix = commit.folderName;
            commitChanges = commitChanges.map((l) => ({
                ...l,
                file: `${prefix}/${l.file}`,
            }));
        }

        allUnstaged = commitChanges; // We'll put commit changes in the "unstaged" bucket for formatting
    }

    // 6. Build document content
    const totalAdded =
        allUnstaged.filter((l) => l.type === 'added').length +
        allStaged.filter((l) => l.type === 'added').length;
    const totalFiles = new Set([
        ...allUnstaged.map((l) => l.file),
        ...allStaged.map((l) => l.file),
    ]).size;

    const output: string[] = [];
    if (selection.type === 'commit' && selection.commitInfo) {
        output.push(
            formatCommitHeader(selection.commitInfo, totalAdded, totalFiles, isMultiRoot),
        );
    } else {
        output.push('# Git Diff: Workspace Changes');
    }

    const contextLine = formatGitDiffContext(selection.type, selection.commitInfo);
    output.push(`# Context: ${contextLine}`);

    if (selection.type !== 'commit') {
        output.push(`# ${totalAdded} changes - ${totalFiles} files`);
        output.push('#');
    }

    if (selection.type === 'uncommitted') {
        if (allUnstaged.length > 0) {
            output.push(formatSection({ label: 'Unstaged Changes', lines: allUnstaged }));
        }
        if (allStaged.length > 0) {
            output.push(formatSection({ label: 'Staged Changes', lines: allStaged }));
        }
    } else {
        // For commits, we just show one section
        output.push(
            formatSection({
                label: `Commit ${selection.commitInfo?.shortHash}`,
                lines: allUnstaged,
            }),
        );
    }

    const content = output.join('\n');

    // 7. Write to timestamped file in /tmp/
    const filePath = `/tmp/git-diff-${timestamp}.code-search`;
    const fileUri = vscode.Uri.file(filePath);
    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf-8'));

    const doc = await vscode.workspace.openTextDocument(fileUri);
    await vscode.window.showTextDocument(doc, { preview: false });
}

export async function refreshGitDiffSearchEditor(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    const doc = editor.document;
    if (!doc.fileName.endsWith('.code-search')) {
        return;
    }

    const firstLines = doc.getText(new vscode.Range(0, 0, 5, 0)).split('\n');
    const contextHeader = firstLines.find((l) => l.startsWith('# Context:'));

    if (!contextHeader) {
        return;
    }

    const contextLine = contextHeader.replace('# Context:', '').trim();
    const context = parseGitDiffContext(contextLine);

    if (!context) {
        return;
    }

    let allUnstaged: DiffLine[] = [];
    let allStaged: DiffLine[] = [];
    let headerLines: string[] = [];
    let isCommit = false;

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return;
    }
    const isMultiRoot = workspaceFolders.length > 1;

    if (context.type === 'uncommitted') {
        for (const folder of workspaceFolders) {
            const cwd = folder.uri.fsPath;
            const [unstagedResult, stagedResult] = await Promise.all([
                runGitDiff(cwd, false),
                runGitDiff(cwd, true),
            ]);

            if (
                unstagedResult.stderr.includes('not a git repository') ||
                stagedResult.stderr.includes('not a git repository')
            ) {
                continue;
            }

            let unstaged = parseUnifiedDiff(unstagedResult.stdout);
            let staged = parseUnifiedDiff(stagedResult.stdout);

            if (isMultiRoot) {
                const prefix = folder.name;
                unstaged = unstaged.map((l) => ({ ...l, file: `${prefix}/${l.file}` }));
                staged = staged.map((l) => ({ ...l, file: `${prefix}/${l.file}` }));
            }

            allUnstaged.push(...unstaged);
            allStaged.push(...staged);
        }

        const totalAdded =
            allUnstaged.filter((l) => l.type === 'added').length +
            allStaged.filter((l) => l.type === 'added').length;
        const totalFiles = new Set([
            ...allUnstaged.map((l) => l.file),
            ...allStaged.map((l) => l.file),
        ]).size;

        headerLines.push('# Git Diff: Workspace Changes');
        headerLines.push(`# Context: ${contextLine}`);
        headerLines.push(`# ${totalAdded} changes - ${totalFiles} files`);
        headerLines.push('#');
    } else if (context.type === 'commit') {
        isCommit = true;

        const result = await runGitShow(context.cwd, context.hash);
        if (result.exitCode !== 0) {
            showStatusBarMessage(`Refresh failed: ${result.stderr}`, 'error');
            return;
        }

        let commitChanges = parseUnifiedDiff(result.stdout);
        if (isMultiRoot) {
            commitChanges = commitChanges.map((l) => ({
                ...l,
                file: `${context.folder}/${l.file}`,
            }));
        }
        allUnstaged = commitChanges;

        // We need some info for the header, let's try to reconstruct it or just use simple header
        headerLines.push(`# Git Commit: ${context.hash.substring(0, 7)} (Refreshed)`);
        headerLines.push(`# Context: ${contextLine}`);
        headerLines.push(
            `# ${allUnstaged.filter((l) => l.type === 'added').length} changes - ${new Set(allUnstaged.map((l) => l.file)).size} files`,
        );
        headerLines.push('#');
    }

    const output: string[] = [...headerLines];

    if (!isCommit) {
        if (allUnstaged.length > 0) {
            output.push(formatSection({ label: 'Unstaged Changes', lines: allUnstaged }));
        }
        if (allStaged.length > 0) {
            output.push(formatSection({ label: 'Staged Changes', lines: allStaged }));
        }
    } else {
        output.push(
            formatSection({
                label: `Commit Changes`,
                lines: allUnstaged,
            }),
        );
    }

    const newContent = output.join('\n');

    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
        doc.lineAt(0).range.start,
        doc.lineAt(doc.lineCount - 1).range.end,
    );
    edit.replace(doc.uri, fullRange, newContent);
    await vscode.workspace.applyEdit(edit);
    showStatusBarMessage('Git diff refreshed', 'success');
}
