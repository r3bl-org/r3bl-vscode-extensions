// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { StatusBarMessage, StatusBarMessageType } from '@r3bl/shared';

const CLAUDE_COMMANDS_DIR = '.claude/commands';
const COMMAND_FILE_NAME = 'r3bl-task.md';

/**
 * Checks if the Claude Code integration is installed (r3bl-task.md exists in .claude/commands/)
 */
export function isClaudeCodeIntegrationInstalled(): boolean {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return false;
  }

  const commandFilePath = path.join(workspaceRoot, CLAUDE_COMMANDS_DIR, COMMAND_FILE_NAME);
  return fs.existsSync(commandFilePath);
}

/**
 * Installs the Claude Code integration by copying the template to .claude/commands/
 */
export async function installClaudeCodeIntegration(
  context: vscode.ExtensionContext
): Promise<boolean> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    StatusBarMessage.show('Cannot install: No workspace folder open', StatusBarMessageType.Error);
    return false;
  }

  try {
    // Get template path from extension
    const templatePath = path.join(
      context.extensionPath,
      'templates',
      'r3bl-task-command.md'
    );

    if (!fs.existsSync(templatePath)) {
      StatusBarMessage.show('Cannot install: Template file not found', StatusBarMessageType.Error);
      return false;
    }

    // Create .claude/commands directory if it doesn't exist
    const claudeCommandsDir = path.join(workspaceRoot, CLAUDE_COMMANDS_DIR);
    if (!fs.existsSync(claudeCommandsDir)) {
      fs.mkdirSync(claudeCommandsDir, { recursive: true });

      // Show info message about .claude directory
      const learnMore = 'Learn More';
      const result = await vscode.window.showInformationMessage(
        'Created .claude/commands directory for Claude Code custom commands',
        learnMore
      );
      if (result === learnMore) {
        vscode.env.openExternal(
          vscode.Uri.parse('https://code.claude.com/docs/en/slash-commands')
        );
      }
    }

    // Copy template to .claude/commands/r3bl-task.md
    const targetPath = path.join(claudeCommandsDir, COMMAND_FILE_NAME);
    fs.copyFileSync(templatePath, targetPath);

    // Show success message
    const openFile = 'Open Command File';
    const result = await vscode.window.showInformationMessage(
      'Claude Code integration installed! Use /r3bl-task in Claude Code to manage task files.',
      openFile
    );

    if (result === openFile) {
      const doc = await vscode.workspace.openTextDocument(targetPath);
      await vscode.window.showTextDocument(doc);
    }

    return true;
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to install Claude Code integration: ${error}`
    );
    return false;
  }
}

/**
 * Prompts the user to install Claude Code integration (non-intrusive)
 */
export async function promptToInstallClaudeCodeIntegration(
  context: vscode.ExtensionContext
): Promise<void> {
  // Check if already installed
  if (isClaudeCodeIntegrationInstalled()) {
    return;
  }

  // Check if user has dismissed this prompt before
  const dismissedKey = 'r3bl-task-management.claudeCodePromptDismissed';
  const dismissed = context.globalState.get<boolean>(dismissedKey, false);
  if (dismissed) {
    return;
  }

  // Show prompt
  const install = 'Install';
  const notNow = 'Not Now';
  const dontAskAgain = "Don't Ask Again";

  const result = await vscode.window.showInformationMessage(
    'Enable Claude Code integration? Install /r3bl-task command to manage task files from Claude Code.',
    install,
    notNow,
    dontAskAgain
  );

  if (result === install) {
    await installClaudeCodeIntegration(context);
  } else if (result === dontAskAgain) {
    await context.globalState.update(dismissedKey, true);
  }
  // If 'Not Now', do nothing (will prompt again next time)
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
 */
export async function checkAndUpgradeClaudeCommand(
  context: vscode.ExtensionContext
): Promise<void> {
  // Only check if the command file exists
  if (!isClaudeCodeIntegrationInstalled()) {
    return;
  }

  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return;
  }

  try {
    // Get template path
    const templatePath = path.join(
      context.extensionPath,
      'templates',
      'r3bl-task-command.md'
    );

    if (!fs.existsSync(templatePath)) {
      return;
    }

    const installedPath = path.join(workspaceRoot, CLAUDE_COMMANDS_DIR, COMMAND_FILE_NAME);

    // Compare checksums
    const templateSHA = getFileSHA256(templatePath);
    const installedSHA = getFileSHA256(installedPath);

    if (!templateSHA || !installedSHA) {
      return; // Can't compare, skip upgrade
    }

    // If checksums differ, upgrade
    if (templateSHA !== installedSHA) {
      fs.copyFileSync(templatePath, installedPath);

      // Show FYI notification
      StatusBarMessage.show(
        'R3BL Task command updated',
        StatusBarMessageType.Info
      );
    }
  } catch (error) {
    // Silent fail - don't bother user with upgrade errors
    console.error('Failed to upgrade Claude Code command:', error);
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
