// Copyright (c) 2024-2026 R3BL LLC. Licensed under MIT License.

import * as vscode from "vscode"
import * as fs from "fs/promises"
import * as path from "path"
import { showStatusBarMessage } from "r3bl-common-code"

export interface JumpPoint {
    id: string
    uriString: string
    fsPath: string
    relativePath: string
    line: number // 0-indexed line number
    character: number // 0-indexed character column
    symbolLabel: string
    linePreview: string
}

export const JUMP_JOURNEY_STORAGE_KEY = "r3bl-semantic-config.jumpJourney"

export interface PersistedJumpJourney {
    points: JumpPoint[]
    currentIndex: number
}

export type JumpQuickPickAction = "jump" | "dump-code-search" | "clear-all"

export interface JumpQuickPickItem extends vscode.QuickPickItem {
    action: JumpQuickPickAction
    pointIndex?: number
    point?: JumpPoint
}

const DECLARATION_KEYWORDS = new Set([
    "pub",
    "fn",
    "struct",
    "enum",
    "trait",
    "impl",
    "type",
    "const",
    "static",
    "let",
    "mut",
    "async",
    "unsafe",
    "mod",
    "use",
    "export",
    "function",
    "class",
    "interface",
])

/**
 * Extracts a concise, human-readable label for a jump point from its line text
 * and optional word under the cursor.
 *
 * Examples:
 * - Landing on `pub struct DialogBuffer {` -> `"struct DialogBuffer"`
 * - Landing on `pub async fn apply_event(&mut self)` -> `"fn apply_event"`
 * - Cursor on `DialogBuffer` inside `let b = DialogBuffer::new();` -> `"DialogBuffer"`
 */
export function extractSymbolLabel(
    lineText: string,
    wordAtCursor?: string,
    fallbackLineNumber?: number,
): string {
    const trimmed = lineText.trim()
    const cleanWord = wordAtCursor?.trim()

    // Check if the line is a Rust/TS declaration (fn, struct, enum, trait, type, etc.)
    const declMatch = trimmed.match(
        /^(?:pub(?:\([^)]*\))?\s+)?(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:unsafe\s+)?(?:const\s+)?(fn|struct|enum|trait|type|mod|const|static|macro_rules!|class|interface|function)\s+([A-Za-z0-9_!]+)/,
    )

    if (declMatch) {
        const keyword = declMatch[1]
        const declaredName = declMatch[2]
        if (
            !cleanWord ||
            DECLARATION_KEYWORDS.has(cleanWord) ||
            cleanWord === declaredName
        ) {
            return `${keyword} ${declaredName}`
        }
    }

    if (cleanWord && !DECLARATION_KEYWORDS.has(cleanWord)) {
        return cleanWord
    }

    if (trimmed.length > 0) {
        return trimmed.length > 40 ? `${trimmed.slice(0, 37)}...` : trimmed
    }

    return fallbackLineNumber !== undefined ? `line ${fallbackLineNumber + 1}` : "unknown"
}

/**
 * Checks whether two jump points refer to the exact same file and line.
 */
export function isSameLocation(a: JumpPoint, b: JumpPoint): boolean {
    return a.uriString === b.uriString && a.line === b.line
}

/**
 * Manages the in-memory ordered list of jump points for the current window session.
 */
export class JumpJourneyManager {
    private points: JumpPoint[] = []
    private currentIndex: number = -1
    private memento?: vscode.Memento

    public initialize(contextOrMemento: vscode.ExtensionContext | vscode.Memento): void {
        this.memento =
            "workspaceState" in contextOrMemento
                ? contextOrMemento.workspaceState
                : contextOrMemento

        const saved = this.memento.get<PersistedJumpJourney>(JUMP_JOURNEY_STORAGE_KEY)
        if (saved && Array.isArray(saved.points) && saved.points.length > 0) {
            this.points = [...saved.points]
            this.currentIndex =
                typeof saved.currentIndex === "number" &&
                saved.currentIndex >= 0 &&
                saved.currentIndex < this.points.length
                    ? saved.currentIndex
                    : this.points.length - 1
        }
    }

    private persist(): void {
        if (this.memento) {
            this.memento.update(JUMP_JOURNEY_STORAGE_KEY, {
                points: this.points,
                currentIndex: this.currentIndex,
            })
        }
    }

