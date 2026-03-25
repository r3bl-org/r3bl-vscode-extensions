// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { showStatusBarMessage } from 'r3bl-common-code';
import { parseUnifiedDiff, DiffLine } from './gitDiffParser';

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
    let allUnstaged: DiffLine[] = [];
    let allStaged: DiffLine[] = [];

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
                vscode.window.showErrorMessage('This workspace is not a git repository');
                return;
            }
            // In multi-root, skip non-git folders silently
            continue;
        }

        let unstaged = parseUnifiedDiff(unstagedResult.stdout);
        let staged = parseUnifiedDiff(stagedResult.stdout);

        // Prefix file paths in multi-root workspaces
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

    // Build the full document content
    const totalAdded =
        allUnstaged.filter((l) => l.type === 'added').length +
        allStaged.filter((l) => l.type === 'added').length;
    const totalFiles = new Set([
        ...allUnstaged.map((l) => l.file),
        ...allStaged.map((l) => l.file),
    ]).size;

    const output: string[] = [];
    output.push('# Git Diff: Workspace Changes');
    output.push(`# ${totalAdded} changes - ${totalFiles} files`);
    output.push('#');

    if (allUnstaged.length > 0) {
        output.push(formatSection({ label: 'Unstaged Changes', lines: allUnstaged }));
    }

    if (allStaged.length > 0) {
        output.push(formatSection({ label: 'Staged Changes', lines: allStaged }));
    }

    const content = output.join('\n');

    // Write to timestamped file in /tmp/
    const timestamp = formatTimestamp();
    const filePath = `/tmp/git-diff-${timestamp}.code-search`;
    const fileUri = vscode.Uri.file(filePath);
    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf-8'));

    const doc = await vscode.workspace.openTextDocument(fileUri);
    await vscode.window.showTextDocument(doc, { preview: false });
}
