// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from "vscode"
import {
    CURATED_TARGETS,
    buildTargetQuickPickItems,
    formatStatusBarText,
    formatStatusBarTooltip,
    getHumanReadableTargetLabel,
    getTargetConfigurationScope,
} from "../rustTargetSwitcher"

describe("rustTargetSwitcher", () => {
    describe("CURATED_TARGETS", () => {
        it("contains the expected 4 curated targets", () => {
            const labels = CURATED_TARGETS.map((t) => t.label)
            expect(labels).toEqual([
                "aarch64-apple-darwin",
                "x86_64-unknown-linux-gnu",
                "x86_64-pc-windows-gnu",
                "x86_64-pc-windows-msvc",
            ])
        })
    })

    describe("buildTargetQuickPickItems", () => {
        it("marks Host / Default as current when target is undefined", () => {
            const items = buildTargetQuickPickItems(undefined)

            // First item is host
            expect(items[0].targetKind).toBe("host")
            expect(items[0].label).toContain("$(check) Host / Default")
            expect(items[0].description).toContain("(Current)")
            expect(items[0].targetTriple).toBeUndefined()

            // Curated targets are not marked current
            const curatedItems = items.filter((it) => it.targetKind === "curated")
            expect(curatedItems.length).toBe(4)
            for (const item of curatedItems) {
                expect(item.label).not.toContain("$(check)")
                expect(item.description).not.toContain("(Current)")
            }

            // Last item is custom prompt
            const lastItem = items[items.length - 1]
            expect(lastItem.targetKind).toBe("custom-prompt")
            expect(lastItem.label).toContain("Custom Target...")
        })

        it("marks Host / Default as current when target is whitespace", () => {
            const items = buildTargetQuickPickItems("   ")
            expect(items[0].targetKind).toBe("host")
            expect(items[0].label).toContain("$(check)")
        })

        it("marks specific curated target as current when matched", () => {
            const items = buildTargetQuickPickItems("x86_64-pc-windows-gnu")

            // Host is not current
            expect(items[0].targetKind).toBe("host")
            expect(items[0].label).not.toContain("$(check)")

            // Matching curated target is current
            const winGnu = items.find((it) => it.targetTriple === "x86_64-pc-windows-gnu")
            expect(winGnu).toBeDefined()
            expect(winGnu?.label).toBe("$(check) x86_64-pc-windows-gnu")
            expect(winGnu?.description).toContain("(Current)")

            // Other curated targets are not current
            const linuxGnu = items.find(
                (it) => it.targetTriple === "x86_64-unknown-linux-gnu",
            )
            expect(linuxGnu?.label).toBe("x86_64-unknown-linux-gnu")
            expect(linuxGnu?.description).not.toContain("(Current)")

            // No active-custom item
            expect(items.some((it) => it.targetKind === "active-custom")).toBe(false)
        })

        it("inserts active-custom item at top when current target is not in curated list", () => {
            const items = buildTargetQuickPickItems("wasm32-unknown-unknown")

            // Host is not current
            expect(items[0].targetKind).toBe("host")
            expect(items[0].label).not.toContain("$(check)")

            // Second item is the active custom target
            expect(items[1].targetKind).toBe("active-custom")
            expect(items[1].label).toBe("$(check) wasm32-unknown-unknown")
            expect(items[1].description).toContain("(Current)")
            expect(items[1].targetTriple).toBe("wasm32-unknown-unknown")

            // Curated targets follow
            const curatedItems = items.filter((it) => it.targetKind === "curated")
            expect(curatedItems.length).toBe(4)

            // Last item is custom prompt
            expect(items[items.length - 1].targetKind).toBe("custom-prompt")
        })
    })

    describe("getHumanReadableTargetLabel", () => {
        it("returns Host for undefined or empty targets", () => {
            expect(getHumanReadableTargetLabel(undefined)).toBe("Host")
            expect(getHumanReadableTargetLabel("")).toBe("Host")
            expect(getHumanReadableTargetLabel("   ")).toBe("Host")
        })

        it("returns human-readable labels for curated targets", () => {
            expect(getHumanReadableTargetLabel("x86_64-unknown-linux-gnu")).toBe(
                "Linux x64",
            )
            expect(getHumanReadableTargetLabel("aarch64-apple-darwin")).toBe("macOS ARM")
            expect(getHumanReadableTargetLabel("x86_64-pc-windows-gnu")).toBe(
                "Win-GNU x64",
            )
            expect(getHumanReadableTargetLabel("x86_64-pc-windows-msvc")).toBe(
                "Win-MSVC x64",
            )
        })

        it("returns Wasm32 for wasm targets", () => {
            expect(getHumanReadableTargetLabel("wasm32-unknown-unknown")).toBe("Wasm32")
            expect(getHumanReadableTargetLabel("wasm32-wasip1")).toBe("Wasm32")
        })

        it("returns raw string for other custom targets", () => {
            expect(getHumanReadableTargetLabel("thumbv7em-none-eabihf")).toBe(
                "thumbv7em-none-eabihf",
            )
        })
    })

    describe("formatStatusBarText", () => {
        it("returns Host for undefined or empty targets", () => {
            expect(formatStatusBarText(undefined)).toBe("$(chip) Host")
            expect(formatStatusBarText("")).toBe("$(chip) Host")
            expect(formatStatusBarText("   ")).toBe("$(chip) Host")
        })

        it("returns short human-readable target label when specified", () => {
            expect(formatStatusBarText("x86_64-unknown-linux-gnu")).toBe(
                "$(chip) Linux x64",
            )
            expect(formatStatusBarText("aarch64-apple-darwin")).toBe("$(chip) macOS ARM")
            expect(formatStatusBarText("x86_64-pc-windows-gnu")).toBe(
                "$(chip) Win-GNU x64",
            )
            expect(formatStatusBarText("x86_64-pc-windows-msvc")).toBe(
                "$(chip) Win-MSVC x64",
            )
            expect(formatStatusBarText("wasm32-unknown-unknown")).toBe("$(chip) Wasm32")
        })
    })

    describe("formatStatusBarTooltip", () => {
        it("returns default tooltip when target is undefined", () => {
            const tooltip = formatStatusBarTooltip(undefined)
            expect(tooltip).toContain("rust-analyzer cargo target: Host (default)")
            expect(tooltip).toContain("Click to switch target")
        })

        it("returns target tooltip with short label suffix when target is provided", () => {
            const tooltip = formatStatusBarTooltip("x86_64-unknown-linux-gnu")
            expect(tooltip).toContain(
                "rust-analyzer cargo target: x86_64-unknown-linux-gnu (Linux x64)",
            )
        })
    })

    describe("getTargetConfigurationScope", () => {
        const originalWorkspaceFolders = (vscode.workspace as any).workspaceFolders

        afterEach(() => {
            ;(vscode.workspace as any).workspaceFolders = originalWorkspaceFolders
        })

        it("returns Global when no workspace folders are open", () => {
            ;(vscode.workspace as any).workspaceFolders = undefined
            expect(getTargetConfigurationScope()).toBe(vscode.ConfigurationTarget.Global)
            ;(vscode.workspace as any).workspaceFolders = []
            expect(getTargetConfigurationScope()).toBe(vscode.ConfigurationTarget.Global)
        })

        it("returns Workspace when workspace folders are present", () => {
            ;(vscode.workspace as any).workspaceFolders = [
                { uri: { fsPath: "/path/to/project" }, name: "project", index: 0 },
            ]
            expect(getTargetConfigurationScope()).toBe(
                vscode.ConfigurationTarget.Workspace,
            )
        })
    })
})
