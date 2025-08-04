/*
 *   Copyright (c) 2024 R3BL LLC
 *   All rights reserved.
 *
 *   Permission is hereby granted, free of charge, to any person obtaining a copy
 *   of this software and associated documentation files (the "Software"), to deal
 *   in the Software without restriction, including without limitation the rights
 *   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *   copies of the Software, and to permit persons to whom the Software is
 *   furnished to do so, subject to the following conditions:
 *
 *   The above copyright notice and this permission notice shall be included in all
 *   copies or substantial portions of the Software.
 *
 *   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *   SOFTWARE.
 */

import * as vscode from 'vscode';
import { Copyright } from './copyright/copyright';
import { Apache2 } from './copyright/licenses/apache2';
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
