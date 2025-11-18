// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

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
 * Uses a hybrid detection approach:
 * 1. Checks for single-line format in first line
 * 2. For block comments, scans first 30 lines for copyright/license keywords
 *
 * @param document The VSCode text document to check
 * @returns true if a copyright header is detected, false otherwise
 */
function hasCopyright(document: vscode.TextDocument): Boolean {
  if (isNewDocument(document)) {
    return false;
  }

  const firstLine = document.lineAt(0);

  // Check for single-line copyright (Apache2OneLine: "// Copyright...")
  if (!firstLine.isEmptyOrWhitespace &&
      firstLine.text.trim().startsWith('//') &&
      firstLine.text.includes('Copyright')) {
    return true;
  }

  // Check for multi-line copyright block (MIT, Apache2, GPL3)
  if (!firstLine.isEmptyOrWhitespace &&
      firstLine.text.trim().startsWith('/*')) {
    // Scan first 30 lines for copyright/license keywords
    const linesToCheck = Math.min(30, document.lineCount);
    for (let i = 0; i < linesToCheck; i++) {
      const line = document.lineAt(i).text.toLowerCase();
      if (line.includes('copyright') ||
          line.includes('license') ||
          line.includes('licensed')) {
        return true;
      }
      // Stop at end of comment block
      if (line.includes('*/')) {
        break;
      }
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
