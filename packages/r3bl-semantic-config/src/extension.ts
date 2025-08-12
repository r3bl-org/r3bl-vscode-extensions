/*
 *   Copyright (c) 2025 Nazmul Idris
 *   All rights reserved.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

import * as vscode from 'vscode';

const SEMANTIC_CONFIG = {
    "editor.semanticHighlighting.enabled": true,
    "editor.tokenColorCustomizations": {
        "comments": "#9c8cb2",
        "textMateRules": [
            {
                "scope": [
                    "comment",
                    "punctuation.definition.comment"
                ],
                "settings": {
                    "fontStyle": ""
                }
            }
        ]
    },
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
            "comment": "#8B81A7",
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
        for (const [key, value] of Object.entries(SEMANTIC_CONFIG)) {
            await config.update(key, value, vscode.ConfigurationTarget.Global);
        }
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

export function deactivate() {}
