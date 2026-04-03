# Implementation Plan: Dashboard Workflow

**Author & Methodology Attribution:** Nazmul Idris (idris@developerlife.com)

## Concept: The Dashboard Workflow

The "Dashboard Workflow" is a fluid, non-linear task management methodology designed for
individual developers and AI-agent collaboration. It represents a fundamental departure
from traditional, rigid frameworks like Scrum, Agile, or ticket-based systems.

### How it differs from Scrum, Agile, and Ticket Systems:

- **Non-Linear vs. Linear:** Traditional systems often force a linear "Sprints" or "Ready
  -> Doing -> Done" progression. The Dashboard Workflow recognizes that development is
  rarely linear. It allows developers to "pivot on a dime"—shifting context as discovery
  happens without the friction of updating a project management board.
- **Opportunistic vs. Planned:** In Scrum/Agile, scope is often locked into a sprint. The
  Dashboard Workflow encourages "fixing things when you see them." If a developer spots a
  bug or a refactoring opportunity while working on Task A, they can instantly create Task
  B (via a simple `.md` file), queue it, and choose to jump into it immediately or save it
  for the "Next" slot.
- **Fluid Scoping vs. Rigid Tickets:** Ticket-based workflows often result in "scope
  creep" within a single issue or a fragmented mess of related tickets. The Dashboard
  Workflow uses context-preserving Task Spaces to allow for fluid scoping—a developer can
  spin off sub-tasks into their own spaces with their own tab layouts, keeping the mental
  overhead low.
- **AI-Agent Synergy:** Traditional tools are built for humans to update. The Dashboard
  Workflow is built for _collaboration_. Because a task _is_ an `.md` file, an AI agent
  can autonomously drop a new task into the `task/` folder, and it instantly appears in
  the developer's "Next Queue" dashboard, ready for human review or joint implementation.

### Core Principles:

1. **1:1 Mapping:** Every task is represented by a single Markdown file (`.md`) in the
   `task/` directory. The `.md` file _is_ the task.
2. **Context Preservation:** A task space remembers the exact files, tabs, and layout open
   for that task.
3. **Fluid Routing:** Tasks move dynamically between queues:
    - **Active Task (HEAD):** The single task currently being worked on in a specific IDE
      instance.
    - **Next Queue:** A FIFO queue of planned future tasks.
    - **Previous Stack (Paused):** A LIFO stack of tasks that were paused to work on
      something else.
    - **Backlog (Icebox):** Tasks moved to `task/pending/` are out of the immediate
      workflow pipeline.
    - **Done:** Finished tasks are archived to `task/done/`.
4. **Auto-Pickup:** Creating a new `.md` file in the `task/` directory automatically adds
   it to the Next Queue.

## Implementation Steps

### Phase 1: Data Model & Storage Updates

1. **Update `types.ts`:**
    - Add `nextQueueIds?: string[]` and `previousStackIds?: string[]` to
      `TaskSpaceStorage`.
    - Update documentation for `taskFile` in `TaskSpace` to indicate it is conceptually
      required (1:1 mapping).
2. **Update `storage.ts`:**
    - Bump `CURRENT_VERSION` to `4.0`.
    - Add migration logic in `migrateIfNeeded` to initialize `nextQueueIds` and
      `previousStackIds` for v3.0 data.
    - Implement a migration step to ensure all existing `TaskSpace` entries without a
      `taskFile` have one generated in the `task/` directory.

### Phase 2: Queue Management & 1:1 Enforcing

1. **Update `taskSpaceManager.ts`:**
    - Initialize `nextQueueIds` and `previousStackIds` in the constructor.
    - Implement `addToNextQueue(id)`, `removeFromNextQueue(id)`, `addToPreviousStack(id)`,
      `removeFromPreviousStack(id)`.
    - Implement `getNextQueue()` and `getPreviousStack()`.
    - Implement `jumpToTask(id)`: Switches context, pushes current active task to Previous
      Stack, removes target from Next Queue if present.
    - Implement `finishCurrentTask()`: Archives current task space, deletes it, and
      automatically jumps to the next available task (from Next Queue, then Previous
      Stack).
    - Implement `moveToBacklog(id)`: Moves the associated `.md` file to `task/pending/`,
      deletes the active task space, and cleans it from queues.
    - Update `deleteTaskSpace` to ensure the ID is removed from all queues.

### Phase 3: Auto-Pickup (File Watcher)

1. **Update `extension.ts` (or `taskSpaceManager.ts`):**
    - Implement a file watcher for the `task/` directory (non-recursive, ignoring `done/`
      and `pending/`).
    - On **File Create (`*.md`)**: If the file is not already linked to a Task Space,
      automatically generate a new Task Space (with empty tabs) and push its ID to the
      bottom of the `nextQueueIds`.
    - On **File Delete (`*.md`)**: If the file is linked to a Task Space, automatically
      delete that Task Space and remove it from all queues.

### Phase 4: UI & Command Updates

1. **Update `ui.ts`:**
    - Reorganize the `Alt+Shift+T` QuickPick dialog into sections: `Active Task`,
      `Next Queue`, `Previous Stack (Paused)`, and `Other Task Spaces`.
    - Add inline actions (buttons) for tasks:
        - "Add to Next Queue" (list icon)
        - "Remove from Queue" (close icon)
        - "Finish Current Task" (check icon, prominently displayed)
        - "Move Task to Backlog" (archive icon)
2. **Update `extension.ts` & `package.json`:**
    - Register new commands: `r3bl-task-management.finishCurrentTask`,
      `r3bl-task-management.pauseAndJumpToNext`, `r3bl-task-management.moveTaskToBacklog`.
    - Add default keybindings (e.g., `Alt+Shift+F` for finish, `Alt+Shift+J` for jump to
      next).

### Phase 5: Documentation

1. **Update `README.md`:**
    - Introduce the "Dashboard Workflow".
    - Explicitly attribute the methodology to Nazmul Idris (idris@developerlife.com).
    - Explain the 1:1 mapping, the queues (Next, Previous, Backlog), and the new commands.
2. **Update `CHANGELOG.md`:**
    - Document the major v4.0 release changes and the transition to the Dashboard
      Workflow.
