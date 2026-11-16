# Task: Explicit Task Space Stacking & Per-Task Jump Point Scoping

## Overview

Refine `r3bl-task-management` so that:

1. **Task Space Stacking** is an **explicit** call-stack (`Push` / `Pop`) stored in
   `.vscode/task-spaces.json` (one stack per workspace), while flat switching (`Enter` in
   `Alt+Shift+T`) switches tasks without pushing onto the stack, and the `Next Queue`
   concept is retired completely.
2. **Jump Point Navigation** (`.vscode/jump-points.json`) is **scoped per `taskSpaceId`**,
   so switching, pushing, or popping tasks cleanly swaps both editor tabs and the jump
   journey stack.

---

## Architecture & Storage Design

### 1. Keep `workspaceState["activeTaskSpaceId"]` Unchanged

- `activeTaskSpaceId` and `taskSpaceMetadata` (`lastAccessed`) remain per-IDE in
  `context.workspaceState` (just like `v3.0`/`v4.0`).

### 2. `.vscode/task-spaces.json` (`v4.0` → `v5.0`)

- Remove `nextQueueIds` completely (users always choose their next task explicitly when
  the stack is empty).
- Keep `previousStackIds: string[]` as the **single workspace-wide Task Stack** (ordered
  bottom-to-top, populated **only** by explicit Push actions):

```json
{
    "version": "5.0",
    "taskSpaces": [ ... ],
    "previousStackIds": ["uuid-caller-A", "uuid-caller-B"]
}
```

- **Migration `4.0` → `5.0` (`storage.ts`):**
    - Remove legacy `nextQueueIds` property.
    - Ensure `previousStackIds` is initialized (`data.previousStackIds ?? []`).
    - Bump `CURRENT_VERSION` to `"5.0"`.

### 3. `.vscode/jump-points.json` (`v1.0` → `v2.0`, Keyed by `taskSpaceId`)

- Store jump journeys in a dictionary keyed by `taskSpaceId`:

```json
{
    "version": "2.0",
    "journeys": {
        "uuid-task-A": {
            "points": [ ... ],
            "currentIndex": 1
        }
    }
}
```

- **Active-task requirement:**
    - `JumpJourneyManager` queries the active `TaskSpace` via a callback provided by
      `TaskSpaceManager`.
    - If `activeTaskSpace` is `undefined`, `Alt+U` (`jumpAndRecord`) and `Alt+Shift+U`
      (`showJumpPoints`) display a status bar warning:
      `"Jump points require an active task space (press Alt+Shift+T)"`.
    - `Alt+Shift+U` QuickPick placeholder displays
      `Navigate jump journey — <activeTaskSpace.name>`.
- **Lifecycle cleanup:**
    - Deleting or finishing a task space calls `journeyManager.deleteJourneyForTask(id)`
      to prune `journeys[id]` from `.vscode/jump-points.json`.
- **Migration `1.0` → `2.0`:**
    - If an existing `1.0` file (`{ points, currentIndex }`) is loaded and an
      `activeTaskSpaceId` is active at startup, migrate those points under
      `journeys[activeTaskSpaceId]`; otherwise initialize
      `{ version: "2.0", journeys: {} }`.

---

## Operations & UX Semantics

- **Flat Switch** _(default)_
    - **Trigger:** `Enter` on a task in `Alt+Shift+T`
    - **Stack (`previousStackIds`):** Does **not** push current task. _(Removes target
      from `previousStackIds` if it was paused there.)_
    - **Tabs & Jump Points:** Saves current task's tabs; switches `activeTaskSpaceId` to
      target; loads target's tabs + jump points.
- **Push Existing Task** _(explicit)_
    - **Trigger:** `[$(layers)]` button on task row in `Alt+Shift+T`, or
      `r3bl-task-management.pushTaskSpace`
    - **Stack (`previousStackIds`):** Pushes current `activeTaskSpaceId` onto
      `previousStackIds`.
    - **Tabs & Jump Points:** Saves current task's tabs; switches `activeTaskSpaceId` to
      target; loads target's tabs + jump points.