    public getPoints(): readonly JumpPoint[] {
        return this.points
    }

    public getCurrentIndex(): number {
        return this.currentIndex
    }

    /**
     * Records a jump from `origin` to `destination`.
     *
     * - Ignores no-op jumps where origin and destination are on the same file & line.
     * - When starting a new journey (empty list), records both `origin` (#1) and
     *   `destination` (#2) so the user can backtrack all the way to where they started.
     * - When continuing an existing journey:
     *   - If `origin` is in a different file from both the current step and the last
     *     step in the list, records `origin` first so that starting context isn't lost.
     *   - Appends `destination` to the bottom of the list (unless identical to the last item)
     *     and sets `currentIndex` to the newly added item.
     */
    public recordJump(origin: JumpPoint, destination: JumpPoint): void {
        if (isSameLocation(origin, destination)) {
            return
        }

        if (this.points.length === 0) {
            this.points.push(origin)
            this.points.push(destination)
            this.currentIndex = this.points.length - 1
            this.persist()
            return
        }

        const currentPoint =
            this.currentIndex >= 0 && this.currentIndex < this.points.length
                ? this.points[this.currentIndex]
                : undefined
        const lastPoint = this.points[this.points.length - 1]

        const isOriginInCurrentOrLastFile =
            origin.uriString === currentPoint?.uriString ||
            origin.uriString === lastPoint.uriString

        if (!isOriginInCurrentOrLastFile && !isSameLocation(lastPoint, origin)) {
            this.points.push(origin)
        }

        const updatedLastPoint = this.points[this.points.length - 1]
        if (!isSameLocation(updatedLastPoint, destination)) {
            this.points.push(destination)
        }

        this.currentIndex = this.points.length - 1
        this.persist()
    }

    /**
     * Sets the active journey index when the user selects a jump point from the popup.
     */
    public navigateToIndex(index: number): JumpPoint | undefined {
        if (index < 0 || index >= this.points.length) {
            return undefined
        }
        this.currentIndex = index
        this.persist()
        return this.points[index]
    }

    /**
     * Removes a single jump point at `index` and adjusts `currentIndex` to stay valid.
     */
    public removeAtIndex(index: number): void {
        if (index < 0 || index >= this.points.length) {
            return
        }

        this.points.splice(index, 1)

        if (this.points.length === 0) {
            this.currentIndex = -1
        } else if (index < this.currentIndex) {
            this.currentIndex -= 1
        } else if (this.currentIndex >= this.points.length) {
            this.currentIndex = this.points.length - 1
        }

        this.persist()
    }

    /**
     * Clears all jump points and resets `currentIndex`.
     */
    public clear(): void {
        this.points = []
        this.currentIndex = -1
        this.persist()
    }
}

// Singleton session manager
export const journeyManager = new JumpJourneyManager()

/**
 * Pure function to build the QuickPick items for the jump journey popup.
 */
export function buildJumpQuickPickItems(
    points: readonly JumpPoint[],
    currentIndex: number,
): JumpQuickPickItem[] {
    const items: JumpQuickPickItem[] = []

    const trashButton: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon("trash"),
        tooltip: "Remove Jump Point",
    }

    for (let i = 0; i < points.length; i++) {
        const point = points[i]
        const isCurrent = i === currentIndex
        const arrowPrefix = isCurrent ? "$(arrow-right) " : ""

        items.push({
            label: `${i + 1}. ${arrowPrefix}${point.symbolLabel}`,
            description: `${point.relativePath}:${point.line + 1}`,
            detail: `    ${point.linePreview}`,
            action: "jump",
            pointIndex: i,
            point,
            buttons: [trashButton],
        })
    }

    items.push({
        label: "",
        kind: vscode.QuickPickItemKind.Separator,
        action: "jump",
    })

    items.push({
        label: "$(search) Open Journey in Search Editor (.code-search)",
        description: "View all jump points with surrounding code context",
        action: "dump-code-search",
        alwaysShow: true,
    })

    items.push({
        label: "$(clear-all) Clear All Jump Points",
        description: `Remove all ${points.length} jump point${points.length === 1 ? "" : "s"}`,
        action: "clear-all",
        alwaysShow: true,
    })

    return items
}

/**
 * Pure function to generate `.code-search` content for a list of jump points.
 */
