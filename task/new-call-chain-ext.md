# Plan: R3BL Call Chain Extension (`r3bl-call-chain`)

## Objective

Create a new VSCode extension, `r3bl-call-chain`, for the R3BL extension pack. The extension allows developers to trace an execution call hierarchy (stepping up into callers or down into callees) while maintaining an interactive, annotated "visual call stack" trail in a dedicated sidebar TreeView panel.

---

## Core Concepts & Design

### 1. Visual Call Stack Order (Execution Flow)

Unlike a chronological log that records when clicks occurred, the call chain displays the active trail ordered by **execution flow** (from outermost caller at the top to innermost leaf callee at the bottom):

```
▲ [Caller] handleLoginRequest(req, res) (api/routes.ts:85)
│   └─ 📞 Calls authenticateUser() at line 92
│
🎯 [* Root / Active] authenticateUser(credentials) (auth/service.ts:120)
│   └─ 📞 Calls verifyMfaToken() at line 135
│
▼ [Callee] verifyMfaToken(user, token) (auth/mfa.ts:45)
```

- **Step Up (Incoming / Callers)**: Invokes `vscode.provideIncomingCalls`. If multiple callers exist, displays a QuickPick. The selected caller is placed **above** the current node in the call stack.
- **Step Down (Outgoing / Callees)**: Invokes `vscode.provideOutgoingCalls`. If multiple callees exist, displays a QuickPick. The selected callee is placed **below** the current node in the call stack.
- **Single Chain at a Time**: To keep Phase 1 focused and reliable, navigation maintains one active linear execution path through the call graph.

---

### 2. Sidebar TreeView Layout

The extension contributes a custom View Container in the Activity Bar with a dedicated TreeView (`r3bl-call-chain.treeView`):

```
▼ Call Chain: authenticateUser (3 frames)
  ├─ 🔼 [1] handleLoginRequest (api/routes.ts:85)
  │    ├─ 📞 line 92: authenticateUser(credentials)
  │    └─ 📝 "Public entry point; rate limiting applied before this"
  │
  ├─ 🎯 [2] authenticateUser (auth/service.ts:120) [Active Focus]
  │    ├─ 📞 line 135: verifyMfaToken(user, token)
  │    └─ 📝 "Investigating why MFA check was bypassed in unit test"
  │
  └─ 🔽 [3] verifyMfaToken (auth/mfa.ts:45)
       └─ 📝 "Returns undefined if secret key is null"
```

#### Node Interactivity
- **Click on Function Node**: Navigates editor directly to the function definition (`selectionRange`).
- **Click on `📞 Call Site` sub-item**: Navigates editor directly to where the call was made inside the caller (`callSite.range`).
- **Click on `📝 Note` sub-item**: Opens `vscode.window.showInputBox` to update the note text.
- **Node Context / Inline Toolbar Actions**:
  - `$(arrow-up)` **Step Up**: Find callers of this function.
  - `$(arrow-down)` **Step Down**: Find callees of this function.
  - `$(edit)` **Edit Note**: Attach or edit annotation.
  - `$(target)` **Set Focus**: Mark this node as current focus for subsequent step up/down actions.
  - `$(trash)` **Remove Frame**: Remove this node from the chain.
- **View Title Bar Actions**:
  - `$(play)` / `$(add)` **Start Chain from Cursor** (`r3bl-call-chain.startChain`)
  - `$(markdown)` **Export to Markdown** (`r3bl-call-chain.exportMarkdown`)
  - `$(clear-all)` **Clear Chain** (`r3bl-call-chain.clearChain`)

---

### 3. Data Model (`src/types.ts`)

```typescript
import * as vscode from 'vscode';

export type CallDirection = 'root' | 'caller' | 'callee';

export interface SerializedRange {
  start: { line: number; character: number };
  end: { line: number; character: number };
}

export interface CallSiteReference {
  uri: string;
  range: SerializedRange;
  snippet?: string;
}

export interface CallChainNode {
  id: string;
  name: string;
  detail?: string;
  kind: vscode.SymbolKind;
  uri: string;
  selectionRange: SerializedRange;
  bodyRange: SerializedRange;
  callSite?: CallSiteReference;
  direction: CallDirection;
  note?: string;
  timestamp: number;
}

export interface CallChain {
  id: string;
  title: string;
  rootNodeId: string;
  focusedNodeId: string;
  nodes: CallChainNode[]; // Ordered from outermost caller (index 0) to innermost callee
  createdAt: number;
  updatedAt: number;
}

export interface PersistedCallChainData {
  version: '1.0.0';
  activeChain: CallChain | null;
}
```

---

### 4. Storage & Persistence (`src/storage.ts`)

- **Primary Storage**: Saved to `.vscode/r3bl-call-chain.json` inside the root workspace folder.
  - Transparent, inspectable, and shareable/committable.
  - Follows same pattern as `task-spaces.json` in `r3bl-task-management`.
- **Fallback**: If no workspace folder is open or write fails, falls back gracefully to `context.workspaceState`.
- **Automatic Sync**: Any modification (adding a node, changing a note, removing a node, clearing) updates the persisted state.

---

### 5. Markdown Export (`src/markdownExporter.ts`)

Copies a formatted report of the call chain to the clipboard:

