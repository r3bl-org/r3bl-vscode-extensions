import * as vscode from 'vscode';
import { SearchInput, SearchResult } from './types';

function generateHeader(
  input: SearchInput,
  results: SearchResult[]
): string {
  const lines: string[] = [];

  lines.push(`# Query: ${input.query}`);

  // Build settings line
  const config = vscode.workspace.getConfiguration('r3blFuzzySearch');
  const resultLimit = config.get<number>('resultLimit', 100);
  const gitignoreStatus = input.respectGitignore ? 'Gitignore respected' : 'Gitignore ignored';
  lines.push(`# Settings: Fuzzy search, ${gitignoreStatus}, Limit ${resultLimit}`);

  if (input.excludePatterns) {
    lines.push(`# Excluding: ${input.excludePatterns}`);
  }

  // Count unique files
  const uniqueFiles = new Set(results.map(r => r.file)).size;
  lines.push(`#`);
  lines.push(`# ${results.length} results - ${uniqueFiles} files`);

  return lines.join('\n');
}

function generateBody(results: SearchResult[]): string {
  // Group results by file
  const byFile = new Map<string, SearchResult[]>();

  for (const result of results) {
    if (!byFile.has(result.file)) {
      byFile.set(result.file, []);
    }
    byFile.get(result.file)!.push(result);
  }

  const sections: string[] = [];

  for (const [file, fileResults] of byFile) {
    sections.push(`${file}:`);

    // Sort by line number
    fileResults.sort((a, b) => a.line - b.line);

    for (const result of fileResults) {
      // Format: "  line: content"
      // Remove ANSI color codes
      const cleanContent = result.content.replace(/\x1b\[[0-9;]*m/g, '');
      sections.push(`  ${result.line}: ${cleanContent.trim()}`);
    }

    sections.push(''); // Blank line between files
  }

  return sections.join('\n');
}

export function generateSearchEditorContent(
  input: SearchInput,
  results: SearchResult[]
): string {
  // Generate header
  const header = generateHeader(input, results);

  // Generate body
  const body = generateBody(results);

  return `${header}\n\n${body}`;
}
