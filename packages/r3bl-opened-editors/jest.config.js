// Copyright (c) 2026 R3BL LLC. Licensed under MIT License.

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/src"],
    testMatch: ["**/__tests__/**/*.test.ts"],
    moduleNameMapper: {
        "^vscode$": "<rootDir>/src/__tests__/__mocks__/vscode.ts",
        "^r3bl-common-code$": "<rootDir>/src/__tests__/__mocks__/r3bl-common-code.ts",
    },
}
