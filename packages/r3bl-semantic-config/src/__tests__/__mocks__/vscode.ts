// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.
// Minimal vscode module mock for unit testing pure functions.

export enum FoldingRangeKind {
    Comment = 1,
    Imports = 2,
    Region = 3,
}

export class FoldingRange {
    start: number
    end: number
    kind?: FoldingRangeKind

    constructor(start: number, end: number, kind?: FoldingRangeKind) {
        this.start = start
        this.end = end
        this.kind = kind
    }
}
