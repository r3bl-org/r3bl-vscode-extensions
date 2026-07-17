// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/src"],
    testMatch: ["**/__tests__/**/*.test.ts"],
    moduleNameMapper: {
        // Mock the vscode module (not available outside VSCode runtime)
        "^vscode$": "<rootDir>/src/__tests__/__mocks__/vscode.ts",
        // Mock r3bl-common-code (depends on vscode at runtime)
        "^r3bl-common-code$": "<rootDir>/src/__tests__/__mocks__/r3bl-common-code.ts",
    },
}