```markdown
# Call Chain: authenticateUser

Generated on 2026-09-05. Active frames: 3.

1. **[Caller]** [`handleLoginRequest`](file:///path/to/api/routes.ts#L85)
   - Call site: line 92 (`authenticateUser(credentials)`)
   - Note: *Public entry point; rate limiting applied before this*

2. **[Root]** [`authenticateUser`](file:///path/to/auth/service.ts#L120) *(Active Focus)*
   - Call site: line 135 (`verifyMfaToken(user, token)`)
   - Note: *Investigating why MFA check was bypassed in unit test*

3. **[Callee]** [`verifyMfaToken`](file:///path/to/auth/mfa.ts#L45)
   - Note: *Returns undefined if secret key is null*
```

---

## Implementation Steps

### Step 1: Package Scaffolding (`packages/r3bl-call-chain/`)
1. Create directory structure:
   - `packages/r3bl-call-chain/src/`
   - `packages/r3bl-call-chain/src/__tests__/`
2. Create standard configuration files:
   - `package.json` (declaring dependencies on `r3bl-common-code` and `R3BL.r3bl-shared`, commands, menus, views, keybindings).
   - `tsconfig.json`
   - `webpack.config.js`
   - `jest.config.js`
   - `.vscodeignore`
   - `README.md`
   - Copy `r3bl-cube-logo.png` icon.

### Step 2: Core Domain Logic & Manager
1. **`src/types.ts`**: Define domain types, interfaces, serialization helpers.
2. **`src/callHierarchyService.ts`**:
   - Wrap `vscode.executePrepareCallHierarchy`
   - Wrap `vscode.executeIncomingCallsProvider`
   - Wrap `vscode.executeOutgoingCallsProvider`
   - Provide safe fallback handling when language server has no call hierarchy support.
3. **`src/chainManager.ts`**:
   - Pure state manipulation of `CallChain`:
     - `startChain(rootItem)`
     - `stepUp(focusedId, callerItem, callSite)`: inserts above the focused node.
     - `stepDown(focusedId, calleeItem, callSite)`: inserts below the focused node.
     - `setNote(nodeId, note)`
     - `setFocus(nodeId)`
     - `removeFrame(nodeId)`
     - `clearChain()`
4. **`src/storage.ts`**:
   - `loadChain(workspaceUri)`
   - `saveChain(workspaceUri, chain)`
5. **`src/markdownExporter.ts`**:
   - Generates markdown string from `CallChain`.

### Step 3: TreeView Provider & UI
1. **`src/treeDataProvider.ts`**:
   - Implement `vscode.TreeDataProvider<CallChainTreeItem>`.
   - Support collapsible items (node -> call site, note).
   - Custom icons and context values for inline actions.
   - Jump commands with file and line range selection.

### Step 4: Extension Entry Point & Commands (`src/extension.ts`)
1. Register `r3bl-call-chain.startChain` (`Alt+Shift+C`)
2. Register `r3bl-call-chain.stepUp` (`Alt+Shift+U`)
3. Register `r3bl-call-chain.stepDown` (`Alt+Shift+D`)
4. Register `r3bl-call-chain.setNote`
5. Register `r3bl-call-chain.setFocus`
6. Register `r3bl-call-chain.removeFrame`
7. Register `r3bl-call-chain.clearChain`
8. Register `r3bl-call-chain.exportMarkdown`
9. Register `r3bl-call-chain.jumpToLocation`
10. Register `CallChainTreeDataProvider` with `vscode.window.registerTreeDataProvider`.

### Step 5: Unit Tests
1. `src/__tests__/chainManager.test.ts`:
   - Verify call stack ordering when stepping up (places caller above target).
   - Verify call stack ordering when stepping down (places callee below target).
   - Verify removing frames, setting notes, changing focus.
2. `src/__tests__/storage.test.ts`:
   - Verify JSON serialization and deserialization of ranges, URIs, and notes.
3. `src/__tests__/markdownExporter.test.ts`:
   - Verify markdown output formatting with clickable links.

### Step 6: Monorepo Integration
1. **`packages/r3bl-extension-pack/package.json`**:
   - Add `"R3BL.r3bl-call-chain"` to `extensionPack`.
   - Bump version.
2. **`script_lib.sh`**:
   - Add `CALL_CHAIN_VERSION=$(get_version "./packages/r3bl-call-chain/package.json")`
   - Include in `get_all_versions` and `print_built_extensions`.
3. **`build.sh`**:
   - Add build target for `r3bl-call-chain`.
4. **`install.sh`**:
   - Add install target for `r3bl-call-chain`.
5. **Documentation**:
   - Update root `README.md` and `CHANGELOG.md`.

---

## Verification & Testing Plan

1. **Automated Unit Tests**:
   - Run `npm test` inside `packages/r3bl-call-chain` to ensure 100% passing test suite for chain logic and storage.
2. **Build Verification**:
   - Run `./build.sh r3bl-call-chain r3bl-extension-pack` to ensure successful compilation and `.vsix` packaging.
3. **Manual In-Editor Verification**:
   - Open a TypeScript/Rust/Python file in VSCode.
   - Place cursor on a function and run `Alt+Shift+C` (Start Chain).
   - Run `Alt+Shift+U` (Step Up) -> pick caller from QuickPick -> verify caller appears **above** the function in the tree.
   - Run `Alt+Shift+D` (Step Down) -> pick callee from QuickPick -> verify callee appears **below** the function in the tree.
   - Add notes to frames and verify they display in the tree.
   - Click each node and call site to verify accurate navigation.
   - Run "Export to Markdown" and verify clipboard content.
   - Reload window (`Developer: Reload Window`) and confirm chain and notes persist from `.vscode/r3bl-call-chain.json`.
