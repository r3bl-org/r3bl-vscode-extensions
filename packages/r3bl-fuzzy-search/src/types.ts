// Type definitions for r3bl-fuzzy-search extension

export interface SearchInput {
  query: string;           // The fuzzy search pattern
  excludePatterns: string; // Comma-separated globs
  respectGitignore: boolean; // Whether to respect .gitignore files
}

export interface SearchResult {
  file: string;      // Relative path
  line: number;      // 1-based line number
  content: string;   // Line content
}

export interface ProcessConfig {
  command: string;
  args: string[];
}