export function generateJourneyCodeSearchContent(
    points: readonly JumpPoint[],
    fileLinesMap: ReadonlyMap<string, readonly string[]>,
    contextRadius: number = 2,
): string {
    const lines: string[] = []

    lines.push(`# Jump Journey (${points.length} step${points.length === 1 ? "" : "s"})`)
    lines.push("#")
    lines.push("")

    for (let i = 0; i < points.length; i++) {
        const point = points[i]
        lines.push(`# ── Step ${i + 1}: ${point.symbolLabel} ──`)
        lines.push(`${point.relativePath}:`)

        const docLines = fileLinesMap.get(point.uriString)
        if (docLines && docLines.length > 0) {
            const startLine = Math.max(0, point.line - contextRadius)
            const endLine = Math.min(docLines.length - 1, point.line + contextRadius)

            for (let lineIdx = startLine; lineIdx <= endLine; lineIdx++) {
                const lineNum = lineIdx + 1
                const text = docLines[lineIdx] ?? ""
                if (lineIdx === point.line) {
                    lines.push(`  ${lineNum}: ${text}`)
                } else {
                    lines.push(`  ${lineNum}  ${text}`)
                }
            }
        } else {
            // Fallback to stored single-line preview if file lines couldn't be read
            lines.push(`  ${point.line + 1}: ${point.linePreview}`)
        }

        lines.push("")
    }

    return lines.join("\n")
}

/**
 * Captures a `JumpPoint` snapshot from the given `TextEditor`.
 */
export function captureJumpPoint(editor: vscode.TextEditor): JumpPoint {
    const doc = editor.document
    const pos = editor.selection.active
    const lineText = doc.lineAt(pos.line).text
    const wordRange = doc.getWordRangeAtPosition(pos)
    const wordAtCursor = wordRange ? doc.getText(wordRange) : undefined

    const symbolLabel = extractSymbolLabel(lineText, wordAtCursor, pos.line)
    const relativePath = vscode.workspace.asRelativePath(doc.uri, false)
    const trimmedPreview = lineText.trim()

    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        uriString: doc.uri.toString(),
        fsPath: doc.uri.fsPath,
        relativePath,
        line: pos.line,
        character: pos.character,
        symbolLabel,
        linePreview:
            trimmedPreview.length > 80
                ? `${trimmedPreview.slice(0, 77)}...`
                : trimmedPreview,
    }
}

/**
 * Navigates the editor to a recorded `JumpPoint` and centers it in the viewport.
 */
async function openJumpPoint(point: JumpPoint): Promise<void> {
    try {
        const uri = vscode.Uri.parse(point.uriString)
        const doc = await vscode.workspace.openTextDocument(uri)
        const editor = await vscode.window.showTextDocument(doc, {
            preview: false,
            viewColumn: vscode.ViewColumn.Active,
        })

        const safeLine = Math.min(point.line, Math.max(0, doc.lineCount - 1))
        const maxChar = doc.lineAt(safeLine).text.length
        const safeChar = Math.min(point.character, maxChar)

        const pos = new vscode.Position(safeLine, safeChar)
        editor.selection = new vscode.Selection(pos, pos)
        editor.revealRange(
            new vscode.Range(pos, pos),
            vscode.TextEditorRevealType.InCenter,
        )
    } catch (error) {
        showStatusBarMessage(`Failed to open jump point: ${error}`, "error")
    }
}

/**
 * Writes the current journey to `/tmp/jump-journey-<timestamp>.code-search` and opens it.
 */
async function dumpJourneyToCodeSearch(points: readonly JumpPoint[]): Promise<void> {
    try {
        const fileLinesMap = new Map<string, string[]>()

        for (const point of points) {
            if (!fileLinesMap.has(point.uriString)) {
                try {
                    const uri = vscode.Uri.parse(point.uriString)
                    const doc = await vscode.workspace.openTextDocument(uri)
                    const docLines: string[] = []
                    for (let i = 0; i < doc.lineCount; i++) {
                        docLines.push(doc.lineAt(i).text)
                    }
                    fileLinesMap.set(point.uriString, docLines)
                } catch {
                    // Fallback handled by generateJourneyCodeSearchContent
                }
            }
        }

        const content = generateJourneyCodeSearchContent(points, fileLinesMap)
        const now = new Date()
        const pad = (n: number) => n.toString().padStart(2, "0")
        const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
        const filepath = `/tmp/jump-journey-${timestamp}.code-search`

        const uri = vscode.Uri.file(filepath)
        await fs.writeFile(filepath, content, "utf8")

        const searchDoc = await vscode.workspace.openTextDocument(uri)
        await vscode.window.showTextDocument(searchDoc, {
            preview: false,
            viewColumn: vscode.ViewColumn.Active,
        })

        showStatusBarMessage(
            `Opened ${points.length} jump points in Search Editor`,
            "success",
        )
    } catch (error) {
        showStatusBarMessage(`Failed to create .code-search file: ${error}`, "error")
    }
}

