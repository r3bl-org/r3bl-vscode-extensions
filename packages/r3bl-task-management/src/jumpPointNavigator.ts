// Copyright (c) 2024-2026 R3BL LLC. Licensed under MIT License.

import * as vscode from "vscode"
import * as fs from "fs/promises"
import * as path from "path"
import { createHash } from "crypto"
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

export const JUMP_POINTS_STORAGE_FILE = ".vscode/jump-points.json"
export const JUMP_POINTS_VERSION = "3.0"
export const JUMP_POINTS_STORAGE_KEY = "r3bl-task-management.jumpPoints"
const LEGACY_V2_STORAGE_KEY = "r3bl-task-management.jumpJour" + "ney"
const LEGACY_V2_JSON_FIELD = "jour" + "neys"

export interface PersistedTaskJumpPoints {
    points: JumpPoint[]
    currentIndex: number
}

export interface JumpPointsStorage {
    version: string
    tasks: Record<string, PersistedTaskJumpPoints>
}

export interface ActiveTaskSpaceRef {
    id: string
    name: string
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
 * Resolves the `vscode.Uri` for a `JumpPoint`, preferring a workspace-relative path
 * when a workspace folder is open and the point lives inside it, and falling back
 * to `point.uriString` for files outside the workspace (e.g., cargo registry, stdlib).
 */
export function resolveJumpPointUri(
    point: JumpPoint,
    workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined = vscode.workspace
        .workspaceFolders,
): vscode.Uri {
    const folder =
        workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0] : undefined
    const isRelative =
        Boolean(point.relativePath) &&
        !path.isAbsolute(point.relativePath) &&
        !/^[a-zA-Z]:[\\/]/.test(point.relativePath) &&
        !point.relativePath.startsWith("..")

    if (folder && isRelative) {
        return vscode.Uri.joinPath(folder.uri, point.relativePath)
    }

    return vscode.Uri.parse(point.uriString)
}

/**
 * Jump Point Navigation — the depth dimension of a Task Space's **Spatial Context**
 * (complementing Opened Tabs in `taskSpaceManager.ts`).
 *
 * Manages per-task ordered lists of jump points stored in `.vscode/jump-points.json`
 * (keyed by `taskSpaceId`), with `workspaceState` fallback when no workspace folder is open.
 */
export class JumpPointsManager {
    private tasks: Record<string, PersistedTaskJumpPoints> = {}
    private memento?: vscode.Memento
    private getActiveTaskSpaceFn: () => ActiveTaskSpaceRef | undefined = () => undefined
    private lastSavedChecksum: string | null = null
    private persistQueue: Promise<void> = Promise.resolve()

    public async initialize(
        contextOrMemento: vscode.ExtensionContext | vscode.Memento,
        getActiveTaskSpace?: () => ActiveTaskSpaceRef | undefined,
    ): Promise<void> {
        this.memento =
            "workspaceState" in contextOrMemento
                ? contextOrMemento.workspaceState
                : contextOrMemento
        this.getActiveTaskSpaceFn = getActiveTaskSpace ?? (() => undefined)

        const loaded = await this.loadFromStorage()
        if (loaded) {
            this.tasks = loaded.storage.tasks
            if (loaded.migrated) {
                this.persist()
                await this.waitForPendingSaves()
            } else {
                this.lastSavedChecksum = this.computeChecksum(this.toStorageData())
            }
        } else {
            this.tasks = {}
            this.lastSavedChecksum = null
        }
    }

    /**
     * Reloads `.vscode/jump-points.json` when an external change is detected.
     * Skips reloading if the file's checksum matches our own last save.
     * Returns `true` if external state was applied.
     */
    public async reloadFromDisk(): Promise<boolean> {
        const loaded = await this.readDiskFile()
        if (!loaded) {
            return false
        }

        const loadedChecksum = this.computeChecksum(loaded.storage)
        if (
            this.lastSavedChecksum !== null &&
            loadedChecksum === this.lastSavedChecksum
        ) {
            return false
        }

        this.tasks = loaded.storage.tasks
        this.lastSavedChecksum = loadedChecksum
        return true
    }

