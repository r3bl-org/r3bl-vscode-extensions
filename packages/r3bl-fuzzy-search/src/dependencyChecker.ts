// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from 'vscode';
import { spawn } from 'child_process';

async function checkCommand(command: string): Promise<boolean> {
    return new Promise((resolve) => {
        const proc = spawn('which', [command]);
        proc.on('close', (code) => {
            resolve(code === 0);
        });
        proc.on('error', () => {
            resolve(false);
        });
    });
}

export async function checkDependencies(): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('r3blFuzzySearch');
    const rgPath = config.get<string>('ripgrepPath', 'rg');
    const fzfPath = config.get<string>('fzfPath', 'fzf');

    const [rgInstalled, fzfInstalled] = await Promise.all([
        checkCommand(rgPath),
        checkCommand(fzfPath),
    ]);

    if (!rgInstalled) {
        vscode.window
            .showErrorMessage(
                'ripgrep (rg) is not installed. Please install it:\n\n' +
                    'macOS: brew install ripgrep\n' +
                    'Linux: sudo apt install ripgrep (Debian/Ubuntu)\n' +
                    '       sudo dnf install ripgrep (Fedora)\n\n' +
                    'https://github.com/BurntSushi/ripgrep#installation',
                'Open Installation Guide',
            )
            .then((choice) => {
                if (choice) {
                    vscode.env.openExternal(
                        vscode.Uri.parse(
                            'https://github.com/BurntSushi/ripgrep#installation',
                        ),
                    );
                }
            });
        return false;
    }

    if (!fzfInstalled) {
        vscode.window
            .showErrorMessage(
                'fzf is not installed. Please install it:\n\n' +
                    'macOS: brew install fzf\n' +
                    'Linux: sudo apt install fzf (Debian/Ubuntu)\n' +
                    '       sudo dnf install fzf (Fedora)\n\n' +
                    'https://github.com/junegunn/fzf#installation',
                'Open Installation Guide',
            )
            .then((choice) => {
                if (choice) {
                    vscode.env.openExternal(
                        vscode.Uri.parse('https://github.com/junegunn/fzf#installation'),
                    );
                }
            });
        return false;
    }

    return true;
}

export async function checkGitDependency(): Promise<boolean> {
    const gitInstalled = await checkCommand('git');

    if (!gitInstalled) {
        vscode.window
            .showErrorMessage(
                'git is not installed or not on PATH. Please install git.',
                'Open Installation Guide',
            )
            .then((choice) => {
                if (choice) {
                    vscode.env.openExternal(
                        vscode.Uri.parse('https://git-scm.com/downloads'),
                    );
                }
            });
        return false;
    }

    return true;
}
