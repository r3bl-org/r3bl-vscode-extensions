import * as path from 'path';
import { SearchResult } from './types';

export function parseResults(
  output: string,
  workspaceRoot: string
): SearchResult[] {
  const lines = output.trim().split('\n');
  const results: SearchResult[] = [];

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    // Format from rg: file:line:content
    // We need to handle files with colons carefully
    const match = line.match(/^(.+?):(\d+):(.*)$/);
    if (!match) {
      continue;
    }

    const [, filePath, lineNum, content] = match;

    // Make path relative to workspace
    const relativePath = path.relative(workspaceRoot, filePath);

    results.push({
      file: relativePath,
      line: parseInt(lineNum, 10),
      content: content
    });
  }

  return results;
}
