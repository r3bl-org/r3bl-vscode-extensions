// Copyright (c) 2025 R3BL LLC. Licensed under MIT License.

import * as vscode from 'vscode';
import { Copyright } from './copyright/copyright';
import { Apache2 } from './copyright/licenses/apache2';
import { Apache2OneLine } from './copyright/licenses/apache2-one-line';
import { Gpl } from './copyright/licenses/gpl3';
import { Mit } from './copyright/licenses/mit';
import { Proprietary } from './copyright/licenses/proprietary';

function getConfiguration(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration('copyrighter');
}

export const configuredLanguages = new Set([
  // 'sql',
  'c',
  'cpp',
  'csharp',
  'css',
  'go',
  'java',
  'javascript',
  'objective-c',
  'rust',
  'scss',
  'swift',
  'typescript',
  'typescriptreact',
  'vue'
]);

export function getAuthor(): string {
  return getConfiguration().get('author') || '';
}

export function getCopyright(): Copyright {
  const selectedLicense = getConfiguration().get('license');

  if (selectedLicense === 'Apache2') {
    return new Apache2();
  } else if (selectedLicense === 'Apache2OneLine') {
    return new Apache2OneLine();
  } else if (selectedLicense === 'MIT') {
    return new Mit();
  } else if (selectedLicense === 'GPL3') {
    return new Gpl();
  } else if (selectedLicense === 'proprietary') {
    return new Proprietary();
  } else {
    return new Copyright();
  }
}

export function getNote(): string {
  return getConfiguration().get('note') || '';
}

export function getNewFilesOnly(): Boolean {
  return getConfiguration().get('newFilesOnly') || false;
}
