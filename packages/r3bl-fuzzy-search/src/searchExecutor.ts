// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { SearchInput, SearchResult, ProcessConfig } from './types';
import { parseResults } from './resultParser';

async function executePipeline(
    first: ProcessConfig,
    second: ProcessConfig,
    resultLimit: number,
    cwd: string,
): Promise<string> {
    return new Promise((resolve, reject) => {
        let isResolved = false;

        const rg = spawn(first.command, first.args, { cwd });
        const fzf = spawn(second.command, second.args, { cwd });

        let output = '';
        let lineCount = 0;
        let limitReached = false;

        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
            if (!isResolved) {
                rg.kill();
                fzf.kill();
                reject(
                    new Error(
                        'Search timed out after 30 seconds. Try narrowing your search.',
                    ),
                );
            }
        }, 30000);

        // Pipe rg stdout to fzf stdin
        rg.stdout.pipe(fzf.stdin);

        // Handle pipe errors
        rg.stdout.on('error', err => {
            console.error('rg stdout pipe error:', err);
        });

        // Collect fzf output
        fzf.stdout.on('data', data => {
            const chunk = data.toString();
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.trim() && lineCount < resultLimit) {
                    output += line + '\n';
                    lineCount++;
                } else if (lineCount >= resultLimit) {
                    limitReached = true;
                    break;
                }
            }

            if (limitReached) {
                rg.kill();
                fzf.kill();
            }
        });

        let limitWasReached = false;
        let rgErrorOutput = '';
        let fzfErrorOutput = '';

        rg.stderr.on('data', data => {
            const err = data.toString();
            rgErrorOutput += err;
            console.error('[R3BL Fuzzy Search] rg stderr:', err);
        });

        fzf.stderr.on('data', data => {
            const err = data.toString();
            fzfErrorOutput += err;
            console.error('[R3BL Fuzzy Search] fzf stderr:', err);
        });

        const cleanup = () => {
            clearTimeout(timeout);
            isResolved = true;
        };

        fzf.on('close', code => {
            cleanup();
            // fzf exit codes: 0 = match, 1 = no match, 2 = error, 130 = interrupted
            if (code === 0 || code === 1 || code === null) {
                limitWasReached = limitReached;
                resolve(output);
            } else {
                const errorMsg =
                    fzfErrorOutput || rgErrorOutput || `fzf exited with code ${code}`;
                reject(new Error(errorMsg));
            }
        });

        rg.on('error', err => {
            cleanup();
            reject(new Error(`ripgrep error: ${err.message}`));
        });

        fzf.on('error', err => {
            cleanup();
            reject(new Error(`fzf error: ${err.message}`));
        });
    });
}

export async function executeSearch(
    input: SearchInput,
    workspaceRoot: string,
): Promise<SearchResult[]> {
    const config = vscode.workspace.getConfiguration('r3blFuzzySearch');
    const rgPath = config.get<string>('ripgrepPath', 'rg');
    const fzfPath = config.get<string>('fzfPath', 'fzf');
    const resultLimit = config.get<number>('resultLimit', 100);

    // Build ripgrep arguments
    const rgArgs = [
        '--line-number',
        '--color=always',
        '--no-heading',
        '--no-messages', // Suppress error messages
        '--max-count',
        '50', // Limit matches per file
        '--max-filesize',
        '1M', // Skip large files
    ];

    // Add --no-ignore flag if user wants to ignore .gitignore
    if (!input.respectGitignore) {
        rgArgs.push('--no-ignore');
    }

    // Add exclude patterns
    const excludes = input.excludePatterns
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

    for (const exclude of excludes) {
        rgArgs.push('--glob', `!${exclude}`);
    }

    // Search for any non-empty line (rg will output all content, limited by max-count per file)
    // fzf will then do the fuzzy filtering
    rgArgs.push('.', '.');

    // Build fzf arguments
    const fzfArgs = [
        '--ansi',
        '--filter',
        input.query,
        '--delimiter',
        ':',
        '-i', // Case-insensitive matching
        // Removed --no-sort to allow fzf to rank results by match quality
    ];

    // Log the commands for debugging
    console.log('[R3BL Fuzzy Search] Executing search:', {
        rg: `${rgPath} ${rgArgs.join(' ')}`,
        fzf: `${fzfPath} ${fzfArgs.join(' ')}`,
        cwd: workspaceRoot,
    });

    // Execute pipeline: rg | fzf (both run from workspaceRoot)
    const results = await executePipeline(
        { command: rgPath, args: rgArgs },
        { command: fzfPath, args: fzfArgs },
        resultLimit,
        workspaceRoot,
    );

    console.log(
        '[R3BL Fuzzy Search] Search completed, found',
        results.split('\n').filter(l => l.trim()).length,
        'lines',
    );

    return parseResults(results, workspaceRoot);
}