- **Create New Task Space** _(clones)_
    - **Trigger:** `Create New Task Space` in `Alt+Shift+T`
    - **Stack (`previousStackIds`):** Unchanged (does **not** push).
    - **Tabs & Jump Points:** **Clones** currently open tabs into new task `N`;
      flat-switches to `N`.
- **Push New Subtask** _(clean)_
    - **Trigger:** `Push New Subtask` in `Alt+Shift+T` _(when a task is active)_
    - **Stack (`previousStackIds`):** Pushes current `activeTaskSpaceId` onto
      `previousStackIds`.
    - **Tabs & Jump Points:** Saves current task's tabs; creates `task/<name>.md` + new
      task `N` with **only** `[task/<name>.md]` (no tab bleed) and empty jump points;
      switches to `N`.
- **Pop Task** _(pause / unwind 1)_
    - **Trigger:** `Alt+Shift+J` (`popTaskSpace`) or top row in `Alt+Shift+T`
    - **Stack (`previousStackIds`):** If stack non-empty, pops top `P` and switches to
      `P`. If stack empty, closes active task (`No Task Space`).
    - **Tabs & Jump Points:** Saves current task's tabs (leaves task in Available Tasks);
      restores `P`'s tabs + jump points (or closes all tabs if stack empty).
- **Finish Current Task**
    - **Trigger:** `Alt+Shift+F` (`finishCurrentTask`) or top row in `Alt+Shift+T`
    - **Stack (`previousStackIds`):** Archives active task (`task/done/`). If stack
      non-empty, pops top `P` and switches to `P`. If empty, closes all tabs
      (`No Task Space`).
    - **Tabs & Jump Points:** Deletes finished task's jump points; restores `P` or closes
      all tabs (never auto-picks an unstacked task).
- **Close Current Task Space**
    - **Trigger:** `Alt+Shift+C` (`closeCurrentTaskSpace`) or top row in `Alt+Shift+T`
    - **Stack (`previousStackIds`):** Unchanged.
    - **Tabs & Jump Points:** Saves active task's tabs, clears `activeTaskSpaceId`, closes
      all tabs.

### Dashboard (`Alt+Shift+T`) & Status Bar (`ui.ts`)

- **Top Actions (when a task is active):**
    1. `$(check) Finish Current Task: <Name>` — _"Archive task & pop to `<TopOfStack>`"_
       (or _"Archive task & close"_ if stack is empty)
    2. `$(reply) Pop Task Stack` — _"Pause `<Name>` & return to `<TopOfStack>`
       (Alt+Shift+J)"_ (or _"Pause `<Name>` & close (Alt+Shift+J)"_ if stack is empty)
    3. `$(close) Close Current Task Space: <Name>` — _"Save and close current task space
       tabs (Alt+Shift+C)"_
- **Creation Actions:**
    - `$(add) Create New Task Space` — _"Clone current tabs into a new task space"_
    - `$(layers) Push New Subtask` _(when a task is active)_ — _"Start clean with a new
      task/_.md and push `<Name>` onto stack"\*
- **Task Sections:**
    - **Task Stack (Paused)** — shows `previousStackIds` from top (most recently pushed)
      to bottom, with `[Remove from Stack]`, `[Move to Backlog]`, `[Rename]`, `[Delete]`
      buttons.
    - **Available Task Spaces** — all other non-active tasks sorted by `lastAccessed`
      (including newly created `task/*.md` files auto-picked up by the file watcher), with
      `[$(layers) Push onto Stack]` (when a task is active), `[Move to Backlog]`,
      `[Rename]`, `[Delete]` buttons.