    /**
     * Resets in-memory state when `.vscode/jump-points.json` is deleted externally.
     */
    public handleExternalFileDelete(): void {
        this.tasks = {}
        this.lastSavedChecksum = null
    }

    /**
     * Deletes the saved jump points for a finished or deleted task space.
     */
    public async deleteJumpPointsForTask(taskSpaceId: string): Promise<void> {
        if (!this.tasks[taskSpaceId]) {
            return
        }
        delete this.tasks[taskSpaceId]
        this.persist()
        await this.waitForPendingSaves()
    }

    /**
     * Waits for any queued disk/memento write operations to finish.
     */
    public waitForPendingSaves(): Promise<void> {
        return this.persistQueue
    }

    public isOwnSave(data: JumpPointsStorage): boolean {
        if (this.lastSavedChecksum === null) {
            return false
        }
        return this.computeChecksum(data) === this.lastSavedChecksum
    }

    public getActiveTaskSpace(): ActiveTaskSpaceRef | undefined {
        return this.getActiveTaskSpaceFn()
    }

    private getActiveTaskId(): string | undefined {
        return this.getActiveTaskSpaceFn()?.id
    }

    private toStorageData(): JumpPointsStorage {
        const sortedTasks: Record<string, PersistedTaskJumpPoints> = {}
        for (const taskId of Object.keys(this.tasks).sort()) {
            const entry = this.tasks[taskId]
            sortedTasks[taskId] = {
                points: [...entry.points],
                currentIndex: entry.currentIndex,
            }
        }
        return {
            version: JUMP_POINTS_VERSION,
            tasks: sortedTasks,
        }
    }

    private computeChecksum(data: JumpPointsStorage): string {
        const sortedTasks: Record<string, PersistedTaskJumpPoints> = {}
        const rawTasks = data.tasks ?? {}
        for (const taskId of Object.keys(rawTasks).sort()) {
            const entry = rawTasks[taskId]
            const points = Array.isArray(entry?.points) ? entry.points : []
            sortedTasks[taskId] = {
                points,
                currentIndex: this.clampIndex(points, entry?.currentIndex),
            }
        }
        const normalized: JumpPointsStorage = {
            version: data.version || JUMP_POINTS_VERSION,
            tasks: sortedTasks,
        }
        return createHash("sha256").update(JSON.stringify(normalized)).digest("hex")
    }

    private clampIndex(points: readonly JumpPoint[], index: unknown): number {
        if (points.length === 0) {
            return -1
        }
        return typeof index === "number" && index >= 0 && index < points.length
            ? index
            : points.length - 1
    }

    private normalizeLoadedData(raw: unknown):
        | {
              storage: JumpPointsStorage
              migrated: boolean
          }
        | undefined {
        if (!raw || typeof raw !== "object") {
            return undefined
        }

        const record = raw as Record<string, unknown>

        // v3.0 format: { version: "3.0", tasks: { [taskId]: { points, currentIndex } } }
        if (record.tasks && typeof record.tasks === "object") {
            const rawTasks = record.tasks as Record<string, unknown>
            const tasks: Record<string, PersistedTaskJumpPoints> = {}

            for (const [taskId, value] of Object.entries(rawTasks)) {
                if (!value || typeof value !== "object") continue
                const entry = value as Partial<PersistedTaskJumpPoints>
                if (!Array.isArray(entry.points) || entry.points.length === 0) continue
                tasks[taskId] = {
                    points: [...entry.points],
                    currentIndex: this.clampIndex(entry.points, entry.currentIndex),
                }
            }

            return {
                storage: { version: JUMP_POINTS_VERSION, tasks },
                migrated: record.version !== JUMP_POINTS_VERSION,
            }
        }

        // Legacy v2.0 format migration: { version: "2.0", <legacyField>: { [taskId]: { points, currentIndex } } }
        const legacyV2Map = record[LEGACY_V2_JSON_FIELD]
        if (legacyV2Map && typeof legacyV2Map === "object") {
            const rawTasks = legacyV2Map as Record<string, unknown>
            const tasks: Record<string, PersistedTaskJumpPoints> = {}

            for (const [taskId, value] of Object.entries(rawTasks)) {
                if (!value || typeof value !== "object") continue
                const entry = value as Partial<PersistedTaskJumpPoints>
                if (!Array.isArray(entry.points) || entry.points.length === 0) continue
                tasks[taskId] = {
                    points: [...entry.points],
                    currentIndex: this.clampIndex(entry.points, entry.currentIndex),
                }
            }

            return {
                storage: { version: JUMP_POINTS_VERSION, tasks },
                migrated: true,
            }
        }

        // Legacy v1.0 format: { version?: "1.0", points: JumpPoint[], currentIndex: number }
        if (Array.isArray(record.points)) {
            const points = record.points as JumpPoint[]
            const tasks: Record<string, PersistedTaskJumpPoints> = {}
            const activeId = this.getActiveTaskId()
            if (activeId && points.length > 0) {
                tasks[activeId] = {
                    points: [...points],
                    currentIndex: this.clampIndex(points, record.currentIndex),
                }
            }
            return {
                storage: { version: JUMP_POINTS_VERSION, tasks },
                migrated: true,
            }
        }

        return undefined
    }

