# R3BL Shared Utilities

**Internal infrastructure extension** that provides centralized services for all R3BL extensions.

## What is R3BL Shared?

r3bl-shared is a VSCode extension (NOT an npm package) that provides **centralized services** with shared state across all R3BL extensions.

**Why?** Each VSCode extension is bundled separately by webpack. If multiple extensions import the same npm package, each gets its own isolated copy - no shared state possible. By running as a VSCode extension, r3bl-shared provides true cross-extension communication.

## Current Services

### Message Queue Service

Centralized FIFO queue for status bar messages across all R3BL extensions:
- **No message overlap** - messages from different extensions display sequentially
- **Smart duration** - automatic timing based on message type (error: 5s, warning: 4s, info/success: 3s)
- **User configurable** - respects global r3bl settings for feedback mechanism

### Future Services

This infrastructure can expand to provide additional services:
- Shared state coordination
- Cross-extension event bus
- Centralized caching
- Global locks and semaphores
- ... and more as needed

## Usage in Other Extensions

### 1. Declare Dependency

In `package.json`:

```json
{
    "extensionDependencies": ["R3BL.r3bl-shared"]
}
```

### 2. Call the API

```typescript
const sharedExt = vscode.extensions.getExtension('R3BL.r3bl-shared');
if (sharedExt?.isActive && sharedExt.exports?.showStatusBarMessage) {
    sharedExt.exports.showStatusBarMessage('Task created!', 'success');
} else {
    vscode.window.showErrorMessage(
        "R3BL Shared extension is not active. Please ensure it is installed and enabled.",
        "Install Extension"
    ).then(choice => {
        if (choice === "Install Extension") {
            vscode.env.openExternal(vscode.Uri.parse("vscode:extension/R3BL.r3bl-shared"));
        }
    });
}
```

**Available message types:** `'info'`, `'success'`, `'warning'`, `'error'`

**Note**: The error fallback should rarely trigger since all R3BL extensions declare `extensionDependencies: ["R3BL.r3bl-shared"]`, ensuring r3bl-shared loads first.

### Alternative: Using r3bl-common-code Utilities

For a simplified approach, you can use the **r3bl-common-code** package which provides utilities that wrap the extension API calls:

```typescript
import { showStatusBarMessage } from 'r3bl-common-code';

// Simple, clean API call (includes automatic error handling)
showStatusBarMessage('Task created!', 'success');
```

**Benefits:**
- Reduces 9 lines of boilerplate to 2 lines
- Automatic error handling with marketplace fallback
- Type-safe API
- No need to manage extension activation state manually

To use r3bl-common-code, add it as a dependency in your extension's `package.json`:

```json
{
  "dependencies": {
    "r3bl-common-code": "file:../r3bl-common-code"
  }
}
```

See `packages/r3bl-common-code/` for more details on available utilities.

## Public API

### `showStatusBarMessage(message: string, type: MessageType): void`

Display a transient status bar message with automatic queuing.

**Features**:

- Centralized FIFO queue - messages from all R3BL extensions displayed sequentially
- No message overlap or loss
- Smart duration based on message type (error: 5s, warning: 4s, info/success: 3s)
- User configurable via settings

## Configuration

Users can customize via settings:

```json
{
    "r3bl.transientFeedbackMechanism": "statusbar", // or "notification" or "none"
    "r3bl.statusbarMessage.successDuration": 3000,
    "r3bl.statusbarMessage.infoDuration": 3000,
    "r3bl.statusbarMessage.warningDuration": 4000,
    "r3bl.statusbarMessage.errorDuration": 5000,
    "r3bl.statusbarMessageMaxLength": 50
}
```

## License

MIT License - Copyright (c) 2024-2025 R3BL LLC
