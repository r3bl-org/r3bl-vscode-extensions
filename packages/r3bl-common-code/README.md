# R3BL Common Code

Common utilities for R3BL VSCode extensions. This is an internal npm package that provides
shared TypeScript utilities used across all R3BL extensions.

## Purpose

This package eliminates code duplication by providing:

- Type-safe wrappers for r3bl-shared extension API
- Shared utility functions
- Common type definitions

## Installation

This package is used as a local file dependency in R3BL extensions:

```json
{
    "dependencies": {
        "r3bl-common-code": "file:../r3bl-common-code"
    }
}
```

## Available Utilities

### Status Bar Messages

**`showStatusBarMessage(message: string, type: StatusBarMessageType): void`**

Type-safe wrapper for displaying status bar messages via r3bl-shared extension.

```typescript
import { showStatusBarMessage } from 'r3bl-common-code';

showStatusBarMessage('Task created!', 'success');
showStatusBarMessage('Please check your settings', 'warning');
showStatusBarMessage('File not found', 'error');
showStatusBarMessage('Operation completed', 'info');
```

**Available message types:** `'info'`, `'success'`, `'warning'`, `'error'`

**Benefits:**

- Reduces 9 lines of boilerplate to 2 lines
- Automatic error handling with marketplace fallback
- Type-safe API
- No need to manage extension activation state

### Generic API Caller

**`callSharedAPI(apiMethod: string, ...args: any[]): boolean`**

Generic function for calling r3bl-shared extension APIs with automatic error handling.

```typescript
import { callSharedAPI } from 'r3bl-common-code';

// Returns true if successful, false if extension not active
const success = callSharedAPI('showStatusBarMessage', 'Hello', 'info');
```

**Returns:** `true` if API call succeeded, `false` if r3bl-shared is not available

### Type Definitions

**`StatusBarMessageType`**

Type definition for status bar message types:

```typescript
type StatusBarMessageType = 'info' | 'success' | 'warning' | 'error';
```

## Architecture

This package:

- Is compiled with TypeScript compiler (tsc) to separate `.js` and `.d.ts` files
- Provides proper type definitions for TypeScript intellisense
- Includes complete error handling with marketplace link fallback
- Works seamlessly with r3bl-shared extension via runtime API calls
- Has no runtime dependencies (only dev dependencies)

## Development

### Building

```bash
cd packages/r3bl-common-code
npm install
npm run compile
```

This generates:

- `dist/index.js` - Compiled JavaScript
- `dist/index.d.ts` - TypeScript type definitions
- `dist/index.js.map` - Source map
- `dist/index.d.ts.map` - Type definition source map

### Project Structure

```
packages/r3bl-common-code/
├── package.json        # Package configuration (uses tsc, not webpack)
├── tsconfig.json       # TypeScript compiler configuration
├── src/
│   └── index.ts       # Source code with utilities
└── dist/              # Compiled output (generated)
    ├── index.js
    ├── index.d.ts
    ├── index.js.map
    └── index.d.ts.map
```

## Why Not Webpack?

This package uses `tsc` (TypeScript compiler) instead of webpack because:

- Libraries need separate `.js` and `.d.ts` files for proper type exports
- Consuming projects need to tree-shake unused code
- Standard approach for npm libraries
- Webpack bundles everything into a single file (appropriate for applications, not
  libraries)

## License

MIT License - Copyright (c) 2024-2025 R3BL LLC