    private getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
        const folders = vscode.workspace.workspaceFolders
        return folders && folders.length > 0 ? folders[0] : undefined
    }

    private async readDiskFile(): Promise<
        | {
              storage: JumpPointsStorage
              migrated: boolean
          }
        | undefined
    > {
        const workspaceFolder = this.getWorkspaceFolder()
        if (!workspaceFolder) {
            return undefined
        }

        const storageUri = vscode.Uri.joinPath(
            workspaceFolder.uri,
            JUMP_POINTS_STORAGE_FILE,
        )
        try {
            const content = await vscode.workspace.fs.readFile(storageUri)
            const parsed = JSON.parse(Buffer.from(content).toString("utf8"))
            return this.normalizeLoadedData(parsed)
        } catch {
            return undefined
        }
    }

    private async loadFromStorage(): Promise<
        | {
              storage: JumpPointsStorage
              migrated: boolean
          }
        | undefined
    > {
        const workspaceFolder = this.getWorkspaceFolder()
        if (workspaceFolder) {
            return await this.readDiskFile()
        }

        const saved =
            this.memento?.get<unknown>(JUMP_POINTS_STORAGE_KEY) ??
            this.memento?.get<unknown>(LEGACY_V2_STORAGE_KEY)
        return this.normalizeLoadedData(saved)
    }

    private persist(): void {
        const snapshot = this.toStorageData()
        const checksum = this.computeChecksum(snapshot)
        this.lastSavedChecksum = checksum

        this.persistQueue = this.persistQueue
            .then(async () => {
                const workspaceFolder = this.getWorkspaceFolder()
                if (workspaceFolder) {
                    const vscodeDir = vscode.Uri.joinPath(workspaceFolder.uri, ".vscode")
                    try {
                        await vscode.workspace.fs.createDirectory(vscodeDir)
                    } catch {
                        // Directory may already exist
                    }

                    const storageUri = vscode.Uri.joinPath(
                        workspaceFolder.uri,
                        JUMP_POINTS_STORAGE_FILE,
                    )
                    const content = JSON.stringify(snapshot, null, 2)
                    await vscode.workspace.fs.writeFile(
                        storageUri,
                        Buffer.from(content, "utf8"),
                    )
                } else if (this.memento) {
                    await this.memento.update(JUMP_POINTS_STORAGE_KEY, snapshot)
                }
            })
            .catch((error) => {
                console.error("Failed to persist jump points:", error)
            })
    }

    public getPoints(
        taskId: string | undefined = this.getActiveTaskId(),
    ): readonly JumpPoint[] {
        if (!taskId) return []
        return this.tasks[taskId]?.points ?? []
    }

    public getCurrentIndex(taskId: string | undefined = this.getActiveTaskId()): number {
        if (!taskId) return -1
        return this.tasks[taskId]?.currentIndex ?? -1
    }

    private ensureActiveTaskPoints(): PersistedTaskJumpPoints | undefined {
        const taskId = this.getActiveTaskId()
        if (!taskId) return undefined
        if (!this.tasks[taskId]) {
            this.tasks[taskId] = { points: [], currentIndex: -1 }
        }
        return this.tasks[taskId]
    }

    /**
     * Records a jump from `origin` to `destination` in the active task space's jump points.
     *
     * - Ignores jumps when there is no active task space or origin & destination match.
     * - When starting a new list (empty), records both `origin` (#1) and
     *   `destination` (#2) so the user can backtrack all the way to where they started.
     * - When continuing an existing list:
     *   - If `origin` is in a different file from both the current step and the last
     *     step in the list, records `origin` first so that starting context isn't lost.
     *   - Appends `destination` to the bottom of the list (unless identical to the last item)
     *     and sets `currentIndex` to the newly added item.
     */
    public recordJump(origin: JumpPoint, destination: JumpPoint): void {
        if (isSameLocation(origin, destination)) {
            return
        }

        const taskPoints = this.ensureActiveTaskPoints()
        if (!taskPoints) {
            return
        }

        const { points } = taskPoints

        if (points.length === 0) {
            points.push(origin)
            points.push(destination)
            taskPoints.currentIndex = points.length - 1
            this.persist()
            return
        }

        const currentPoint =
            taskPoints.currentIndex >= 0 && taskPoints.currentIndex < points.length
                ? points[taskPoints.currentIndex]
                : undefined
        const lastPoint = points[points.length - 1]

        const isOriginInCurrentOrLastFile =
            origin.uriString === currentPoint?.uriString ||
            origin.uriString === lastPoint.uriString

        if (!isOriginInCurrentOrLastFile && !isSameLocation(lastPoint, origin)) {
            points.push(origin)
        }

        const updatedLastPoint = points[points.length - 1]
        if (!isSameLocation(updatedLastPoint, destination)) {
            points.push(destination)
        }

        taskPoints.currentIndex = points.length - 1
        this.persist()
    }

    /**
     * Sets the active jump point index when the user selects a jump point from the popup.
     */
    public navigateToIndex(index: number): JumpPoint | undefined {
        const taskId = this.getActiveTaskId()
        const taskPoints = taskId ? this.tasks[taskId] : undefined
        if (!taskPoints || index < 0 || index >= taskPoints.points.length) {
            return undefined
        }
        taskPoints.currentIndex = index
        this.persist()
        return taskPoints.points[index]
    }

    /**
     * Removes a single jump point at `index` and adjusts `currentIndex` to stay valid.
     */
    public removeAtIndex(index: number): void {
        const taskId = this.getActiveTaskId()
        const taskPoints = taskId ? this.tasks[taskId] : undefined
        if (!taskPoints || index < 0 || index >= taskPoints.points.length) {
            return
        }

        taskPoints.points.splice(index, 1)

        if (taskPoints.points.length === 0) {
            delete this.tasks[taskId!]
        } else {
            if (index < taskPoints.currentIndex) {
                taskPoints.currentIndex -= 1
            } else if (taskPoints.currentIndex >= taskPoints.points.length) {
                taskPoints.currentIndex = taskPoints.points.length - 1
            }
        }

        this.persist()
    }

    /**
     * Clears all jump points for the active task space.
     */
    public clear(): void {
        const taskId = this.getActiveTaskId()
        if (!taskId) return
        delete this.tasks[taskId]
        this.persist()
    }
}