- **Status Bar:**
    - Active task with empty stack: `$(book) <Name> (<tabs>)`
    - Active task with non-empty stack: `$(layers) <Name> (<tabs>) [stack: <N>]` (with
      tooltip listing stacked caller tasks).

---

## Implementation Checklist

### 1. Storage & Types (`v5.0` Task Spaces + `v2.0` Per-Task Jump Points)

- [x] Update `packages/r3bl-task-management/src/types.ts`: remove `nextQueueIds` from
      `TaskSpaceStorage`, keep `previousStackIds?: string[]`.
- [x] Update `packages/r3bl-task-management/src/storage.ts`: bump `CURRENT_VERSION` to
      `"5.0"` and add `4.0` → `5.0` migration removing `nextQueueIds`.
- [x] Refactor `packages/r3bl-task-management/src/jumpPointNavigator.ts`:
    - Bump `JUMP_POINTS_VERSION` to `"2.0"` with
      `journeys: Record<string, PersistedJumpJourney>` (plus `1.0` → `2.0` migration).
    - Accept active task space accessor in `initialize(...)`.
    - Guard `jumpAndRecord()` and `showJumpPoints()` when no active task space is set
      (show status bar warning).
    - Include active task name in `showJumpPoints()` QuickPick placeholder.
    - Add `deleteJourneyForTask(taskSpaceId: string)` to remove a task's jump history on
      task deletion/finish.

### 2. Task Space Manager (`taskSpaceManager.ts`)

- [x] Remove `addToNextQueue`, `removeFromNextQueue`, `getNextQueue`, `getNextQueueIds`,
      and `jumpToTask` implicit-push / queue logic.
- [x] Update `handleFileCreate` so newly detected `task/*.md` files simply create the
      `TaskSpace` (available in Dashboard) without queueing.
- [x] Implement explicit stack & switch methods:
    - `switchTaskSpace(id: string)` — flat switch (removes `id` from `previousStackIds` if
      present, seeds `[taskFile]` if tabs empty, does **not** push previous active task).
    - `pushTaskSpace(id: string)` — pushes current active task onto `previousStackIds`,
      then switches to `id` (seeding `[taskFile]` if empty).
    - `pushNewSubtask(name: string, taskFile?: string)` — pushes current active task onto
      `previousStackIds`, creates new task space with clean tabs (`[taskFile]` if
      linked/created, else `[]`), and switches to it closing parent tabs.
    - `popTaskSpace()` — saves active task tabs; if `previousStackIds` non-empty, pops top
      task and switches to it; else closes current task space
      (`activeTaskSpaceId = undefined`, closes all tabs).
- [x] Update `finishCurrentTask()` to archive/delete active task, prune its jump points,
      and either pop `previousStackIds` or close all open tabs (`No Task Space`) when
      stack is empty.
- [x] Update `deleteTaskSpace()` to invoke `journeyManager.deleteJourneyForTask(id)`.

### 3. UI, Commands, and Keybindings (`ui.ts`, `extension.ts`, `package.json`)

