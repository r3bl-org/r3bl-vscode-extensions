// Copyright (c) 2024-2026 R3BL LLC. Licensed under MIT License.

import {
    TaskStackState,
    hydrateStackState,
    dehydrateStackState,
    transitionStack,
    getActiveTaskSpaceIdFromState,
} from "../taskStackStateMachine"

const VALID_IDS = new Set(["A", "B", "C", "D", "E"])

describe("taskStackStateMachine invariants (hydrateStackState / dehydrateStackState)", () => {
    it("hydrates empty stack cleanly and strips unknown activeTaskSpaceId", () => {
        const s1 = hydrateStackState(
            { activeTaskSpaceId: "A", taskSpaceStackIds: [] },
            VALID_IDS,
        )
        expect(s1).toEqual({ mode: "empty", activeTaskSpaceId: "A" })

        const s2 = hydrateStackState(
            { activeTaskSpaceId: "MISSING", taskSpaceStackIds: [] },
            VALID_IDS,
        )
        expect(s2).toEqual({ mode: "empty", activeTaskSpaceId: undefined })
    })

    it("collapses degenerate 1-element stack [A] when activeTaskSpaceId === A", () => {
        const s = hydrateStackState(
            { activeTaskSpaceId: "A", taskSpaceStackIds: ["A"] },
            VALID_IDS,
        )
        expect(s).toEqual({ mode: "empty", activeTaskSpaceId: "A" })
        expect(dehydrateStackState(s)).toEqual({
            activeTaskSpaceId: "A",
            taskSpaceStackIds: [],
        })
    })

    it("preserves 1-element stack [A] as parked when activeTaskSpaceId !== A (e.g. v5->v6 migration)", () => {
        const s = hydrateStackState(
            { activeTaskSpaceId: "C", taskSpaceStackIds: ["A"] },
            VALID_IDS,
        )
        expect(s).toEqual({
            mode: "parked",
            activeTaskSpaceId: "C",
            headTaskSpaceId: "A",
            pausedTaskSpaceIds: [],
        })
    })

    it("deduplicates keeping latest occurrence and strips deleted IDs", () => {
        const s = hydrateStackState(
            {
                activeTaskSpaceId: "B",
                taskSpaceStackIds: ["A", "B", "DELETED", "A", "B"],
            },
            VALID_IDS,
        )
        expect(s).toEqual({
            mode: "on-stack",
            headTaskSpaceId: "B",
            pausedTaskSpaceIds: ["A"],
        })
    })
})