// Singleton session manager
export const jumpPointsManager = new JumpPointsManager()

/**
 * Pure function to build the QuickPick items for the Jump Point Navigation popup.
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
        label: "$(search) Open Jump Points in Search Editor (.code-search)",
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
export function generateJumpPointsCodeSearchContent(
    points: readonly JumpPoint[],
    fileLinesMap: ReadonlyMap<string, readonly string[]>,
    contextRadius: number = 2,
): string {
    const lines: string[] = []

    lines.push(
        `# Jump Point Navigation (${points.length} step${points.length === 1 ? "" : "s"})`,
    )
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
        const uri = resolveJumpPointUri(point)
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
 * Writes the current task's jump points to `/tmp/jump-points-<timestamp>.code-search` and opens it.
 */
async function dumpJumpPointsToCodeSearch(points: readonly JumpPoint[]): Promise<void> {
    try {
        const fileLinesMap = new Map<string, string[]>()

        for (const point of points) {
            if (!fileLinesMap.has(point.uriString)) {
                try {
                    const uri = resolveJumpPointUri(point)
                    const doc = await vscode.workspace.openTextDocument(uri)
                    const docLines: string[] = []
                    for (let i = 0; i < doc.lineCount; i++) {
                        docLines.push(doc.lineAt(i).text)
                    }
                    fileLinesMap.set(point.uriString, docLines)
                } catch {
                    // Fallback handled by generateJumpPointsCodeSearchContent
                }
            }
        }

        const content = generateJumpPointsCodeSearchContent(points, fileLinesMap)
        const now = new Date()
        const pad = (n: number) => n.toString().padStart(2, "0")
        const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
        const filepath = `/tmp/jump-points-${timestamp}.code-search`

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
 * Command handler for `Alt+U` (`r3bl-task-management.jumpAndRecord`).
 * Records the origin (if needed) and the definition destination, then jumps to definition.
 */
export async function jumpAndRecord(): Promise<void> {
    if (!jumpPointsManager.getActiveTaskSpace()) {
        showStatusBarMessage(
            "Jump points require an active task space (press Alt+Shift+T)",
            "warning",
        )
        return
    }

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

    jumpPointsManager.recordJump(originSnapshot, destSnapshot)
    const total = jumpPointsManager.getPoints().length
    const filename = path.basename(destSnapshot.fsPath)

    showStatusBarMessage(
        `Jump #${total}: ${destSnapshot.symbolLabel} (${filename}:${destSnapshot.line + 1})`,
        "info",
    )
}

/**
 * Command handler for `Alt+Shift+U` (`r3bl-task-management.showJumpPoints`).
 * Displays the QuickPick popup to navigate, dump to `.code-search`, remove items, or clear all.
 */
export async function showJumpPoints(): Promise<void> {
    const activeTask = jumpPointsManager.getActiveTaskSpace()
    if (!activeTask) {
        showStatusBarMessage(
            "Jump points require an active task space (press Alt+Shift+T)",
            "warning",
        )
        return
    }

    const points = jumpPointsManager.getPoints()
    if (points.length === 0) {
        showStatusBarMessage(
            `No jump points recorded for "${activeTask.name}" yet (use Alt+U to jump)`,
            "info",
        )
        return
    }

    const quickPick = vscode.window.createQuickPick<JumpQuickPickItem>()
    quickPick.placeholder = `Jump Point Navigation — ${activeTask.name}`
    quickPick.matchOnDescription = true
    quickPick.matchOnDetail = true

    const refreshItems = () => {
        const currentPoints = jumpPointsManager.getPoints()
        const currentIdx = jumpPointsManager.getCurrentIndex()
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
            const target = jumpPointsManager.navigateToIndex(selected.pointIndex)
            if (target) {
                await openJumpPoint(target)
                const total = jumpPointsManager.getPoints().length
                showStatusBarMessage(
                    `Jump ${selected.pointIndex + 1}/${total}: ${target.symbolLabel}`,
                    "info",
                )
            }
        } else if (selected.action === "dump-code-search") {
            await dumpJumpPointsToCodeSearch(jumpPointsManager.getPoints())
        } else if (selected.action === "clear-all") {
            jumpPointsManager.clear()
            showStatusBarMessage("Cleared all jump points", "info")
        }
    })

    quickPick.onDidTriggerItemButton((event) => {
        const item = event.item as JumpQuickPickItem
        if (item.pointIndex === undefined) {
            return
        }

        jumpPointsManager.removeAtIndex(item.pointIndex)

        if (jumpPointsManager.getPoints().length === 0) {
            quickPick.hide()
            showStatusBarMessage("All jump points removed", "info")
            return
        }

        refreshItems()
    })

    quickPick.onDidHide(() => quickPick.dispose())
    quickPick.show()
}