/**
 * Command handler for `Alt+U` (`r3bl-semantic-config.jumpAndRecord`).
 * Records the origin (if needed) and the definition destination, then jumps to definition.
 */
export async function jumpAndRecord(): Promise<void> {
    const editorBefore = vscode.window.activeTextEditor
    if (!editorBefore) {
        showStatusBarMessage("No active editor", "warning")
        return
    }

    const originSnapshot = captureJumpPoint(editorBefore)

    await vscode.commands.executeCommand("editor.action.revealDefinition")

    const editorAfter = vscode.window.activeTextEditor
    if (!editorAfter) {
        return
    }

    const destSnapshot = captureJumpPoint(editorAfter)

    if (isSameLocation(originSnapshot, destSnapshot)) {
        showStatusBarMessage("No new definition location jumped to", "info")
        return
    }

    journeyManager.recordJump(originSnapshot, destSnapshot)
    const total = journeyManager.getPoints().length
    const filename = path.basename(destSnapshot.fsPath)

    showStatusBarMessage(
        `Jump #${total}: ${destSnapshot.symbolLabel} (${filename}:${destSnapshot.line + 1})`,
        "info",
    )
}

/**
 * Command handler for `Alt+Shift+U` (`r3bl-semantic-config.showJumpPoints`).
 * Displays the QuickPick popup to navigate, dump to `.code-search`, remove items, or clear all.
 */
export async function showJumpPoints(): Promise<void> {
    const points = journeyManager.getPoints()
    if (points.length === 0) {
        showStatusBarMessage("No jump points recorded yet (use Alt+U to jump)", "info")
        return
    }

    const quickPick = vscode.window.createQuickPick<JumpQuickPickItem>()
    quickPick.placeholder = "Navigate jump journey"
    quickPick.matchOnDescription = true
    quickPick.matchOnDetail = true

    const refreshItems = () => {
        const currentPoints = journeyManager.getPoints()
        const currentIdx = journeyManager.getCurrentIndex()
        const newItems = buildJumpQuickPickItems(currentPoints, currentIdx)
        quickPick.items = newItems

        if (currentIdx >= 0 && currentIdx < currentPoints.length) {
            quickPick.activeItems = [newItems[currentIdx]]
        }
    }

    refreshItems()

    quickPick.onDidAccept(async () => {
        const selected = quickPick.selectedItems[0]
        if (!selected) {
            return
        }

        quickPick.hide()

        if (selected.action === "jump" && selected.pointIndex !== undefined) {
            const target = journeyManager.navigateToIndex(selected.pointIndex)
            if (target) {
                await openJumpPoint(target)
                const total = journeyManager.getPoints().length
                showStatusBarMessage(
                    `Jump ${selected.pointIndex + 1}/${total}: ${target.symbolLabel}`,
                    "info",
                )
            }
        } else if (selected.action === "dump-code-search") {
            await dumpJourneyToCodeSearch(journeyManager.getPoints())
        } else if (selected.action === "clear-all") {
            journeyManager.clear()
            showStatusBarMessage("Cleared all jump points", "info")
        }
    })

    quickPick.onDidTriggerItemButton((event) => {
        const item = event.item as JumpQuickPickItem
        if (item.pointIndex === undefined) {
            return
        }

        journeyManager.removeAtIndex(item.pointIndex)

        if (journeyManager.getPoints().length === 0) {
            quickPick.hide()
            showStatusBarMessage("All jump points removed", "info")
            return
        }

        refreshItems()
    })

    quickPick.onDidHide(() => quickPick.dispose())
    quickPick.show()
}
