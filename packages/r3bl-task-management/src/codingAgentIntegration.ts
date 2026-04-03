// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { showStatusBarMessage } from 'r3bl-common-code';
import * as vscode from 'vscode';

const AGENT_COMMANDS_DIRS = ['.agent/commands', '.gemini/commands', '.claude/commands'];
const COMMAND_FILE_NAME = 'r3bl-task.md';

/**
 * Finds all existing agent commands directories from the supported list.
 */
function findAllExistingAgentCommandsDirs(): string[] {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
        return [];
    }

    return AGENT_COMMANDS_DIRS.filter((dir) => {
        const fullPath = path.join(workspaceRoot, dir);
        return fs.existsSync(fullPath);
    });
}

/**
 * Checks if the Coding Agent integration is installed (r3bl-task.md exists in any of the supported directories)
 */
export function isCodingAgentIntegrationInstalled(): boolean {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
        return false;
    }

    const existingDirs = findAllExistingAgentCommandsDirs();
    if (existingDirs.length === 0) {
        return false;
    }

    // Check if the command file exists in any of the existing directories
    return existingDirs.some((dir) => {
        const commandFilePath = path.join(workspaceRoot, dir, COMMAND_FILE_NAME);
        return fs.existsSync(commandFilePath);
    });
}

/**
 * Installs the Coding Agent integration by copying the template to the selected/existing directory
 */
export async function installCodingAgentIntegration(
    context: vscode.ExtensionContext,
): Promise<boolean> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
        showStatusBarMessage('Cannot install: No workspace folder open', 'error');
        return false;
    }

    try {
        // Get template path from extension
        const templatePath = path.join(
            context.extensionPath,
            'templates',
            'r3bl-task-command.md',
        );

        if (!fs.existsSync(templatePath)) {
            showStatusBarMessage('Cannot install: Template file not found', 'error');
            return false;
        }

        const existingDirs = findAllExistingAgentCommandsDirs();
        let targetDir: string | undefined;

        if (existingDirs.length === 1) {
            // No ambiguity: exactly one exists
            targetDir = existingDirs[0];
        } else {
            // Ambiguity: either none exist or multiple exist
            const options: vscode.QuickPickItem[] =
                existingDirs.length > 1
                    ? existingDirs.map((dir) => ({
                          label: dir,
                          description: 'Existing Coding Agent directory',
                      }))
                    : [
                          {
                              label: '.agent/commands',
                              description:
                                  'Standard Coding Agent directory (recommended)',
                          },
                          {
                              label: '.gemini/commands',
                              description: 'Gemini CLI specific directory',
                          },
                          {
                              label: '.claude/commands',
                              description: 'Claude Code specific directory',
                          },
                      ];

            const selected = await vscode.window.showQuickPick(options, {
                title:
                    existingDirs.length > 1
                        ? 'Multiple Coding Agent Directories Found'
                        : 'Choose Coding Agent Directory',
                placeHolder:
                    existingDirs.length > 1
                        ? 'Select which directory to update'
                        : 'Select the directory to install the /r3bl-task command',
            });

            if (!selected) {
                return false;
            }

            targetDir = selected.label;
        }

        // Create directory if it doesn't exist
        const fullTargetDir = path.join(workspaceRoot, targetDir);
        if (!fs.existsSync(fullTargetDir)) {
            fs.mkdirSync(fullTargetDir, { recursive: true });

            // Show info message about directory creation (don't await so it's not blocking)
            const learnMore = 'Learn More';
            let message = `Created ${targetDir} directory for Coding Agent custom commands`;
            let url =
                'https://github.com/r3bl-org/r3bl-open-source/tree/main/r3bl-vscode-extensions';

            if (targetDir.includes('.claude')) {
                url = 'https://code.claude.com/docs/en/slash-commands';
            } else if (targetDir.includes('.gemini')) {
                url = 'https://github.com/google/gemini-cli';
            }

            vscode.window.showInformationMessage(message, learnMore).then((result) => {
                if (result === learnMore) {
                    vscode.env.openExternal(vscode.Uri.parse(url));
                }
            });
        }

        // Copy template to targetDir/r3bl-task.md
        const targetPath = path.join(fullTargetDir, COMMAND_FILE_NAME);
        fs.copyFileSync(templatePath, targetPath);

        // Show success message
        const openFile = 'Open Command File';
        const result = await vscode.window.showInformationMessage(
            `Coding Agent integration installed! Use /r3bl-task in your Coding Agent to manage task files.`,
            openFile,
        );

        if (result === openFile) {
            const doc = await vscode.workspace.openTextDocument(targetPath);
            await vscode.window.showTextDocument(doc);
        }

        return true;
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to install Coding Agent integration: ${error}`,
        );
        return false;
    }
}

/**
 * Prompts the user to install Coding Agent integration (non-intrusive)
 */
export async function promptToInstallCodingAgentIntegration(
    context: vscode.ExtensionContext,
): Promise<void> {
    // Check if already installed
    if (isCodingAgentIntegrationInstalled()) {
        return;
    }

    // Check if user has dismissed this prompt before
    const dismissedKey = 'r3bl-task-management.codingAgentPromptDismissed';
    const dismissed = context.globalState.get<boolean>(dismissedKey, false);
    if (dismissed) {
        return;
    }

    // Show prompt
    const install = 'Install';
    const notNow = 'Not Now';
    const dontAskAgain = "Don't Ask Again";

    const result = await vscode.window.showInformationMessage(
        'Enable Coding Agent integration? Install /r3bl-task command to manage task files from Coding Agents.',
        install,
        notNow,
        dontAskAgain,
    );

    if (result === install) {
        await installCodingAgentIntegration(context);
    } else if (result === dontAskAgain) {
        await context.globalState.update(dismissedKey, true);
    }
}

/**
 * Calculates SHA256 checksum of a file
 */
function getFileSHA256(filePath: string): string | undefined {
    try {
        const content = fs.readFileSync(filePath);
        return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
        return undefined;
    }
}

/**
 * Checks if the installed command needs upgrade and automatically upgrades it
 * Uses SHA256 checksum comparison to detect changes
 * Called on extension activation
 * Upgrades the command in ALL existing directories found
 */
export async function checkAndUpgradeCodingAgentCommand(
    context: vscode.ExtensionContext,
): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
        return;
    }

    const existingDirs = findAllExistingAgentCommandsDirs();
    if (existingDirs.length === 0) {
        return;
    }

    try {
        // Get template path
        const templatePath = path.join(
            context.extensionPath,
            'templates',
            'r3bl-task-command.md',
        );

        if (!fs.existsSync(templatePath)) {
            return;
        }

        const templateSHA = getFileSHA256(templatePath);
        if (!templateSHA) {
            return;
        }

        let upgradedAny = false;

        for (const dir of existingDirs) {
            const installedPath = path.join(workspaceRoot, dir, COMMAND_FILE_NAME);
            if (!fs.existsSync(installedPath)) {
                continue;
            }

            const installedSHA = getFileSHA256(installedPath);
            if (installedSHA && templateSHA !== installedSHA) {
                fs.copyFileSync(templatePath, installedPath);
                upgradedAny = true;
            }
        }

        if (upgradedAny) {
            // Show FYI notification
            showStatusBarMessage('R3BL Task command updated', 'success');
        }
    } catch (error) {
        // Silent fail - don't bother user with upgrade errors
        console.error('Failed to upgrade Coding Agent command:', error);
    }
}

/**
 * Gets the workspace root path
 */
function getWorkspaceRoot(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return undefined;
    }
    return workspaceFolders[0].uri.fsPath;
}