- [x] Update `packages/r3bl-task-management/src/ui.ts`:
    - Update `showTaskSpacesDialog` with `Pop Task Stack`, `Push New Subtask`,
      `Task Stack (Paused)`, and `Available Task Spaces` (with `[Push onto Stack]` button
      and flat-switch on `Enter`).
    - Update `handleCreateTaskSpace` vs `handlePushNewSubtask` (auto-creating
      `task/task_<safe_name>.md` if user doesn't pick an existing unlinked `.md`).
    - Update `updateStatusBar` to display stack depth & tooltip when `previousStackIds` is
      non-empty.
- [x] Update `packages/r3bl-task-management/src/extension.ts`:
    - Pass active-task accessor into
      `journeyManager.initialize(context, () => manager.getActiveTaskSpace())`.
    - Replace `r3bl-task-management.pauseAndJumpToNext` with
      `r3bl-task-management.popTaskSpace` (`Alt+Shift+J`) and register
      `r3bl-task-management.pushTaskSpace`.
- [x] Update `packages/r3bl-task-management/package.json`:
    - Replace `pauseAndJumpToNext` command & `alt+shift+j` binding with `popTaskSpace`,
      add `pushTaskSpace` command, and bump version (`1.5.0` → `1.6.0`).
- [x] Bump `packages/r3bl-extension-pack/package.json` (`1.5.3` → `1.6.0`).

### 4. Unit Tests, Docs, & Build Verification

- [x] Update `packages/r3bl-task-management/src/__tests__/types.test.ts` and
      `jumpPointNavigator.test.ts` (per-task journey isolation, no-active-task guard,
      `deleteJourneyForTask`, `v1.0` → `v2.0` migration).
- [x] Add unit tests for `Storage` `v4.0` → `v5.0` migration and `TaskSpaceManager` stack
      push/pop/flat-switch/finish transitions.
- [x] Update `packages/r3bl-task-management/README.md` to reflect the new mental model:
    - **The Dashboard Workflow (`Core Principles` & `How it differs...`):**
        - Expand **Context Preservation** to cover **both** open editor tabs and per-task
          Jump Point journeys (`Alt+U` / `Alt+Shift+U`) with zero cross-task overlap.
        - Rewrite **Fluid Routing** to retire `Next Queue` and implicit `Previous Stack`
          pushing in favor of: **Active Task** (per-IDE `workspaceState`), **Task Stack**
          (explicit workspace-wide call-stack in `previousStackIds` via Push/Pop),
          **Available Task Spaces** (flat switch on `Enter`, sorted by `lastAccessed`),
          **Backlog (`task/pending/`)**, and **Done (`task/done/`)**.
        - Update **Auto-Pickup**, **Opportunistic vs. Planned**, and **Coding Agent
          Synergy** so new `task/*.md` files appear directly in **Available Task Spaces**
          (no `Next Queue`), and highlight **Push New Subtask** for clean opportunistic
          detours that pop right back to the parent task.
    - **What It Does & Quick Start:**
        - Replace implicit "Pause and Jump" with **Flat Switch (`Enter`) vs. Explicit
          Stacking (`Push` / `Pop` with `Alt+Shift+J`)**.
        - Document **Create New Task Space** (clones open tabs) vs. **Push New Subtask**
          (clean start with only `task/<name>.md` + empty jump points, pushing the caller
          task onto the stack).
        - Update **Finish Current Task (`Alt+Shift+F`)**: archives task + prunes its jump
          points, then pops back to the stacked caller task—or closes cleanly to
          `No Task Space` when the stack is empty so the user picks the next task
          explicitly.
    - **Reference (`Commands`, `Keyboard Shortcuts`, `Status Bar`, `File Format`):**
        - Replace `Pause and Jump to Next Task` (`pauseAndJumpToNext`) with
          `Pop Task from Stack` (`r3bl-task-management.popTaskSpace`, `Alt+Shift+J`), and
          add `Push Task onto Stack...` (`r3bl-task-management.pushTaskSpace`).
        - Document the `$(layers)` / `[stack: N]` status bar indicator when the workspace
          task stack is non-empty.
        - Update `.vscode/task-spaces.json` schema example to `"version": "5.0"` (removing
          `nextQueueIds`), update the **Multi-Instance Behavior** table (Task Stack +
          Per-Task Jump Points synced across IDEs; Active Task + `lastAccessed` per IDE),
          update migration notes (`v1.0 → v5.0`), and replace Queue Management in **When
          Does the File Get Saved?** with Push/Pop stack operations.
    - **Jump Point Navigation Section:**
        - Document per-task scoping in `.vscode/jump-points.json` (`"version": "2.0"`,
          `journeys` keyed by `taskSpaceId`), clean swap on task switch/push/pop, status
          bar warning when `No Task Space` is active, and automatic pruning when a task is
          finished or deleted (with `.code-search` export available beforehand).
- [x] Update `packages/r3bl-task-management/AGENTS.md`,
      `packages/r3bl-extension-pack/README.md`, and `CHANGELOG.md`.
- [x] Run `./build.sh r3bl-task-management r3bl-extension-pack`, `npm test`, and
      `./install.sh`.

---

## Phase 2: Parked Stack + Active Head & Typestate Control Plane (`v6.0`)

### Motivation

In `v5.0`, `previousStackIds` only stored **paused callers**, while the stack's **Head**
was implied by `activeTaskSpaceId`. When flat-switching (`Enter`) from a stacked head `B`
to an unrelated task `C`:

- `B` fell into **Available Task Spaces** instead of staying at the top of the stack.
- `A` stayed on `previousStackIds`, making `Pop` (`Alt+Shift+J`) and `Finish`
  (`Alt+Shift+F`) act as if `C` was a subtask of `A` and leaving no way to jump back to
  the stack's head `B`.
- `TaskSpaceManager` and `ui.ts` each re-derived stack state ad-hoc while interleaving
  stack transitions with VS Code tab/file I/O.

### 1. Typestate Control Plane (`packages/r3bl-task-management/src/taskStackStateMachine.ts`)

Use TypeScript's **discriminated-union typestate pattern** (zero `vscode` imports) so
illegal states (such as an `"on-stack"` state with 0 paused callers or mismatched
`activeTaskSpaceId !== headTaskSpaceId`) are **unrepresentable at compile time**, and flat
`(activeTaskSpaceId, taskSpaceStackIds)` serialization only lives at the storage boundary
(`hydrateStackState` / `dehydrateStackState`).

```ts
export interface EmptyStackState {
    readonly mode: "empty"
    readonly activeTaskSpaceId: string | undefined
}

export interface OnStackState {
    readonly mode: "on-stack"
    readonly headTaskSpaceId: string // Also the activeTaskSpaceId
    readonly pausedTaskSpaceIds: readonly [string, ...string[]] // Non-empty (bottom -> parent)
}

export interface ParkedStackState {
    readonly mode: "parked"
    readonly activeTaskSpaceId: string | undefined // Off-stack task or undefined (never === headTaskSpaceId)
    readonly headTaskSpaceId: string // Parked stack head waiting to be resumed
    readonly pausedTaskSpaceIds: readonly string[] // Callers beneath parked head (0 or more)
}

export type TaskStackState = EmptyStackState | OnStackState | ParkedStackState

export interface PersistedStackSnapshot {
    readonly activeTaskSpaceId: string | undefined // workspaceState["activeTaskSpaceId"]
    readonly taskSpaceStackIds: readonly string[] // .vscode/task-spaces.json (bottom -> head)
}

export type StackEvent =
    | { type: "SWITCH"; targetTaskSpaceId: string }
    | { type: "PUSH"; targetTaskSpaceId: string }
    | { type: "POP_OR_RESUME" }
    | { type: "FINISH_ACTIVE" }
    | { type: "CLOSE_ACTIVE" }
    | { type: "REMOVE_FROM_STACK"; targetTaskSpaceId: string }
    | { type: "DELETE_TASK_SPACE"; targetTaskSpaceId: string }
    | { type: "EXTERNAL_SYNC"; snapshot: PersistedStackSnapshot }

export interface StackTransition {
    readonly state: TaskStackState
    readonly snapshot: PersistedStackSnapshot
    readonly outcome:
        | "noop"
        | "switched"
        | "resumed-stack"
        | "pushed"
        | "popped-to-parent"
        | "paused-empty-stack"
        | "finished-popped-to-parent"
        | "finished-to-empty"
        | "closed-active"
        | "stack-updated"
    readonly saveOutgoingTaskSpaceId?: string
    readonly openTargetTaskSpaceId?: string
    readonly closeAllTabs: boolean
}
```

#### Enforced Invariants (`hydrateStackState`)

1. **Valid IDs only:** Every ID in `state` exists in
   `validTaskSpaceIds: ReadonlySet<string>`.
2. **No duplicates:** Every task space ID appears at most once across
   `[...pausedTaskSpaceIds, headTaskSpaceId]`.
3. **No degenerate 1-item active stack:** If `taskSpaceStackIds` has 1 item `[X]` and
   `activeTaskSpaceId === X`, `hydrateStackState` returns
   `{ mode: "empty", activeTaskSpaceId: X }` with `taskSpaceStackIds: []`. A 1-item `[X]`
   is only valid in `mode: "parked"` (`activeTaskSpaceId !== X`).

#### State Transitions

- **`PUSH` (`targetTaskSpaceId = D`) — allowed from any mode:**
    - `empty` (`active = A`) → `on-stack` with `paused: [A], head: D`. (If
      `active === undefined`, switches to `D` in `empty` mode.)
    - `on-stack` (`paused: [A], head: B`) → `on-stack` with `paused: [A, B], head: D`
      (deduped).
    - `parked` (`active = C`, `paused: [A], head: B`) → appends `C` (if defined) then `D`
      onto `[A, B]`, producing `on-stack` with `paused: [A, B, C], head: D` (deduped).
- **`SWITCH` (`targetTaskSpaceId = T`) — flat switch (`Enter` /
  `Create New Task Space`):**
    - From `on-stack` (`paused: [A], head: B`):
        - `T === B` → `noop`.
        - `T !== B` (unrelated `C`) → `parked` (`active: C, head: B, paused: [A]`) — `B`
          stays parked as `[Head] B`!
        - `T` is in `paused` (`A`) → removes `A` from stack; remaining `[B]` stays
          `parked` (`active: A, head: B, paused: []`).
    - From `parked` (`head: B, paused: [A]`):
        - `T === B` → **resumes stack** (`outcome: "resumed-stack"`): if `paused`
          non-empty, transitions to `on-stack` (`head: B, paused: [A]`); if `paused` was
          empty (`[B]` alone), collapses to `empty` (`active: B`).
        - `T !== B` → removes `T` if it was in `paused`, updates `active: T`, keeps stack
          `parked`.
- **`POP_OR_RESUME` (`Alt+Shift+J` or top row in `Alt+Shift+T`):**
    - `on-stack` (`paused: [...rest, parent], head: B`) → saves `B`, pops `B`, switches to
      `parent` (`outcome: "popped-to-parent"`, becomes `on-stack` if `rest` non-empty else
      `empty`).
    - `parked` (`active = C | undefined, head: B, paused`) → saves `C` (if defined) and
      **jumps to `B` without popping `paused`** (`outcome: "resumed-stack"`).
    - `empty` (`active = C`) → saves `C`, sets `active: undefined`, `closeAllTabs: true`
      (`outcome: "paused-empty-stack"`).
    - `empty` (`active = undefined`) → `noop`.
- **`FINISH_ACTIVE` (`Alt+Shift+F`):**
    - `on-stack` (`paused: [...rest, parent], head: B`) → removes `B` from
      `validTaskSpaceIds`, pops to `parent` (`outcome: "finished-popped-to-parent"`).
    - `parked` (`active = C`, `head: B, paused`) → removes `C` from `validTaskSpaceIds`,
      sets `active: undefined`, `closeAllTabs: true`, **preserves `parked` stack
      `[...paused, B]`** (`outcome: "finished-to-empty"`).
    - `empty` (`active = C`) → removes `C`, sets `active: undefined`, `closeAllTabs: true`
      (`outcome: "finished-to-empty"`).
- **`CLOSE_ACTIVE` (`Alt+Shift+C`):**
    - Saves outgoing active task, sets `activeTaskSpaceId: undefined`,
      `closeAllTabs: true`; if `on-stack`, transitions `[...paused, head]` into `parked`
      (`active: undefined, head, paused`) so the stack head is preserved.
- **`REMOVE_FROM_STACK` / `DELETE_TASK_SPACE`:**
    - Removes `targetTaskSpaceId` from `taskSpaceStackIds` (and `validTaskSpaceIds` on
      delete) and re-hydrates typestate cleanly.

### 2. Storage Schema (`v5.0 → v6.0`)

- Replace `previousStackIds?: string[]` in `TaskSpaceStorage` with
  `taskSpaceStackIds?: string[]` (ordered bottom → head).
- Bump `CURRENT_VERSION` in `storage.ts` from `"5.0"` to `"6.0"`, migrating
  `previousStackIds` → `taskSpaceStackIds` (and still handling `v1.0 → v6.0` seamlessly).

### 3. Visual Layout in `Alt+Shift+T` & Status Bar (`ui.ts`)

Render directly by matching on `stackState.mode` (`"empty" | "on-stack" | "parked"`),
ordering **Current Context (`Active` + `Stack`) at the very top → `Actions` →
`Available Task Spaces`**:

- **When `mode === "on-stack"` (`[A, B, C]`, `C` active head):**
    - **`Active Task Stack` section (top):**
        - `$(arrow-right) [HEAD] C` · `N tabs | c.md`
          (`Current active head of Task Stack`)
        - `  ↳ B` · `M tabs | b.md` (`Paused on stack · 1 level down` · buttons:
          `[Remove from Stack] [Move to Backlog] [Rename] [Delete]`)
        - `    ↳ A` · `K tabs | a.md` (`Paused on stack · 2 levels down` · same buttons)
    - **`Actions` section:**
        - `$(check) Finish Current Task: C` — `Archive task & pop back to "B"`
        - `$(reply) Pop Task Stack` — `Pause "C" & return to "B" (Alt+Shift+J)`
        - `$(close) Close Current Task Space: C` —
          `Save and close tabs (parks stack) (Alt+Shift+C)`
        - `$(add) Create New Task Space` / `$(layers) Push New Subtask`
    - **`Available Task Spaces` section** (all non-stack tasks sorted by `lastAccessed`)
    - **Status Bar:** `$(layers) C (tabs) [stack: 2]`
- **When `mode === "parked"` (`[A, B]` parked, `X` active or `No Task Space`):**
    - _(if `X` active)_ **`Active Task (Off-Stack)` section (top):**
        - `$(circle-filled) [Active] X` · `N tabs | x.md` (`Working off-stack`)
    - **`Parked Task Stack` section:**
        - `$(reply) [Head] B` · `M tabs | b.md`
          (`Parked Stack Head · Enter = resume stack here` · buttons:
          `[Remove from Stack] [Move to Backlog] [Rename] [Delete]`)
        - `  ↳ A` · `K tabs | a.md` (`Paused beneath "B"` · same buttons)
    - **`Actions` section:**
        - _(if `X` active)_ `$(check) Finish Current Task: X` —
          `Archive task & close tabs (parked stack preserved)`
        - `$(layers) Resume Parked Stack: B` —
          `Save current & jump back to stack head (Alt+Shift+J)`
        - _(if `X` active)_ `$(close) Close Current Task Space: X` — ...
        - `$(add) Create New Task Space` / `$(layers) Push New Subtask`
          (`Start clean & push "X" onto stack above "B"`)
    - **`Available Task Spaces` section**
    - **Status Bar:** `$(book) X (tabs) [parked: B]` (or
      `$(circle-slash) No Task Space [parked: B]`)
- **When `mode === "empty"`:**
    - _(if `X` active)_ **`Active Task` section (top):**
        - `$(arrow-right) [Active] X` · `N tabs | x.md` (`Current active task space`)
    - **`Actions` section** → **`Available Task Spaces` section**

### Phase 2 Checklist

- [x] Create `packages/r3bl-task-management/src/taskStackStateMachine.ts` implementing the
      typestate union (`EmptyStackState | OnStackState | ParkedStackState`),
      `hydrateStackState`, `dehydrateStackState`, and `transitionStack`.
- [x] Add exhaustive pure unit tests in
      `packages/r3bl-task-management/src/__tests__/taskStackStateMachine.test.ts`
      (invariants, push from empty/on-stack/parked, flat-switch parking & head resume,
      `Alt+Shift+J` pop vs resume, `Alt+Shift+F` on-stack vs off-stack,
      close/delete/remove/external-sync).
- [x] Update `types.ts` (`taskSpaceStackIds`) and `storage.ts` (`v5.0 → v6.0` migration).
- [x] Refactor `TaskSpaceManager` (`taskSpaceManager.ts`) to delegate control-plane
      transitions to `taskStackStateMachine.ts` and execute only the resulting tab/disk
      effects.
- [x] Update `ui.ts` and `extension.ts` to project `TaskStackState` (`Active Task Stack`
      vs `Active Task (Off-Stack)` + `Parked Task Stack`, `Pop` vs `Resume Parked Stack`,
      and `[parked: <Head>]` status bar badge).
- [x] Update `taskStacking.test.ts`, `types.test.ts`, `README.md`, `AGENTS.md`,
      `CHANGELOG.md`, bump versions (`1.6.0 → 1.6.1`), and run
      `./build.sh r3bl-task-management r3bl-extension-pack`, `npm test`, and
      `./install.sh`.

---

## Phase 3: Non-Destructive Stack Browsing & Actions-First Dashboard (`1.6.4`)

- [x] Add `BrowsingStackState` (`mode: "browsing-stack"`) to `taskStackStateMachine.ts` so
      `SWITCH` (`Enter`) **never** pops or mutates `taskSpaceStackIds`—allowing free
      inspection of lower stack frames while `Alt+Shift+J` (`POP_OR_RESUME`) returns to
      `[HEAD]` and popping remains strictly explicit.
- [x] Keep `Actions` at the very top of `Alt+Shift+T` (`showTaskSpacesDialog` in `ui.ts`),
      followed by Current Context (`Active Task Stack` / `Active Task Stack (Browsing)` /
      `Active Task (Off-Stack)` + `Parked Task Stack` / `Active Task`), followed by
      `Available Task Spaces`.
- [x] Add unit tests in `taskStackStateMachine.test.ts` and `taskStacking.test.ts`, update
      `CHANGELOG.md`, bump versions (`1.6.3 → 1.6.4`), and run
      `./build.sh r3bl-task-management r3bl-extension-pack`, `npm test`, and
      `./install.sh`.

---

## Phase 4: Standardize Jump Point Navigation & Spatial Context Terminology (`1.6.5`)

- [x] Drop `"journey"` terminology and standardize on **Jump Point Navigation** across UI
      strings (`Alt+Shift+U` QuickPick placeholder + `.code-search` export), codebase
      (`JumpPointsManager`, `.vscode/jump-points.json` `v2.0 → v3.0` with automatic
      migration), READMEs, `AGENTS.md`, and `CHANGELOG.md`.
- [x] Standardize **Spatial Context** (Opened Tabs + Jump Point Navigation) across
      `packages/r3bl-task-management/README.md`, `packages/r3bl-extension-pack/README.md`,
      root `README.md`, `packages/r3bl-task-management/AGENTS.md`, `package.json`, and
      module JSDoc (`types.ts`, `taskSpaceManager.ts`, `jumpPointNavigator.ts`).
- [x] Remove redundant ASCII popup box diagram from
      `packages/r3bl-task-management/README.md` for visual consistency with the rest of
      the documentation.
- [x] Bump versions (`1.6.4 → 1.6.5`), run
      `./build.sh r3bl-task-management r3bl-extension-pack`, `npm test`, and
      `./install.sh`.
