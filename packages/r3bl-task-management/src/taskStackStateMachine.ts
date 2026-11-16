// Copyright (c) 2024-2026 R3BL LLC. Licensed under MIT License.

/**
 * Pure Typestate Control Plane for the Workspace Task Stack.
 *
 * Keep this module completely free of `vscode` imports so all stack invariants
 * and state transitions can be tested deterministically in plain Node/Jest.
 *
 * Illegal states are unrepresentable at compile time:
 * - `EmptyStackState`: no stack exists (`taskSpaceStackIds` is `[]`).
 * - `OnStackState`: `headTaskSpaceId` IS the active task space and
 *   `pausedTaskSpaceIds` is a non-empty tuple `[bottom, ..., parent]`.
 * - `BrowsingStackState`: user flat-switched (`Enter`) to inspect an interior/caller
 *   frame in `pausedTaskSpaceIds` without popping or mutating the stack; `headTaskSpaceId`
 *   remains at the top of the stack.
 * - `ParkedStackState`: `headTaskSpaceId` and `pausedTaskSpaceIds` remain parked while
 *   `activeTaskSpaceId` is either an off-stack task or `undefined` (`No Task Space`).
 */

export interface EmptyStackState {
    readonly mode: "empty"
    readonly activeTaskSpaceId: string | undefined
}

export interface OnStackState {
    readonly mode: "on-stack"
    readonly headTaskSpaceId: string
    readonly pausedTaskSpaceIds: readonly [string, ...string[]]
}

export interface BrowsingStackState {
    readonly mode: "browsing-stack"
    readonly activeTaskSpaceId: string
    readonly headTaskSpaceId: string
    readonly pausedTaskSpaceIds: readonly [string, ...string[]]
}

export interface ParkedStackState {
    readonly mode: "parked"
    readonly activeTaskSpaceId: string | undefined
    readonly headTaskSpaceId: string
    readonly pausedTaskSpaceIds: readonly string[]
}

export type TaskStackState =
    | EmptyStackState
    | OnStackState
    | BrowsingStackState
    | ParkedStackState

export interface PersistedStackSnapshot {
    readonly activeTaskSpaceId: string | undefined
    readonly taskSpaceStackIds: readonly string[]
}

export type StackEvent =
    | { readonly type: "SWITCH"; readonly targetTaskSpaceId: string }
    | { readonly type: "PUSH"; readonly targetTaskSpaceId: string }
    | { readonly type: "POP_OR_RESUME" }
    | { readonly type: "FINISH_ACTIVE" }
    | { readonly type: "CLOSE_ACTIVE" }
    | { readonly type: "REMOVE_FROM_STACK"; readonly targetTaskSpaceId: string }
    | { readonly type: "DELETE_TASK_SPACE"; readonly targetTaskSpaceId: string }
    | { readonly type: "EXTERNAL_SYNC"; readonly snapshot: PersistedStackSnapshot }

export type StackTransitionOutcome =
    | "noop"
    | "switched"
    | "browsed-stack"
    | "resumed-stack"
    | "pushed"
    | "popped-to-parent"
    | "paused-empty-stack"
    | "finished-popped-to-parent"
    | "finished-to-empty"
    | "closed-active"
    | "stack-updated"

export interface StackTransition {
    readonly state: TaskStackState
    readonly snapshot: PersistedStackSnapshot
    readonly outcome: StackTransitionOutcome
    readonly saveOutgoingTaskSpaceId?: string
    readonly openTargetTaskSpaceId?: string
    readonly closeAllTabs: boolean
}

/**
 * Returns the active task space ID for any `TaskStackState` variant.
 */
export function getActiveTaskSpaceIdFromState(state: TaskStackState): string | undefined {
    return state.mode === "on-stack" ? state.headTaskSpaceId : state.activeTaskSpaceId
}

/**
 * Deduplicates `ids` while filtering out invalid IDs, preserving the *latest*
 * occurrence of each ID so re-pushing an item moves it to the top of the stack.
 */
