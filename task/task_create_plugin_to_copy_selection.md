# IntelliJ IDEA Plugin: Copy Selection Path and Range

## Overview

This document outlines the plan to create an IntelliJ IDEA plugin equivalent to the VSCode extension `r3bl-copy-selection-path-and-range`. This will be part of a new repository at `https://github.com/r3bl-org/r3bl-intellij-extensions/`.

## Purpose

Port the VSCode "Copy Selection Path and Range" functionality to IntelliJ IDEA, allowing users to:
1. Select text in the editor
2. Press `Alt+O` (or alternative keybinding)
3. Get a formatted string copied to clipboard in formats suitable for sharing with Claude Code or other tools

## Specifications

### Output Format

The plugin produces strings in three different formats depending on the selection state:

1. **Range of lines** (multi-line selection):
   ```
   tui/src/readline_async/readline_async_impl/integration_tests/pty_ctrl_navigation_test.rs#L331-335
   ```
   - Format: `<relativePath>#L<startLine>-<endLine>`
   - Claude Code specific format (allows range selection)
   - NOT compatible with IDE navigation (can't jump to line ranges)

2. **Single line** (single-line selection):
   ```
   tui/src/readline_async/readline_async_impl/integration_tests/pty_ctrl_navigation_test.rs:331
   ```
   - Format: `<relativePath>:<lineNumber>`
   - Compatible with VSCode, RustRover, IntelliJ, AND Claude Code
   - Used when text is selected on a single line

3. **No selection** (cursor only, no text selected):
   ```
   tui/src/readline_async/readline_async_impl/integration_tests/pty_ctrl_navigation_test.rs
   ```
   - Format: `<relativePath>`
   - Compatible everywhere
   - Used when cursor is in file but no text selected

### Line Range Behavior

1. **Multi-line selection**: Format as `#L<startLine>-<endLine>` (e.g., `#L165-169`)
   - Claude Code specific format
   - Allows Claude to select and view a range of lines
2. **Single-line selection**: Format as `:<lineNumber>` (e.g., `:165`)
   - IDE-compatible format that works everywhere
   - Only when there's an actual text selection on that line
3. **No selection (cursor only)**: Just the file path with no line number
   - IDE-compatible format that works everywhere
   - Allows opening the file without jumping to a specific line
4. **Path type**: Always relative to project root (not absolute)

### Keyboard Shortcut

- **Key**: `Alt+O` (or alternative if conflicts detected)
- **Context**: Only available when focused on editor text
- **Note**: IntelliJ has more complex keymap system than VSCode; may need platform-specific bindings

### User Feedback

After copying, show a notification displaying what was copied to confirm the action.

---

## VSCode Repository Analysis

### Repository Structure

The existing VSCode repository (`/home/nazmul/github/r3bl-vscode-extensions`) uses a monorepo structure:

```
r3bl-vscode-extensions/
├── package.json                    # Root package.json with NPM workspaces
├── build.sh                        # Master build script
├── install.sh                      # Master install script
├── script_lib.sh                   # Shared bash functions/utilities
├── task/                          # Task documentation directory
└── packages/                      # All extensions live here
    ├── r3bl-theme/
    ├── r3bl-auto-insert-copyright/
    ├── r3bl-semantic-config/
    ├── r3bl-copy-selection-path-and-range/
    └── r3bl-extension-pack/       # Meta-extension pack
```

### Key Organizational Patterns

1. **NPM Workspaces**: Root `package.json` with `"workspaces": ["packages/*"]`
2. **Individual Extensions**: Each in `packages/` with own `package.json`, `tsconfig.json`, source code
3. **Build Scripts**:
   - `build.sh`: Sequential build, uses `vsce package --no-dependencies`
   - `install.sh`: Installs extensions with `code --install-extension`
   - `script_lib.sh`: Shared utilities (version extraction, colored output, etc.)

### Build Process

1. Check requirements (`node`, `vsce`)
2. Read versions from all `package.json` files
3. Install dependencies (`npm install` in each package)
4. Compile TypeScript / run webpack
5. Package with `vsce package` to create `.vsix` files
6. Display build summary

---

## IntelliJ Platform Differences

### Architecture & Technology

| Aspect | VSCode | IntelliJ Platform |
|--------|--------|-------------------|
| **Language** | TypeScript/JavaScript | **Kotlin** (selected) |
| **Build System** | NPM + Webpack/TSC | **Gradle Kotlin DSL** (selected) |
| **Monorepo Pattern** | NPM Workspaces | Gradle multi-project builds |
| **Package Format** | `.vsix` files | `.jar` or `.zip` files |
| **Packaging Tool** | `vsce` CLI | Gradle IntelliJ Plugin |
| **Platform Version** | VSCode 1.60.0+ | **IntelliJ 2024.1+** (selected) |

### API Comparison

**VSCode (TypeScript):**
```typescript
// Get active editor
const editor = vscode.window.activeTextEditor;
const selection = editor.selection;

// Get workspace folder
const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

// Calculate relative path
const relativePath = path.relative(workspaceFolder.uri.fsPath, absolutePath);

// Copy to clipboard
await vscode.env.clipboard.writeText(output);

// Show message
vscode.window.showInformationMessage(`Copied: ${output}`);
```

**IntelliJ (Kotlin):**
```kotlin
// Get active editor
val editor = FileEditorManager.getInstance(project).selectedTextEditor ?: return

// Get selection
val selectionModel = editor.selectionModel

// Get project base path
val projectBasePath = project.basePath ?: return

// Calculate relative path
val virtualFile = FileDocumentManager.getInstance().getFile(editor.document)
val relativePath = VfsUtil.getRelativePath(virtualFile, project.baseDir, '/')

// Copy to clipboard
CopyPasteManager.getInstance().setContents(StringSelection(output))

// Show notification
Notifications.Bus.notify(
    Notification(
        "R3BL Copy Selection",
        "Copied",
        output,
        NotificationType.INFORMATION
    ),
    project
)
```

### Selection Detection Logic

**VSCode:**
```typescript
const hasSelection = !selection.isEmpty;
const isSingleLine = selection.start.line === selection.end.line;
```

**IntelliJ:**
```kotlin
val hasSelection = selectionModel.hasSelection()
val startLine = editor.document.getLineNumber(selectionModel.selectionStart)
val endLine = editor.document.getLineNumber(selectionModel.selectionEnd)
val isSingleLine = startLine == endLine
```

---

## Implementation Plan

### Phase 0: GitHub Repository Setup

**Manual steps** (cannot be automated):

1. Create new repository at `https://github.com/r3bl-org/r3bl-intellij-extensions`
2. Initialize with:
   - `.gitignore` (Gradle + JetBrains template)
   - MIT License (matching VSCode repo)
   - Initial README.md
3. Clone to local directory:
   ```bash
   cd ~/github
   git clone git@github.com:r3bl-org/r3bl-intellij-extensions.git
   cd r3bl-intellij-extensions
   ```

### Phase 1: Repository Structure Setup

Create the Gradle multi-project structure at `~/github/r3bl-intellij-extensions/`.

#### Step 1.0: Create Directory Structure

```
r3bl-intellij-extensions/
├── build.gradle.kts                 # Root build configuration
├── settings.gradle.kts              # Multi-project setup
├── gradle.properties                # Version properties
├── gradle/wrapper/                  # Gradle wrapper
├── build.sh                         # Build all plugins script
├── install.sh                       # Install plugins script
├── task/                           # Task documentation
│   └── task_create_plugin_to_copy_selection.md
└── plugins/                        # All plugins live here
    └── r3bl-copy-selection-path/   # First plugin
```

#### Step 1.1: Create Root `settings.gradle.kts`

```kotlin
rootProject.name = "r3bl-intellij-extensions"

include(
    ":plugins:r3bl-copy-selection-path"
    // Future plugins will be added here
)
```

#### Step 1.2: Create Root `build.gradle.kts`

```kotlin
plugins {
    id("org.jetbrains.kotlin.jvm") version "1.9.24" apply false
    id("org.jetbrains.intellij") version "1.17.3" apply false
}

group = "com.r3bl"
version = "1.0.0"

allprojects {
    repositories {
        mavenCentral()
    }
}

subprojects {
    apply(plugin = "org.jetbrains.kotlin.jvm")
    apply(plugin = "org.jetbrains.intellij")

    configure<org.jetbrains.intellij.IntelliJPluginExtension> {
        version.set("2024.1")
        type.set("IC") // IntelliJ IDEA Community Edition
        updateSinceUntilBuild.set(false)
    }

    dependencies {
        // Common dependencies can be added here
    }

    tasks {
        withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
            kotlinOptions.jvmTarget = "17"
        }

        withType<JavaCompile> {
            sourceCompatibility = "17"
            targetCompatibility = "17"
        }
    }
}
```

#### Step 1.3: Create `gradle.properties`

```properties
# IntelliJ Platform
platformVersion=2024.1
platformType=IC

# Kotlin
kotlinVersion=1.9.24

# Gradle
org.gradle.jvmargs=-Xmx2048m
org.gradle.parallel=true
org.gradle.caching=true
```

#### Step 1.4: Add Gradle Wrapper

```bash
gradle wrapper --gradle-version 8.7
```

### Phase 2: Copy-Selection Plugin Implementation

Create the plugin at `plugins/r3bl-copy-selection-path/`.

#### Step 2.0: Create Directory Structure

```
plugins/r3bl-copy-selection-path/
├── build.gradle.kts
├── LICENSE
├── src/main/
│   ├── kotlin/com/r3bl/copyselection/
│   │   └── CopySelectionPathAction.kt
│   └── resources/
│       ├── META-INF/
│       │   ├── plugin.xml
│       │   └── pluginIcon.svg
│       └── icons/
│           └── r3bl-cube-logo.png
```

#### Step 2.1: Create Plugin `build.gradle.kts`

Create `plugins/r3bl-copy-selection-path/build.gradle.kts`:

```kotlin
plugins {
    id("org.jetbrains.kotlin.jvm")
    id("org.jetbrains.intellij")
}

group = "com.r3bl"
version = "1.0.0"

repositories {
    mavenCentral()
}

intellij {
    version.set("2024.1")
    type.set("IC")
    plugins.set(listOf())
}

tasks {
    patchPluginXml {
        sinceBuild.set("241")
        untilBuild.set("")
    }

    buildSearchableOptions {
        enabled = false
    }
}
```

#### Step 2.2: Create `plugin.xml`

Create `plugins/r3bl-copy-selection-path/src/main/resources/META-INF/plugin.xml`:

```xml
<idea-plugin>
    <id>com.r3bl.copy-selection-path</id>
    <name>R3BL Copy Selection Path and Range</name>
    <vendor email="info@r3bl.com" url="https://r3bl.com">R3BL</vendor>

    <description><![CDATA[
        Copy file path with selected line ranges in Claude Code compatible format.

        <ul>
            <li>No selection: path/to/file.kt</li>
            <li>Single line: path/to/file.kt:42</li>
            <li>Multi-line: path/to/file.kt#L42-45</li>
        </ul>

        Press Alt+O (or configured keybinding) to copy the current file path with line range.
    ]]></description>

    <depends>com.intellij.modules.platform</depends>

    <extensions defaultExtensionNs="com.intellij">
        <!-- No extensions needed for basic action -->
    </extensions>

    <actions>
        <action id="com.r3bl.CopySelectionPathAndRange"
                class="com.r3bl.copyselection.CopySelectionPathAction"
                text="Copy File Path with Selection Range"
                description="Copy file path with selected line ranges in Claude Code format">
            <keyboard-shortcut keymap="$default" first-keystroke="alt O"/>
            <add-to-group group-id="EditorPopupMenu" anchor="last"/>
        </action>
    </actions>
</idea-plugin>
```

#### Step 2.3: Implement Action Class

Create `plugins/r3bl-copy-selection-path/src/main/kotlin/com/r3bl/copyselection/CopySelectionPathAction.kt`:

```kotlin
package com.r3bl.copyselection

import com.intellij.notification.Notification
import com.intellij.notification.NotificationType
import com.intellij.notification.Notifications
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.ide.CopyPasteManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import java.awt.datatransfer.StringSelection
import java.nio.file.Path
import kotlin.io.path.relativeTo

class CopySelectionPathAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val editor = e.getData(CommonDataKeys.EDITOR) ?: return
        val virtualFile = e.getData(CommonDataKeys.VIRTUAL_FILE) ?: return

        val relativePath = getRelativePath(project, virtualFile) ?: run {
            showError(project, "Could not determine relative path")
            return
        }

        val lineRange = calculateLineRange(editor)
        val output = "$relativePath$lineRange"

        copyToClipboard(output)
        showNotification(project, "Copied: $output")
    }

    override fun update(e: AnActionEvent) {
        // Only enable when editor has focus
        e.presentation.isEnabled = e.getData(CommonDataKeys.EDITOR) != null
    }

    private fun getRelativePath(project: Project, virtualFile: VirtualFile): String? {
        val projectBasePath = project.basePath ?: return null
        val filePath = virtualFile.path

        return try {
            val projectPath = Path.of(projectBasePath)
            val filePathObj = Path.of(filePath)
            filePathObj.relativeTo(projectPath).toString().replace('\\', '/')
        } catch (e: Exception) {
            null
        }
    }

    private fun calculateLineRange(editor: Editor): String {
        val selectionModel = editor.selectionModel
        val document = editor.document

        // Check if there's an actual selection
        if (!selectionModel.hasSelection()) {
            return "" // No selection - return empty (just file path)
        }

        // Get line numbers (convert to 1-based)
        val startLine = document.getLineNumber(selectionModel.selectionStart) + 1
        val endLine = document.getLineNumber(selectionModel.selectionEnd) + 1

        // If selection is on a single line
        return if (startLine == endLine) {
            ":$startLine" // IDE-compatible format
        } else {
            "#L$startLine-$endLine" // Claude Code format for ranges
        }
    }

    private fun copyToClipboard(text: String) {
        CopyPasteManager.getInstance().setContents(StringSelection(text))
    }

    private fun showNotification(project: Project, message: String) {
        Notifications.Bus.notify(
            Notification(
                "R3BL Copy Selection",
                "Copy Selection Path",
                message,
                NotificationType.INFORMATION
            ),
            project
        )
    }

    private fun showError(project: Project, message: String) {
        Notifications.Bus.notify(
            Notification(
                "R3BL Copy Selection",
                "Copy Selection Path Error",
                message,
                NotificationType.ERROR
            ),
            project
        )
    }
}
```

#### Step 2.4: Copy Asset Files

Copy the following files from the VSCode repository:
- `packages/r3bl-semantic-config/LICENSE` → `plugins/r3bl-copy-selection-path/LICENSE`
- `packages/r3bl-semantic-config/r3bl-cube-logo.png` → `plugins/r3bl-copy-selection-path/src/main/resources/icons/r3bl-cube-logo.png`

### Phase 3: Build Infrastructure

#### Step 3.0: Create `build.sh`

Create `build.sh` at repository root:

```bash
#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Building R3BL IntelliJ Extensions...${NC}"

# Check if Gradle wrapper exists
if [ ! -f "./gradlew" ]; then
    echo -e "${RED}Gradle wrapper not found. Run: gradle wrapper${NC}"
    exit 1
fi

# Clean previous builds
echo -e "${BLUE}Cleaning previous builds...${NC}"
./gradlew clean

# Build all plugins
echo -e "${BLUE}Building all plugins...${NC}"
./gradlew buildPlugin

# List generated plugin files
echo -e "${GREEN}Build complete!${NC}"
echo -e "${BLUE}Generated plugin files:${NC}"
find plugins -name "*.zip" -type f

echo -e "${GREEN}All plugins built successfully!${NC}"
```

Make executable:
```bash
chmod +x build.sh
```

#### Step 3.1: Create `install.sh`

Create `install.sh` at repository root:

```bash
#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Installing R3BL IntelliJ Extensions...${NC}"

# Find IntelliJ installation
if command -v idea &> /dev/null; then
    IDEA_CMD="idea"
elif [ -d "/Applications/IntelliJ IDEA.app" ]; then
    IDEA_CMD="/Applications/IntelliJ IDEA.app/Contents/MacOS/idea"
elif [ -f "$HOME/.local/share/JetBrains/Toolbox/scripts/idea" ]; then
    IDEA_CMD="$HOME/.local/share/JetBrains/Toolbox/scripts/idea"
else
    echo -e "${RED}IntelliJ IDEA command not found${NC}"
    echo "Please install plugins manually from:"
    find plugins -name "*.zip" -type f
    exit 1
fi

# Install each plugin
for plugin in plugins/*/build/distributions/*.zip; do
    if [ -f "$plugin" ]; then
        echo -e "${BLUE}Installing $(basename $plugin)...${NC}"
        "$IDEA_CMD" installPlugins "$plugin"
    fi
done

echo -e "${GREEN}Installation complete! Please restart IntelliJ IDEA.${NC}"
```

Make executable:
```bash
chmod +x install.sh
```

#### Step 3.2: Create Root README.md

Create `README.md` at repository root:

```markdown
# R3BL IntelliJ IDEA Extensions

A collection of IntelliJ IDEA plugins for improved developer productivity.

## Plugins

### R3BL Copy Selection Path and Range

Copy file paths with selected line ranges in formats compatible with Claude Code and IDEs.

**Keybinding:** `Alt+O`

**Output formats:**
- No selection: `path/to/file.kt`
- Single line: `path/to/file.kt:42`
- Multi-line: `path/to/file.kt#L42-45`

## Building

### Prerequisites

- JDK 17 or later
- Gradle 8.7+ (or use included wrapper)

### Build All Plugins

```bash
./build.sh
```

Or manually with Gradle:

```bash
./gradlew buildPlugin
```

### Install Locally

```bash
./install.sh
```

Or manually:
1. Build the plugins (see above)
2. In IntelliJ IDEA: `Settings → Plugins → ⚙️ → Install Plugin from Disk`
3. Select the `.zip` file from `plugins/[plugin-name]/build/distributions/`

## Development

### Project Structure

```
r3bl-intellij-extensions/
├── build.gradle.kts              # Root build configuration
├── settings.gradle.kts           # Multi-project setup
├── gradle.properties             # Version properties
└── plugins/                      # Plugin modules
    └── r3bl-copy-selection-path/
```

### Adding a New Plugin

1. Create directory under `plugins/`
2. Add to `settings.gradle.kts`
3. Create `build.gradle.kts` for the plugin
4. Create `src/main/resources/META-INF/plugin.xml`
5. Implement plugin code in `src/main/kotlin/`

### Testing

```bash
./gradlew test
```

### Running in Development

```bash
./gradlew runIde
```

This launches IntelliJ IDEA with the plugin loaded for testing.

## License

MIT License - See LICENSE file for details

## Links

- [IntelliJ Platform SDK](https://plugins.jetbrains.com/docs/intellij/)
- [R3BL Website](https://r3bl.com)
```

#### Step 3.3: Create CONTRIBUTING.md

Create `CONTRIBUTING.md`:

```markdown
# Contributing to R3BL IntelliJ Extensions

## Development Setup

1. Clone the repository:
   ```bash
   git clone git@github.com:r3bl-org/r3bl-intellij-extensions.git
   cd r3bl-intellij-extensions
   ```

2. Build the project:
   ```bash
   ./gradlew build
   ```

3. Run in development mode:
   ```bash
   ./gradlew runIde
   ```

## Plugin Development

### Creating a New Plugin

1. Create plugin directory:
   ```bash
   mkdir -p plugins/my-plugin/src/main/{kotlin,resources/META-INF}
   ```

2. Add to `settings.gradle.kts`:
   ```kotlin
   include(":plugins:my-plugin")
   ```

3. Create `build.gradle.kts` in plugin directory (see existing plugins for template)

4. Create `plugin.xml` manifest

5. Implement plugin code

### Testing Changes

- Run tests: `./gradlew test`
- Run in IDE: `./gradlew runIde`
- Build plugin: `./gradlew :plugins:my-plugin:buildPlugin`

### Code Style

- Follow Kotlin coding conventions
- Use 4 spaces for indentation
- Maximum line length: 120 characters

## Submitting Changes

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## Resources

- [IntelliJ Platform SDK Documentation](https://plugins.jetbrains.com/docs/intellij/)
- [Kotlin Style Guide](https://kotlinlang.org/docs/coding-conventions.html)
```

### Phase 4: Testing & Verification

#### Step 4.0: Build the Plugin

```bash
cd ~/github/r3bl-intellij-extensions
./build.sh
```

Verify that `plugins/r3bl-copy-selection-path/build/distributions/*.zip` is created.

#### Step 4.1: Test in Development IDE

```bash
./gradlew :plugins:r3bl-copy-selection-path:runIde
```

This launches a development instance of IntelliJ IDEA with the plugin loaded.

#### Step 4.2: Manual Testing Checklist

In the development IDE:

1. **No Selection Test:**
   - Open any file
   - Place cursor without selecting text
   - Press `Alt+O`
   - Paste clipboard → Should show: `path/to/file.ext`

2. **Single Line Selection Test:**
   - Select text on a single line
   - Press `Alt+O`
   - Paste clipboard → Should show: `path/to/file.ext:42`

3. **Multi-Line Selection Test:**
   - Select text across multiple lines (e.g., lines 10-15)
   - Press `Alt+O`
   - Paste clipboard → Should show: `path/to/file.ext#L10-15`

4. **Notification Test:**
   - Verify notification appears after each copy
   - Should show: "Copied: [output]"

5. **Keybinding Conflict Check:**
   - Check if `Alt+O` conflicts with existing shortcuts
   - If conflicts exist, document alternative keybinding

#### Step 4.3: Install Locally

```bash
./install.sh
```

Restart IntelliJ IDEA and verify the plugin is installed and functional.

### Phase 5: Documentation & Repository Finalization

#### Step 5.0: Create GitHub Repository

Manual steps:
1. Go to https://github.com/r3bl-org
2. Create new repository: `r3bl-intellij-extensions`
3. Add description: "IntelliJ IDEA plugins for improved developer productivity"
4. Initialize with: .gitignore (Gradle + JetBrains), MIT License
5. Clone locally to `~/github/r3bl-intellij-extensions/`

#### Step 5.1: Initial Commit

```bash
cd ~/github/r3bl-intellij-extensions
git add .
git commit -m "Initial commit: Copy Selection Path plugin

- Gradle multi-project setup with Kotlin DSL
- R3BL Copy Selection Path plugin implementation
- Build and install scripts
- Documentation (README, CONTRIBUTING)
- Targets IntelliJ Platform 2024.1+"
git push origin main
```

#### Step 5.2: Create GitHub Release

1. Tag the release:
   ```bash
   git tag -a v1.0.0 -m "Initial release: Copy Selection Path plugin"
   git push origin v1.0.0
   ```

2. Create GitHub release:
   - Go to repository → Releases → Draft a new release
   - Tag: `v1.0.0`
   - Title: "v1.0.0 - Initial Release"
   - Description: List features and installation instructions
   - Attach: `plugins/r3bl-copy-selection-path/build/distributions/*.zip`

#### Step 5.3: Update Task Documentation

Add completion notes to this file documenting:
- What was implemented
- Any deviations from the plan
- Known issues or limitations
- Future enhancement ideas

---

## Key Differences from VSCode Implementation

### Technology Stack

- **Language**: Kotlin instead of TypeScript
- **Build System**: Gradle instead of NPM
- **API**: IntelliJ Platform SDK instead of VSCode Extension API

### API Mapping

| VSCode API | IntelliJ API |
|------------|--------------|
| `vscode.window.activeTextEditor` | `FileEditorManager.getInstance(project).selectedTextEditor` |
| `editor.selection` | `editor.selectionModel` |
| `selection.isEmpty` | `!selectionModel.hasSelection()` |
| `vscode.workspace.getWorkspaceFolder()` | `project.basePath` |
| `path.relative()` | `Path.relativeTo()` |
| `vscode.env.clipboard.writeText()` | `CopyPasteManager.getInstance().setContents()` |
| `vscode.window.showInformationMessage()` | `Notifications.Bus.notify()` |

### Selection Logic

The core logic remains the same:
1. Check if selection exists
2. Calculate line numbers (convert to 1-based)
3. Determine format based on selection state
4. Return appropriate suffix string

### Build Process

**VSCode:**
- `npm install` → `npm run compile` → `vsce package`
- Outputs: `.vsix` files

**IntelliJ:**
- `./gradlew buildPlugin`
- Outputs: `.zip` files in `build/distributions/`

---

## Future Enhancements

### Potential Additional Plugins

Based on the VSCode repository structure, these could be ported:

1. **R3BL Theme** - Port color theme to IntelliJ theme format (`.theme.json`)
2. **R3BL Auto Insert Copyright** - Automatically add copyright headers to new files
3. **R3BL Semantic Config** - Configuration management for semantic code tools
4. **R3BL Plugin Pack** - Meta-plugin that bundles all R3BL plugins

### Copy-Selection Plugin Enhancements

1. **Configurable Output Formats**: Allow users to choose from multiple format templates
2. **Multiple Clipboard Formats**: Copy different formats simultaneously
3. **GitHub/GitLab URL Format**: Generate web URLs for remote repositories
4. **Custom Keybindings**: Allow users to configure alternative shortcuts
5. **Context Menu Integration**: Add right-click menu option
6. **Relative to Module**: Support multi-module projects with module-relative paths

---

## Troubleshooting

### Build Issues

**Problem**: `Could not find org.jetbrains.intellij`
**Solution**: Ensure using Gradle 8.0+ and IntelliJ plugin 1.17.0+

**Problem**: `Unsupported class file major version`
**Solution**: Verify JDK 17+ is being used

### Runtime Issues

**Problem**: Plugin doesn't load in IntelliJ
**Solution**: Check `plugin.xml` is in `src/main/resources/META-INF/`

**Problem**: Keybinding doesn't work
**Solution**: Check for conflicts in `Settings → Keymap`, search for "Copy File Path"

### Path Issues

**Problem**: Incorrect relative paths
**Solution**: Verify `project.basePath` is correctly detected

---

## Resources

### IntelliJ Platform SDK

- [Official Documentation](https://plugins.jetbrains.com/docs/intellij/)
- [Action System](https://plugins.jetbrains.com/docs/intellij/basic-action-system.html)
- [Editor Basics](https://plugins.jetbrains.com/docs/intellij/editors.html)
- [Notifications](https://plugins.jetbrains.com/docs/intellij/notifications.html)

### Gradle & Build

- [IntelliJ Platform Gradle Plugin](https://github.com/JetBrains/gradle-intellij-plugin)
- [Gradle Kotlin DSL](https://docs.gradle.org/current/userguide/kotlin_dsl.html)

### Kotlin

- [Kotlin Documentation](https://kotlinlang.org/docs/home.html)
- [Kotlin Coding Conventions](https://kotlinlang.org/docs/coding-conventions.html)

---

## Handoff Notes

This document provides a complete implementation plan for creating the IntelliJ IDEA plugin equivalent of the VSCode "Copy Selection Path and Range" extension.

### What's Included

- Complete repository structure
- Full source code for the plugin
- Build infrastructure (Gradle, shell scripts)
- Documentation (README, CONTRIBUTING)
- Testing procedures
- GitHub setup instructions

### What's Required from Developer

1. Create GitHub repository (manual step)
2. Execute the implementation steps in order
3. Test thoroughly in development IDE
4. Make any necessary adjustments for keybinding conflicts
5. Create initial release on GitHub

### Estimated Effort

- **Repository Setup**: 1-2 hours
- **Plugin Implementation**: 2-3 hours
- **Testing & Documentation**: 1-2 hours
- **Total**: 4-7 hours for experienced developer

### Notes

- The plugin uses IntelliJ Platform 2024.1+ for latest features
- Kotlin is chosen for better IDE support and modern syntax
- Build process is simpler than VSCode (Gradle handles everything)
- Testing can be done entirely within IntelliJ using `runIde` task
