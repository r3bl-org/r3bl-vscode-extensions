// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as path from "path"
import { SearchResult } from "./types"

export function parseResults(output: string, workspaceRoot: string): SearchResult[] {
    const lines = output.trim().split("\n")
    const results: SearchResult[] = []

    for (const line of lines) {
        if (!line.trim()) {
            continue
        }

        // Format from rg: file:line:content
        // We need to handle files with colons carefully
        const match = line.match(/^(.+?):(\d+):(.*)$/)
        if (!match) {
            continue
        }

        const [, filePath, lineNum, content] = match

        // Convert to absolute path if it's relative
        const absolutePath = path.isAbsolute(filePath)
            ? filePath
            : path.join(workspaceRoot, filePath)

        results.push({
            file: absolutePath,
            line: parseInt(lineNum, 10),
            content: content,
        })
    }

    return results
}