function dedupeKeepLatest(
    ids: readonly string[],
    validTaskSpaceIds: ReadonlySet<string>,
): string[] {
    const seenFromTop = new Set<string>()
    const reversedResult: string[] = []
    for (let i = ids.length - 1; i >= 0; i--) {
        const id = ids[i]
        if (!validTaskSpaceIds.has(id) || seenFromTop.has(id)) {
            continue
        }
        seenFromTop.add(id)
        reversedResult.push(id)
    }
    return reversedResult.reverse()
}

/**
 * Hydrates a persisted `(activeTaskSpaceId, taskSpaceStackIds)` pair into a
 * normalized `TaskStackState` enforcing all stack invariants:
 * 1. Every ID exists in `validTaskSpaceIds`.
 * 2. No duplicate IDs in the stack.
 * 3. A 1-element stack `[X]` when `activeTaskSpaceId === X` has 0 paused callers
 *    beneath it, so it collapses to `{ mode: "empty", activeTaskSpaceId: X }`.
 */
export function hydrateStackState(
    snapshot: PersistedStackSnapshot,
    validTaskSpaceIds: ReadonlySet<string>,
): TaskStackState {
    const activeTaskSpaceId =
        snapshot.activeTaskSpaceId && validTaskSpaceIds.has(snapshot.activeTaskSpaceId)
            ? snapshot.activeTaskSpaceId
            : undefined

    const cleanStack = dedupeKeepLatest(snapshot.taskSpaceStackIds, validTaskSpaceIds)

    if (cleanStack.length === 0) {
        return { mode: "empty", activeTaskSpaceId }
    }

    if (cleanStack.length === 1) {
        const onlyId = cleanStack[0]
        if (activeTaskSpaceId === onlyId) {
            return { mode: "empty", activeTaskSpaceId: onlyId }
        }
        return {
            mode: "parked",
            activeTaskSpaceId,
            headTaskSpaceId: onlyId,
            pausedTaskSpaceIds: [],
        }
    }

    const headTaskSpaceId = cleanStack[cleanStack.length - 1]
    const paused = cleanStack.slice(0, -1)
    const nonEmptyPaused: readonly [string, ...string[]] = [paused[0], ...paused.slice(1)]

    if (activeTaskSpaceId === headTaskSpaceId) {
        return {
            mode: "on-stack",
            headTaskSpaceId,
            pausedTaskSpaceIds: nonEmptyPaused,
        }
    }

    if (activeTaskSpaceId !== undefined && paused.includes(activeTaskSpaceId)) {
        return {
            mode: "browsing-stack",
            activeTaskSpaceId,
            headTaskSpaceId,
            pausedTaskSpaceIds: nonEmptyPaused,
        }
    }

    return {
        mode: "parked",
        activeTaskSpaceId,
        headTaskSpaceId,
        pausedTaskSpaceIds: paused,
    }
}

/**
 * Serializes a `TaskStackState` back into the flat persistence snapshot.
 */
export function dehydrateStackState(state: TaskStackState): PersistedStackSnapshot {
    switch (state.mode) {
        case "empty":
            return {
                activeTaskSpaceId: state.activeTaskSpaceId,
                taskSpaceStackIds: [],
            }
        case "on-stack":
            return {
                activeTaskSpaceId: state.headTaskSpaceId,
                taskSpaceStackIds: [...state.pausedTaskSpaceIds, state.headTaskSpaceId],
            }
        case "browsing-stack":
        case "parked":
            return {
                activeTaskSpaceId: state.activeTaskSpaceId,
                taskSpaceStackIds: [...state.pausedTaskSpaceIds, state.headTaskSpaceId],
            }
        default: {
            const _exhaustive: never = state
            return _exhaustive
        }
    }
}

