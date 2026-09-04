// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import * as vscode from "vscode"
import {
    CURATED_TARGETS,
    applyRustTarget,
    buildTargetQuickPickItems,
    formatStatusBarText,
    formatStatusBarTooltip,
    getHumanReadableTargetLabel,
    getTargetConfigurationScope,
    getTargetIcon,
    hasOpenWorkspace,
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

    describe("getTargetIcon", () => {
        it("returns chip icon for undefined, empty, or whitespace target", () => {
            expect(getTargetIcon(undefined)).toBe("$(chip)")
            expect(getTargetIcon("")).toBe("$(chip)")
            expect(getTargetIcon("   ")).toBe("$(chip)")
        })

        it("returns apple emoji for macOS / Apple targets", () => {
            expect(getTargetIcon("aarch64-apple-darwin")).toBe("🍎")
            expect(getTargetIcon("x86_64-apple-darwin")).toBe("🍎")
            expect(getTargetIcon("AARCH64-APPLE-DARWIN")).toBe("🍎")
        })

        it("returns penguin emoji for Linux targets", () => {
            expect(getTargetIcon("x86_64-unknown-linux-gnu")).toBe("🐧")
            expect(getTargetIcon("aarch64-unknown-linux-gnu")).toBe("🐧")
            expect(getTargetIcon("x86_64-unknown-linux-musl")).toBe("🐧")
            expect(getTargetIcon("armv7-unknown-linux-gnueabihf")).toBe("🐧")
        })

        it("returns window emoji for Windows targets", () => {
            expect(getTargetIcon("x86_64-pc-windows-gnu")).toBe("🪟")
            expect(getTargetIcon("x86_64-pc-windows-msvc")).toBe("🪟")
            expect(getTargetIcon("i686-pc-windows-msvc")).toBe("🪟")
        })

        it("returns globe emoji for WebAssembly targets", () => {
            expect(getTargetIcon("wasm32-unknown-unknown")).toBe("🌐")
            expect(getTargetIcon("wasm32-wasip1")).toBe("🌐")
            expect(getTargetIcon("wasm32-wasi")).toBe("🌐")
        })

        it("returns chip icon for unrecognized or other targets", () => {
            expect(getTargetIcon("thumbv7em-none-eabihf")).toBe("$(chip)")
            expect(getTargetIcon("riscv32imac-unknown-none-elf")).toBe("$(chip)")
        })
    })

    describe("formatStatusBarText", () => {
        it("returns Host with chip icon for undefined or empty targets", () => {
            expect(formatStatusBarText(undefined)).toBe("$(chip) Host")
            expect(formatStatusBarText("")).toBe("$(chip) Host")
            expect(formatStatusBarText("   ")).toBe("$(chip) Host")
        })

        it("returns dynamic icon and short label for known targets", () => {
            expect(formatStatusBarText("x86_64-unknown-linux-gnu")).toBe("🐧 Linux x64")
            expect(formatStatusBarText("aarch64-apple-darwin")).toBe("🍎 macOS ARM")
            expect(formatStatusBarText("x86_64-pc-windows-gnu")).toBe("🪟 Win-GNU x64")
            expect(formatStatusBarText("x86_64-pc-windows-msvc")).toBe("🪟 Win-MSVC x64")
            expect(formatStatusBarText("wasm32-unknown-unknown")).toBe("🌐 Wasm32")
        })

        it("returns dynamic icon for custom targets", () => {
            expect(formatStatusBarText("aarch64-unknown-linux-gnu")).toBe(
                "🐧 aarch64-unknown-linux-gnu",
            )
            expect(formatStatusBarText("thumbv7em-none-eabihf")).toBe(
                "$(chip) thumbv7em-none-eabihf",
            )
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
        it("always returns Workspace since targets are project-scoped", () => {
            expect(getTargetConfigurationScope()).toBe(
                vscode.ConfigurationTarget.Workspace,
            )
        })
    })

    describe("hasOpenWorkspace", () => {
        const originalWorkspaceFolders = (vscode.workspace as any).workspaceFolders

        afterEach(() => {
            ;(vscode.workspace as any).workspaceFolders = originalWorkspaceFolders
        })

        it("returns false when no workspace folders are open", () => {
            ;(vscode.workspace as any).workspaceFolders = undefined
            expect(hasOpenWorkspace()).toBe(false)
            ;(vscode.workspace as any).workspaceFolders = []
            expect(hasOpenWorkspace()).toBe(false)
        })

        it("returns true when workspace folders are present", () => {
            ;(vscode.workspace as any).workspaceFolders = [
                { uri: { fsPath: "/path/to/project" }, name: "project", index: 0 },
            ]
            expect(hasOpenWorkspace()).toBe(true)
        })
    })

    describe("applyRustTarget", () => {
        let updateCalls: Array<{ section: string; value: any; scope: any }>
        let inspectReturn: any
        const originalWorkspaceFolders = (vscode.workspace as any).workspaceFolders

        beforeEach(() => {
            updateCalls = []
            inspectReturn = undefined
            ;(vscode.workspace as any).workspaceFolders = [
                { uri: { fsPath: "/path/to/project" }, name: "project", index: 0 },
            ]

            jest.spyOn(vscode.workspace, "getConfiguration").mockReturnValue({
                get: jest.fn(),
                update: jest.fn(async (section: string, value: any, scope: any) => {
                    updateCalls.push({ section, value, scope })
                }),
                inspect: jest.fn(() => inspectReturn),
            } as any)
        })

        afterEach(() => {
            jest.restoreAllMocks()
            ;(vscode.workspace as any).workspaceFolders = originalWorkspaceFolders
        })

        it("updates cargo.target with target string at Workspace scope when workspace is open", async () => {
            await applyRustTarget("x86_64-unknown-linux-gnu")

            expect(updateCalls).toContainEqual({
                section: "cargo.target",
                value: "x86_64-unknown-linux-gnu",
                scope: vscode.ConfigurationTarget.Workspace,
            })
        })

        it("does not update target when no workspace is open", async () => {
            ;(vscode.workspace as any).workspaceFolders = undefined

            await applyRustTarget("x86_64-unknown-linux-gnu")

            expect(updateCalls.length).toBe(0)
        })

        it("clears all active configuration scopes when newTarget is undefined (Host / Default)", async () => {
            inspectReturn = {
                key: "rust-analyzer.cargo.target",
                globalValue: "x86_64-pc-windows-gnu",
                workspaceValue: "aarch64-apple-darwin",
                workspaceFolderValue: undefined,
            }

            await applyRustTarget(undefined)

            expect(updateCalls).toContainEqual({
                section: "cargo.target",
                value: undefined,
                scope: vscode.ConfigurationTarget.Workspace,
            })
            expect(updateCalls).toContainEqual({
                section: "cargo.target",
                value: undefined,
                scope: vscode.ConfigurationTarget.Global,
            })
        })
    })
})