describe("taskStackStateMachine transitions", () => {
    it("reproduces and fixes the flat-switch bug: switching away from stacked head parks head B instead of orphaning A", () => {
        // 1. Start on A (empty stack)
        let state: TaskStackState = hydrateStackState(
            { activeTaskSpaceId: "A", taskSpaceStackIds: [] },
            VALID_IDS,
        )

        // 2. Push B onto A -> on-stack [A, B]
        const pushB = transitionStack(
            state,
            { type: "PUSH", targetTaskSpaceId: "B" },
            VALID_IDS,
        )
        state = pushB.state
        expect(pushB.outcome).toBe("pushed")
        expect(pushB.saveOutgoingTaskSpaceId).toBe("A")
        expect(pushB.openTargetTaskSpaceId).toBe("B")
        expect(state).toEqual({
            mode: "on-stack",
            headTaskSpaceId: "B",
            pausedTaskSpaceIds: ["A"],
        })

        // 3. Flat-switch (Enter) to unrelated C -> stack is PARKED with Head = B and Paused = [A]
        const switchC = transitionStack(
            state,
            { type: "SWITCH", targetTaskSpaceId: "C" },
            VALID_IDS,
        )
        state = switchC.state
        expect(switchC.outcome).toBe("switched")
        expect(switchC.saveOutgoingTaskSpaceId).toBe("B")
        expect(switchC.openTargetTaskSpaceId).toBe("C")
        expect(state).toEqual({
            mode: "parked",
            activeTaskSpaceId: "C",
            headTaskSpaceId: "B",
            pausedTaskSpaceIds: ["A"],
        })

        // 4. Alt+Shift+J (POP_OR_RESUME) while off-stack on C jumps back to Parked Head B WITHOUT popping A!
        const resumeB = transitionStack(state, { type: "POP_OR_RESUME" }, VALID_IDS)
        state = resumeB.state
        expect(resumeB.outcome).toBe("resumed-stack")
        expect(resumeB.saveOutgoingTaskSpaceId).toBe("C")
        expect(resumeB.openTargetTaskSpaceId).toBe("B")
        expect(state).toEqual({
            mode: "on-stack",
            headTaskSpaceId: "B",
            pausedTaskSpaceIds: ["A"],
        })

        // 5. Now on-stack at B, Alt+Shift+J pops B and returns to A, collapsing stack to empty
        const popB = transitionStack(state, { type: "POP_OR_RESUME" }, VALID_IDS)
        state = popB.state
        expect(popB.outcome).toBe("popped-to-parent")
        expect(popB.saveOutgoingTaskSpaceId).toBe("B")
        expect(popB.openTargetTaskSpaceId).toBe("A")
        expect(state).toEqual({ mode: "empty", activeTaskSpaceId: "A" })
        expect(popB.snapshot.taskSpaceStackIds).toEqual([])
    })

    it("allows pushing from anywhere (empty, on-stack, and off-stack with a parked stack)", () => {
        // Start with parked stack [A, B] while working off-stack on C
        const initial = hydrateStackState(
            { activeTaskSpaceId: "C", taskSpaceStackIds: ["A", "B"] },
            VALID_IDS,
        )
        expect(initial.mode).toBe("parked")

        // Push D while on C -> appends C then D onto [A, B] => [A, B, C, D]
        const pushD = transitionStack(
            initial,
            { type: "PUSH", targetTaskSpaceId: "D" },
            VALID_IDS,
        )
        expect(pushD.outcome).toBe("pushed")
        expect(pushD.saveOutgoingTaskSpaceId).toBe("C")
        expect(pushD.openTargetTaskSpaceId).toBe("D")
        expect(pushD.state).toEqual({
            mode: "on-stack",
            headTaskSpaceId: "D",
            pausedTaskSpaceIds: ["A", "B", "C"],
        })

        // Popping D returns to C (still on-stack above B and A!)
        const popD = transitionStack(pushD.state, { type: "POP_OR_RESUME" }, VALID_IDS)
        expect(popD.state).toEqual({
            mode: "on-stack",
            headTaskSpaceId: "C",
            pausedTaskSpaceIds: ["A", "B"],
        })
    })

    it("resumes parked stack when selecting Head via SWITCH (Enter in Dashboard)", () => {
        const parked = hydrateStackState(
            { activeTaskSpaceId: "C", taskSpaceStackIds: ["A", "B"] },
            VALID_IDS,
        )
        const resumed = transitionStack(
            parked,
            { type: "SWITCH", targetTaskSpaceId: "B" },
            VALID_IDS,
        )
        expect(resumed.outcome).toBe("resumed-stack")
        expect(resumed.state).toEqual({
            mode: "on-stack",
            headTaskSpaceId: "B",
            pausedTaskSpaceIds: ["A"],
        })
    })

    it("finishing an off-stack task preserves the parked stack and closes tabs instead of hijacking parent A", () => {
        const parked = hydrateStackState(
            { activeTaskSpaceId: "C", taskSpaceStackIds: ["A", "B"] },
            VALID_IDS,
        )
        const finC = transitionStack(parked, { type: "FINISH_ACTIVE" }, VALID_IDS)
        expect(finC.outcome).toBe("finished-to-empty")
        expect(finC.closeAllTabs).toBe(true)
        expect(finC.openTargetTaskSpaceId).toBeUndefined()
        expect(finC.state).toEqual({
            mode: "parked",
            activeTaskSpaceId: undefined,
            headTaskSpaceId: "B",
            pausedTaskSpaceIds: ["A"],
        })

        // Subsequent Alt+Shift+J from No Task Space jumps straight back to parked head B!
        const nextValid = new Set(["A", "B", "D", "E"])
        const resumeAfterFinish = transitionStack(
            finC.state,
            { type: "POP_OR_RESUME" },
            nextValid,
        )
        expect(resumeAfterFinish.outcome).toBe("resumed-stack")
        expect(resumeAfterFinish.openTargetTaskSpaceId).toBe("B")
        expect(resumeAfterFinish.state).toEqual({
            mode: "on-stack",
            headTaskSpaceId: "B",
            pausedTaskSpaceIds: ["A"],
        })
    })

    it("finishing an on-stack task pops back to parent", () => {
        const onStack = hydrateStackState(
            { activeTaskSpaceId: "C", taskSpaceStackIds: ["A", "B", "C"] },
            VALID_IDS,
        )
        const finC = transitionStack(onStack, { type: "FINISH_ACTIVE" }, VALID_IDS)
        expect(finC.outcome).toBe("finished-popped-to-parent")
        expect(finC.openTargetTaskSpaceId).toBe("B")
        expect(finC.closeAllTabs).toBe(false)
        expect(finC.state).toEqual({
            mode: "on-stack",
            headTaskSpaceId: "B",
            pausedTaskSpaceIds: ["A"],
        })
    })

    it("closing active task while on-stack parks the stack with its head preserved", () => {
        const onStack = hydrateStackState(
            { activeTaskSpaceId: "B", taskSpaceStackIds: ["A", "B"] },
            VALID_IDS,
        )
        const closed = transitionStack(onStack, { type: "CLOSE_ACTIVE" }, VALID_IDS)
        expect(closed.outcome).toBe("closed-active")
        expect(closed.saveOutgoingTaskSpaceId).toBe("B")
        expect(closed.closeAllTabs).toBe(true)
        expect(getActiveTaskSpaceIdFromState(closed.state)).toBeUndefined()
        expect(closed.state).toEqual({
            mode: "parked",
            activeTaskSpaceId: undefined,
            headTaskSpaceId: "B",
            pausedTaskSpaceIds: ["A"],
        })
    })

    it("handles REMOVE_FROM_STACK, DELETE_TASK_SPACE, and multi-IDE EXTERNAL_SYNC cleanly", () => {
        const onStack = hydrateStackState(
            { activeTaskSpaceId: "B", taskSpaceStackIds: ["A", "B"] },
            VALID_IDS,
        )

        // Removing paused A leaves [B] while active === B -> collapses to empty!
        const removedA = transitionStack(
            onStack,
            { type: "REMOVE_FROM_STACK", targetTaskSpaceId: "A" },
            VALID_IDS,
        )
        expect(removedA.outcome).toBe("stack-updated")
        expect(removedA.state).toEqual({ mode: "empty", activeTaskSpaceId: "B" })

        // Deleting active head B clears active, closes tabs, and leaves [A] parked?
        // Wait: when active becomes undefined and [A] remains, A is preserved as parked head!
        const deletedB = transitionStack(
            onStack,
            { type: "DELETE_TASK_SPACE", targetTaskSpaceId: "B" },
            VALID_IDS,
        )
        expect(deletedB.outcome).toBe("closed-active")
        expect(deletedB.closeAllTabs).toBe(true)
        expect(deletedB.state).toEqual({
            mode: "parked",
            activeTaskSpaceId: undefined,
            headTaskSpaceId: "A",
            pausedTaskSpaceIds: [],
        })

        // Multi-IDE sync: IDE #2 has C active locally, IDE #1 writes stack [A, D] to disk
        const synced = transitionStack(
            { mode: "empty", activeTaskSpaceId: "C" },
            {
                type: "EXTERNAL_SYNC",
                snapshot: { activeTaskSpaceId: "C", taskSpaceStackIds: ["A", "D"] },
            },
            VALID_IDS,
        )
        expect(synced.state).toEqual({
            mode: "parked",
            activeTaskSpaceId: "C",
            headTaskSpaceId: "D",
            pausedTaskSpaceIds: ["A"],
        })
    })

    it("supports non-destructive stack frame browsing (SWITCH never pops or mutates the stack)", () => {
        // Stack [A, B, C] with C active at the head
        const initial = hydrateStackState(
            { activeTaskSpaceId: "C", taskSpaceStackIds: ["A", "B", "C"] },
            VALID_IDS,
        )
        expect(initial).toEqual({
            mode: "on-stack",
            headTaskSpaceId: "C",
            pausedTaskSpaceIds: ["A", "B"],
        })

        // 1. Switch (Enter) to caller frame A -> enters `browsing-stack` WITHOUT popping B or C!
        const browseA = transitionStack(
            initial,
            { type: "SWITCH", targetTaskSpaceId: "A" },
            VALID_IDS,
        )
        expect(browseA.outcome).toBe("browsed-stack")
        expect(browseA.saveOutgoingTaskSpaceId).toBe("C")
        expect(browseA.openTargetTaskSpaceId).toBe("A")
        expect(browseA.snapshot.taskSpaceStackIds).toEqual(["A", "B", "C"])
        expect(browseA.state).toEqual({
            mode: "browsing-stack",
            activeTaskSpaceId: "A",
            headTaskSpaceId: "C",
            pausedTaskSpaceIds: ["A", "B"],
        })

        // 2. Switch to caller frame B -> still `browsing-stack` with [A, B, C] intact
        const browseB = transitionStack(
            browseA.state,
            { type: "SWITCH", targetTaskSpaceId: "B" },
            VALID_IDS,
        )
        expect(browseB.outcome).toBe("browsed-stack")
        expect(browseB.snapshot.taskSpaceStackIds).toEqual(["A", "B", "C"])
        expect(browseB.state).toEqual({
            mode: "browsing-stack",
            activeTaskSpaceId: "B",
            headTaskSpaceId: "C",
            pausedTaskSpaceIds: ["A", "B"],
        })

        // 3. Alt+Shift+J (`POP_OR_RESUME`) while browsing frame B returns to Head C without popping!
        const returnToHead = transitionStack(
            browseB.state,
            { type: "POP_OR_RESUME" },
            VALID_IDS,
        )
        expect(returnToHead.outcome).toBe("resumed-stack")
        expect(returnToHead.saveOutgoingTaskSpaceId).toBe("B")
        expect(returnToHead.openTargetTaskSpaceId).toBe("C")
        expect(returnToHead.state).toEqual({
            mode: "on-stack",
            headTaskSpaceId: "C",
            pausedTaskSpaceIds: ["A", "B"],
        })

        // 4. Pushing new task D while browsing frame A preserves [A, B, C] order -> [A, B, C, D]
        const pushFromFrame = transitionStack(
            browseA.state,
            { type: "PUSH", targetTaskSpaceId: "D" },
            VALID_IDS,
        )
        expect(pushFromFrame.outcome).toBe("pushed")
        expect(pushFromFrame.saveOutgoingTaskSpaceId).toBe("A")
        expect(pushFromFrame.openTargetTaskSpaceId).toBe("D")
        expect(pushFromFrame.state).toEqual({
            mode: "on-stack",
            headTaskSpaceId: "D",
            pausedTaskSpaceIds: ["A", "B", "C"],
        })

        // 5. Finishing middle frame B while browsing it removes B and returns to Head C -> [A, C]
        const finishFrameB = transitionStack(
            browseB.state,
            { type: "FINISH_ACTIVE" },
            VALID_IDS,
        )
        expect(finishFrameB.outcome).toBe("finished-popped-to-parent")
        expect(finishFrameB.openTargetTaskSpaceId).toBe("C")
        expect(finishFrameB.state).toEqual({
            mode: "on-stack",
            headTaskSpaceId: "C",
            pausedTaskSpaceIds: ["A"],
        })
    })

    it("supports pushing the currently active off-stack task onto a parked stack ([Push onto Parked Stack] button)", () => {
        const parked = hydrateStackState(
            { activeTaskSpaceId: "C", taskSpaceStackIds: ["A", "B"] },
            VALID_IDS,
        )
        const joined = transitionStack(
            parked,
            { type: "PUSH", targetTaskSpaceId: "C" },
            VALID_IDS,
        )
        expect(joined.outcome).toBe("pushed")
        expect(joined.saveOutgoingTaskSpaceId).toBe("C")
        expect(joined.openTargetTaskSpaceId).toBeUndefined()
        expect(joined.state).toEqual({
            mode: "on-stack",
            headTaskSpaceId: "C",
            pausedTaskSpaceIds: ["A", "B"],
        })
    })
})