function buildResult(
    nextSnapshot: PersistedStackSnapshot,
    validTaskSpaceIds: ReadonlySet<string>,
    outcome: StackTransitionOutcome,
    effects: {
        saveOutgoingTaskSpaceId?: string
        openTargetTaskSpaceId?: string
        closeAllTabs?: boolean
    } = {},
): StackTransition {
    const state = hydrateStackState(nextSnapshot, validTaskSpaceIds)
    const snapshot = dehydrateStackState(state)
    return {
        state,
        snapshot,
        outcome,
        saveOutgoingTaskSpaceId: effects.saveOutgoingTaskSpaceId,
        openTargetTaskSpaceId: effects.openTargetTaskSpaceId,
        closeAllTabs: effects.closeAllTabs ?? false,
    }
}

/**
 * Pure state machine reducer for all task stack operations.
 */
export function transitionStack(
    currentState: TaskStackState,
    event: StackEvent,
    validTaskSpaceIds: ReadonlySet<string>,
): StackTransition {
    const normalizedCurrent = hydrateStackState(
        dehydrateStackState(currentState),
        validTaskSpaceIds,
    )
    const currentSnapshot = dehydrateStackState(normalizedCurrent)
    const currentActiveId = getActiveTaskSpaceIdFromState(normalizedCurrent)

    switch (event.type) {
        case "SWITCH": {
            const { targetTaskSpaceId } = event
            if (!validTaskSpaceIds.has(targetTaskSpaceId)) {
                return buildResult(currentSnapshot, validTaskSpaceIds, "noop")
            }
            if (currentActiveId === targetTaskSpaceId) {
                return buildResult(currentSnapshot, validTaskSpaceIds, "noop")
            }

            // Switching NEVER mutates `taskSpaceStackIds`:
            // - Selecting `headTaskSpaceId` from `parked` or `browsing-stack` resumes the head.
            // - Selecting a paused caller frame enters `browsing-stack` without popping!
            // - Selecting an off-stack task parks the stack intact.
            const isResumingHead =
                (normalizedCurrent.mode === "parked" ||
                    normalizedCurrent.mode === "browsing-stack") &&
                targetTaskSpaceId === normalizedCurrent.headTaskSpaceId
            const isBrowsingStackFrame =
                !isResumingHead &&
                currentSnapshot.taskSpaceStackIds.includes(targetTaskSpaceId)

            const outcome: StackTransitionOutcome = isResumingHead
                ? "resumed-stack"
                : isBrowsingStackFrame
                  ? "browsed-stack"
                  : "switched"

            return buildResult(
                {
                    activeTaskSpaceId: targetTaskSpaceId,
                    taskSpaceStackIds: currentSnapshot.taskSpaceStackIds,
                },
                validTaskSpaceIds,
                outcome,
                {
                    saveOutgoingTaskSpaceId: currentActiveId,
                    openTargetTaskSpaceId: targetTaskSpaceId,
                },
            )
        }

        case "PUSH": {
            const { targetTaskSpaceId } = event
            if (!validTaskSpaceIds.has(targetTaskSpaceId)) {
                return buildResult(currentSnapshot, validTaskSpaceIds, "noop")
            }

            // Special case: pushing the currently active off-stack task onto a parked stack
            // (`[Push onto Parked Stack]` inline button on the `[Active]` off-stack row).
            if (currentActiveId === targetTaskSpaceId) {
                if (normalizedCurrent.mode !== "parked") {
                    return buildResult(currentSnapshot, validTaskSpaceIds, "noop")
                }
                const joinedStack = dedupeKeepLatest(
                    [...currentSnapshot.taskSpaceStackIds, targetTaskSpaceId],
                    validTaskSpaceIds,
                )
                return buildResult(
                    {
                        activeTaskSpaceId: targetTaskSpaceId,
                        taskSpaceStackIds: joinedStack,
                    },
                    validTaskSpaceIds,
                    "pushed",
                    {
                        saveOutgoingTaskSpaceId: currentActiveId,
                    },
                )
            }

            // Only append `currentActiveId` if it isn't already on the stack (preserves
            // caller frame ordering when pushing a new subtask while browsing a frame).
            const activeAlreadyInStack =
                !!currentActiveId &&
                currentSnapshot.taskSpaceStackIds.includes(currentActiveId)
            const appendedStack = [
                ...currentSnapshot.taskSpaceStackIds,
                ...(currentActiveId && !activeAlreadyInStack ? [currentActiveId] : []),
                targetTaskSpaceId,
            ]
            const dedupedStack = dedupeKeepLatest(appendedStack, validTaskSpaceIds)
            const outcome: StackTransitionOutcome =
                dedupedStack.length >= 2 ? "pushed" : "switched"

            return buildResult(
                {
                    activeTaskSpaceId: targetTaskSpaceId,
                    taskSpaceStackIds: dedupedStack,
                },
                validTaskSpaceIds,
                outcome,
                {
                    saveOutgoingTaskSpaceId: currentActiveId,
                    openTargetTaskSpaceId: targetTaskSpaceId,
                },
            )
        }

        case "POP_OR_RESUME": {
            switch (normalizedCurrent.mode) {
                case "on-stack": {
                    const parentId =
                        normalizedCurrent.pausedTaskSpaceIds[
                            normalizedCurrent.pausedTaskSpaceIds.length - 1
                        ]
                    return buildResult(
                        {
                            activeTaskSpaceId: parentId,
                            taskSpaceStackIds: normalizedCurrent.pausedTaskSpaceIds,
                        },
                        validTaskSpaceIds,
                        "popped-to-parent",
                        {
                            saveOutgoingTaskSpaceId: normalizedCurrent.headTaskSpaceId,
                            openTargetTaskSpaceId: parentId,
                        },
                    )
                }
                case "browsing-stack":
                case "parked": {
                    const headId = normalizedCurrent.headTaskSpaceId
                    return buildResult(
                        {
                            activeTaskSpaceId: headId,
                            taskSpaceStackIds: [
                                ...normalizedCurrent.pausedTaskSpaceIds,
                                headId,
                            ],
                        },
                        validTaskSpaceIds,
                        "resumed-stack",
                        {
                            saveOutgoingTaskSpaceId: normalizedCurrent.activeTaskSpaceId,
                            openTargetTaskSpaceId: headId,
                        },
                    )
                }
                case "empty": {
                    if (!normalizedCurrent.activeTaskSpaceId) {
                        return buildResult(currentSnapshot, validTaskSpaceIds, "noop")
                    }
                    return buildResult(
                        {
                            activeTaskSpaceId: undefined,
                            taskSpaceStackIds: [],
                        },
                        validTaskSpaceIds,
                        "paused-empty-stack",
                        {
                            saveOutgoingTaskSpaceId: normalizedCurrent.activeTaskSpaceId,
                            closeAllTabs: true,
                        },
                    )
                }
                default: {
                    const _exhaustive: never = normalizedCurrent
                    return _exhaustive
                }
            }
        }

        case "FINISH_ACTIVE": {
            switch (normalizedCurrent.mode) {
                case "on-stack": {
                    const finishedId = normalizedCurrent.headTaskSpaceId
                    const nextValidIds = new Set(validTaskSpaceIds)
                    nextValidIds.delete(finishedId)
                    const parentId =
                        normalizedCurrent.pausedTaskSpaceIds[
                            normalizedCurrent.pausedTaskSpaceIds.length - 1
                        ]
                    return buildResult(
                        {
                            activeTaskSpaceId: parentId,
                            taskSpaceStackIds: normalizedCurrent.pausedTaskSpaceIds,
                        },
                        nextValidIds,
                        "finished-popped-to-parent",
                        {
                            openTargetTaskSpaceId: parentId,
                        },
                    )
                }
                case "browsing-stack": {
                    const finishedId = normalizedCurrent.activeTaskSpaceId
                    const nextValidIds = new Set(validTaskSpaceIds)
                    nextValidIds.delete(finishedId)
                    const remainingStack = [
                        ...normalizedCurrent.pausedTaskSpaceIds.filter(
                            (id) => id !== finishedId,
                        ),
                        normalizedCurrent.headTaskSpaceId,
                    ]
                    return buildResult(
                        {
                            activeTaskSpaceId: normalizedCurrent.headTaskSpaceId,
                            taskSpaceStackIds: remainingStack,
                        },
                        nextValidIds,
                        "finished-popped-to-parent",
                        {
                            openTargetTaskSpaceId: normalizedCurrent.headTaskSpaceId,
                        },
                    )
                }
                case "parked": {
                    if (!normalizedCurrent.activeTaskSpaceId) {
                        return buildResult(currentSnapshot, validTaskSpaceIds, "noop")
                    }
                    const nextValidIds = new Set(validTaskSpaceIds)
                    nextValidIds.delete(normalizedCurrent.activeTaskSpaceId)
                    return buildResult(
                        {
                            activeTaskSpaceId: undefined,
                            taskSpaceStackIds: [
                                ...normalizedCurrent.pausedTaskSpaceIds,
                                normalizedCurrent.headTaskSpaceId,
                            ],
                        },
                        nextValidIds,
                        "finished-to-empty",
                        {
                            closeAllTabs: true,
                        },
                    )
                }
                case "empty": {
                    if (!normalizedCurrent.activeTaskSpaceId) {
                        return buildResult(currentSnapshot, validTaskSpaceIds, "noop")
                    }
                    const nextValidIds = new Set(validTaskSpaceIds)
                    nextValidIds.delete(normalizedCurrent.activeTaskSpaceId)
                    return buildResult(
                        {
                            activeTaskSpaceId: undefined,
                            taskSpaceStackIds: [],
                        },
                        nextValidIds,
                        "finished-to-empty",
                        {
                            closeAllTabs: true,
                        },
                    )
                }
                default: {
                    const _exhaustive: never = normalizedCurrent
                    return _exhaustive
                }
            }
        }

        case "CLOSE_ACTIVE": {
            if (!currentActiveId) {
                return buildResult(currentSnapshot, validTaskSpaceIds, "noop")
            }
            return buildResult(
                {
                    activeTaskSpaceId: undefined,
                    taskSpaceStackIds: currentSnapshot.taskSpaceStackIds,
                },
                validTaskSpaceIds,
                "closed-active",
                {
                    saveOutgoingTaskSpaceId: currentActiveId,
                    closeAllTabs: true,
                },
            )
        }

        case "REMOVE_FROM_STACK": {
            const nextStackIds = currentSnapshot.taskSpaceStackIds.filter(
                (id) => id !== event.targetTaskSpaceId,
            )
            if (nextStackIds.length === currentSnapshot.taskSpaceStackIds.length) {
                return buildResult(currentSnapshot, validTaskSpaceIds, "noop")
            }
            return buildResult(
                {
                    activeTaskSpaceId: currentActiveId,
                    taskSpaceStackIds: nextStackIds,
                },
                validTaskSpaceIds,
                "stack-updated",
            )
        }

        case "DELETE_TASK_SPACE": {
            const nextValidIds = new Set(validTaskSpaceIds)
            nextValidIds.delete(event.targetTaskSpaceId)
            const wasActive = currentActiveId === event.targetTaskSpaceId
            const nextStackIds = currentSnapshot.taskSpaceStackIds.filter(
                (id) => id !== event.targetTaskSpaceId,
            )
            return buildResult(
                {
                    activeTaskSpaceId: wasActive ? undefined : currentActiveId,
                    taskSpaceStackIds: nextStackIds,
                },
                nextValidIds,
                wasActive ? "closed-active" : "stack-updated",
                {
                    closeAllTabs: wasActive,
                },
            )
        }

        case "EXTERNAL_SYNC": {
            return buildResult(event.snapshot, validTaskSpaceIds, "stack-updated")
        }

        default: {
            const _exhaustive: never = event
            return _exhaustive
        }
    }
}
