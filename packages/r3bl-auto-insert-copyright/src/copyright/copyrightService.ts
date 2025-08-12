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
import * as configuration from '../configuration';

export function handleCopyrightCheck(editor: vscode.TextEditor | undefined) {
  if (
    editor !== undefined &&
    isSupportedLanguage(editor.document.languageId) &&
    !hasCopyright(editor.document) && (configuration.getNewFilesOnly() ? isNewDocument(editor.document) : true)
  ) {
    insertCopyright(editor);
  }
}

export function handleManualCopyrightCheck(editor: vscode.TextEditor | undefined): boolean {
  if (
    editor !== undefined &&
    isSupportedLanguage(editor.document.languageId) &&
    !hasCopyright(editor.document)
  ) {
    insertCopyright(editor);
    return true;
  } else {
    return false;
  }
}

/**
 * Checks if a document already contains a copyright header.
 * 
 * Supports detection of both single-line and multi-line copyright formats:
 * - Single-line: Apache2OneLine (// Copyright...)
 * - Multi-line: MIT, Apache2, GPL3 (/* ... * Copyright...)
 * 
 * @param document The VSCode text document to check
 * @returns true if a copyright header is detected, false otherwise
 */
function hasCopyright(document: vscode.TextDocument): Boolean {
  if (isNewDocument(document)) {
    return false;
  }

  // Check first line (single-line copyright like Apache2OneLine: "// Copyright...")
  const firstLine = document.lineAt(0);
  if (!firstLine.isEmptyOrWhitespace && firstLine.text.includes('Copyright')) {
    return true;
  }

  // Check second line (multi-line copyright like MIT/Apache2/GPL3: "/* ... * Copyright...")
  // Note: Multi-line licenses have "Copyright" on line 3-4, but we check line 1 which
  // contains the block comment structure indicating a copyright header is present
  if (document.lineCount > 1) {
    const secondLine = document.lineAt(1);
    if (!secondLine.isEmptyOrWhitespace && secondLine.text.includes('Copyright')) {
      return true;
    }
  }

  return false;
}

function insertCopyright(editor: vscode.TextEditor) {
  const documentStartPosition = new vscode.Position(0, 0);
  const copyright = configuration.getCopyright().header();

  editor.edit(document => {
    document.insert(documentStartPosition, copyright);
  });
}

function isNewDocument(document: vscode.TextDocument): Boolean {
  return document.lineCount <= 1;
}

function isSupportedLanguage(languageId: string): Boolean {
  return configuration.configuredLanguages.has(languageId);
}
