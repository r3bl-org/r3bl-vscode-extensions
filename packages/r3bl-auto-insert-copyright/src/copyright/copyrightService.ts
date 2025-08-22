// Copyright (c) 2025 R3BL LLC. Licensed under MIT License.

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
