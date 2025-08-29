// Copyright (c) 2025 R3BL LLC. Licensed under MIT License.

import * as vscode from 'vscode';
import * as fs from 'fs/promises';

const SEMANTIC_CONFIG = {
    "editor.semanticHighlighting.enabled": true,
    "editor.semanticTokenColorCustomizations": {
        "rules": {
            "function": {
                "foreground": "#4B8CDC",
            },
            "method": {
                "foreground": "#4B8CDC",
            },
            "unresolvedReference": {
                "foreground": "#ff6edb",
                "fontStyle": "strikethrough"
            },
            "*.deprecated": {
                "fontStyle": "strikethrough"
            },
            "namespace": {
                "foreground": "#7b939d",
            },
            "method.static": "#4B8CDC",
            "function.static": "#4B8CDC",
            "macro": "#4B8CDC",
            "struct": "#DDE86E",
            "enum": "#FCB141",
            "enumMember": {
                "foreground": "#FFCE66",
            },
            "*.reference": {
                "fontStyle": "italic"
            },
            "*.mutable": {
                "fontStyle": "bold"
            },
            "variable.mutable": {
                "fontStyle": "bold italic"
            },
            "property": "#ad83da",
            "variable": "#E192EF",
            "parameter": "#7c86f4",
            "selfTypeKeyword": "#ce55b7",
            "selfKeyword": "#ce55b7",
            "lifetime": "#c56db599",
            "attributeBracket": "#2469ae",
            "angle": "#2469ae",
            "escapeSequence": "#2d78c2",
            "formatSpecifier": "#2d78c2",
            "typeAlias": "#ecc68e",
            "operator": {
                "fontStyle": "bold",
                "foreground": "#4d6a9f"
            },
            "operator.unsafe": "#e02b9d",
            "function.unsafe": "#e02b9d",
            "method.unsafe": "#e02b9d",
            "keyword": {
                "foreground": "#a8709e",
                "fontStyle": "italic bold",
            },
            "*.controlFlow": {
                "fontStyle": "bold",
                "foreground": "#d14178"
            },
            "*.static": {
                "fontStyle": "bold",
                "foreground": "#6665c7"
            },
            "constParameter": {
                "fontStyle": "bold",
                "foreground": "#6665c7"
            },
            "*.constant": {
                "fontStyle": "bold",
                "foreground": "#c465c7"
            },
            "*.trait": "#d1de73"
        }
    }
};

export function activate(context: vscode.ExtensionContext) {
    // Check if R3BL theme is active and auto-apply settings
    const currentTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme');
    if (currentTheme === 'R3BL Theme') {
        applySemanticConfig();
    }

    // Command to enable R3BL semantic highlighting
    const enableCommand = vscode.commands.registerCommand('r3bl-semantic-config.enable', () => {
        applySemanticConfig();
        vscode.window.showInformationMessage('R3BL Semantic Highlighting enabled!');
    });

    // Command to disable R3BL semantic highlighting
    const disableCommand = vscode.commands.registerCommand('r3bl-semantic-config.disable', () => {
        removeSemanticConfig();
        vscode.window.showInformationMessage('R3BL Semantic Highlighting disabled!');
    });

    // Watch for theme changes
    const themeWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('workbench.colorTheme')) {
            const newTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme');
            if (newTheme === 'R3BL Theme') {
                // Ask user if they want to apply semantic highlighting
                vscode.window.showInformationMessage(
                    'R3BL Theme detected! Apply enhanced semantic highlighting?',
                    'Yes', 'No'
                ).then(selection => {
                    if (selection === 'Yes') {
                        applySemanticConfig();
                    }
                });
            }
        }
    });

    context.subscriptions.push(enableCommand, disableCommand, themeWatcher);
}

async function applySemanticConfig() {
    const config = vscode.workspace.getConfiguration();

    try {
        // First clean existing token customizations to avoid pollution
        await config.update('editor.tokenColorCustomizations', undefined, vscode.ConfigurationTarget.Global);
        await config.update('editor.semanticTokenColorCustomizations', undefined, vscode.ConfigurationTarget.Global);

        // Then apply fresh configuration
        for (const [key, value] of Object.entries(SEMANTIC_CONFIG)) {
            await config.update(key, value, vscode.ConfigurationTarget.Global);
        }
        
        // Check for duplicate settings after successful application
        await checkForDuplicateSettings();
        
        vscode.window.showInformationMessage('R3BL semantic highlighting applied successfully!');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to apply semantic config: ${error}`);
    }
}

async function removeSemanticConfig() {
    const config = vscode.workspace.getConfiguration();

    try {
        // Reset to undefined (removes the setting)
        for (const key of Object.keys(SEMANTIC_CONFIG)) {
            await config.update(key, undefined, vscode.ConfigurationTarget.Global);
        }
        vscode.window.showInformationMessage('R3BL semantic highlighting removed successfully!');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to remove semantic config: ${error}`);
    }
}

async function checkForDuplicateSettings() {
    try {
        const settingsPath = getSettingsPath();
        const settingsContent = await fs.readFile(settingsPath, 'utf8');
        
        // Count occurrences of "editor.semanticHighlighting.enabled"
        const matches = settingsContent.match(/"editor\.semanticHighlighting\.enabled"/g);
        const count = matches ? matches.length : 0;
        
        if (count > 1) {
            const message = `Multiple 'editor.semanticHighlighting.enabled' entries detected in settings.json (${count} found). This can happen with language-specific overrides and may cause conflicts. Please consolidate to a single entry.`;
            
            const action = await vscode.window.showWarningMessage(
                message,
                'Open Settings',
                'Ignore'
            );
            
            if (action === 'Open Settings') {
                await vscode.commands.executeCommand('workbench.action.openSettingsJson');
            }
        }
    } catch (error) {
        // Show error in VS Code dialog to understand what's failing
        vscode.window.showErrorMessage(`Failed to check for duplicate settings: ${error}`);
        console.warn('Failed to check for duplicate settings:', error);
    }
}

function getSettingsPath(): string {
    const isWindows = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    const isInsiders = vscode.env.appName.includes('Insiders');
    
    if (isWindows) {
        const appFolder = isInsiders ? 'Code - Insiders' : 'Code';
        return `${process.env.APPDATA}/${appFolder}/User/settings.json`;
    } else if (isMac) {
        const appFolder = isInsiders ? 'Code - Insiders' : 'Code';
        return `${process.env.HOME}/Library/Application Support/${appFolder}/User/settings.json`;
    } else {
        const appFolder = isInsiders ? 'Code - Insiders' : 'Code';
        return `${process.env.HOME}/.config/${appFolder}/User/settings.json`;
    }
}

export function deactivate() {}
