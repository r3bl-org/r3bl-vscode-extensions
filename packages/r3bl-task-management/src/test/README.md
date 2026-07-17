# Unit Tests

## Overview

This directory contains unit tests for the R3BL Task Management extension.

## Running Tests

### Prerequisites

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Watch Mode

```bash
npm run watch-tests
```

## Test Structure

- `types.test.ts` - Tests for TypeScript interfaces and data structures
- More tests can be added for:
    - Storage layer (mocking VSCode APIs)
    - TaskSpaceManager logic
    - UI helper functions

## Writing Tests

Tests use Mocha and the Node.js assert module.

Example:

```typescript
import * as assert from "assert"

suite("My Test Suite", () => {
    test("My test case", () => {
        assert.strictEqual(1 + 1, 2)
    })
})
```

## VSCode Extension Testing

For integration tests that require VSCode APIs, use the `@vscode/test-electron` package.
See the official VSCode extension testing documentation.

## Current Coverage

- ✅ Types validation
- ⏳ Storage layer (future)
- ⏳ TaskSpaceManager (future)
- ⏳ UI helpers (future)

## Manual Testing

For comprehensive manual testing, see `TESTING.md` in the root of this extension.
