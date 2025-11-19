<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Change Log](#change-log)
  - [[2025-09-08] - Theme Color Refinements](#2025-09-08---theme-color-refinements)
    - [Package Versions](#package-versions)
    - [Changes](#changes)
  - [[2025-01-29] - Semantic Configuration Enhancement](#2025-01-29---semantic-configuration-enhancement)
    - [Package Versions](#package-versions)
    - [Changes](#changes)
  - [[2025-01-20] - Copyright and Theme Updates](#2025-01-20---copyright-and-theme-updates)
    - [Package Versions](#package-versions-1)
    - [Changes](#changes-1)
  - [[2025-01-12] - New Extensions Added](#2025-01-12---new-extensions-added)
    - [Package Versions](#package-versions-2)
    - [Changes](#changes-2)
  - [[2024-12-04] - Initial Release](#2024-12-04---initial-release)
    - [Package Versions](#package-versions-3)
    - [Changes](#changes-3)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Change Log

All notable changes to the R3BL VSCode Extensions will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project
adheres to [Semantic Versioning](http://semver.org/).

## [2025-11-19] - Theme Warning Colors and Debounced Flycheck Feature

### Package Versions
- **R3BL Theme**: 1.0.11 → 1.0.12
- **R3BL Semantic Configuration**: 1.0.6 → 1.0.7
- **R3BL Extension Pack**: 1.0.28 → 1.0.30

### Changes

- **R3BL Theme 1.0.12**: Added status bar warning colors
  - Added `statusBarItem.warningBackground` (`#b58900` - amber/gold)
  - Added `statusBarItem.warningForeground` (`#f8f8f2` - white)
  - Fixes contrast issues with status bar warning indicators

- **R3BL Semantic Configuration 1.0.7**: New debounced flycheck feature
  - **Intelligent flycheck timing**: Automatically runs `rust-analyzer.runFlycheck` after a configurable period of typing inactivity
  - **Replaces checkOnSave**: Provides continuous feedback without save-triggered interruptions
  - **Live status bar countdown**: Shows "Flycheck in 0.8s..." with real-time countdown
  - **Status bar spinner**: Shows "Running flycheck..." during execution
  - **Global debounce timer**: All Rust file changes share one timer (workspace-wide check)
  - **Manual trigger command**: `R3BL: Run Flycheck (Debounced)` cancels pending and runs immediately
  - **Auto-disable checkOnSave**: Automatically sets `rust-analyzer.checkOnSave` to `false` with notification
  - **Configurable settings**:
    - `enabled`: Enable/disable feature (default: true)
    - `delayMs`: Delay before flycheck (default: 1000ms, range: 100-10000)
    - `languages`: Languages to monitor (default: ["rust"])
    - `autoDisableCheckOnSave`: Auto-disable rust-analyzer checkOnSave (default: true)
  - **Recommended keybinding**: `Ctrl+R` for manual flycheck trigger

## [2025-11-18] - Copy Selection Path and Range: Republish

### Package Versions
- **R3BL Copy Selection Path and Range**: 1.0.8 → 1.0.9
- **R3BL Extension Pack**: 1.0.27 → 1.0.28

### Changes

- **R3BL Copy Selection Path and Range 1.0.9**: Version bump to resolve marketplace verification
  - Republished to push through stuck verification status
  - No functional changes from 1.0.8

## [2025-11-18] - Task Management: Pinned Tabs, Tab Ordering, and Diff-Based Sync

### Package Versions
- **R3BL Task Management**: 1.0.5 → 1.0.7
- **R3BL Extension Pack**: 1.0.22 → 1.0.24

### Changes

- **R3BL Task Management 1.0.7**: Major improvements to tab state management
  - **Pinned tabs preserved**: When switching task spaces or restarting VS Code, pinned tabs maintain their pinned state
  - **Tab ordering preserved**: Tabs maintain their exact order when switching or restarting
  - **Smart startup restore**: Skips restore if current tabs already match saved state (no jarring close/reopen)
  - **Diff-based sync**: Only applies minimal changes (close/open/move/pin) instead of full restore
  - **Cross-IDE sync**: Changes in one VS Code instance reflect in another via file watcher
  - **Data format upgrade**: Storage format upgraded from v1.0 to v2.0 with automatic migration
  - **New TabInfo structure**: Tabs now store both path and pinned state
  - **New configuration option**: `r3bl-task-management.restoreTabsOnStartup` (default: true)

## [2025-11-18] - Documentation and Screenshot Updates

### Package Versions
- **R3BL Copy Selection Path and Range**: 1.0.4 → 1.0.5
- **R3BL Fuzzy Search**: 1.0.2 → 1.0.3
- **R3BL Task Management**: 1.0.4 → 1.0.5
- **R3BL Extension Pack**: 1.0.20 → 1.0.21

### Changes

- **R3BL Copy Selection Path and Range 1.0.5**: Enhanced README with comprehensive documentation
  - Added screenshots demonstrating single-line and multi-line selection formats
  - Improved documentation clarity for Claude Code integration

- **R3BL Fuzzy Search 1.0.3**: Updated README documentation
  - Improved usage instructions and examples

- **R3BL Task Management 1.0.5**: Updated README documentation
  - Enhanced documentation for task space features

## [2025-11-17] - Extension Pack Documentation Update

### Package Versions
- **R3BL Extension Pack**: 1.0.16 → 1.0.17

### Changes

- **R3BL Extension Pack 1.0.17**: Updated README with complete extension list
  - Added missing R3BL Fuzzy Search to README
  - Improved "What you get" section with all features
  - Enhanced descriptions for task management and fuzzy search
  - Complete and accurate documentation of all included extensions

## [2025-11-17] - Theme and Semantic Configuration Integration

### Package Versions
- **R3BL Theme**: 1.0.7 → 1.0.8
- **R3BL Semantic Configuration**: 1.0.3 → 1.0.4
- **R3BL Extension Pack**: 1.0.15 → 1.0.16

### Changes

- **R3BL Theme 1.0.8**: Formalized dependency on semantic configuration
  - Added `extensionDependencies` to automatically install R3BL Semantic Configuration
  - Updated README to explain the relationship between theme and semantic config
  - Users installing the theme now automatically get optimized semantic highlighting

- **R3BL Semantic Configuration 1.0.4**: Clarified relationship with R3BL Theme
  - Updated README to clearly indicate this extension is a companion to R3BL Theme
  - Documented automatic installation when theme is installed
  - Improved documentation on how the extensions work together

## [2025-11-17] - Marketplace Metadata Improvements

### Package Versions
- **R3BL Task Management**: 1.0.3 → 1.0.4
- **R3BL Theme**: 1.0.6 → 1.0.7
- **R3BL Auto Insert Copyright**: 1.2.3 → 1.2.4
- **R3BL Semantic Configuration**: 1.0.2 → 1.0.3
- **R3BL Copy Selection Path and Range**: 1.0.3 → 1.0.4
- **R3BL Fuzzy Search**: 1.0.1 → 1.0.2
- **R3BL Extension Pack**: 1.0.14 → 1.0.15

### Changes

- **All Extensions**: Improved marketplace discoverability
  - Fixed categories: 5 extensions moved from "Other" to appropriate categories (Productivity, Formatters, Programming Languages, Themes)
  - Added comprehensive keywords to all extensions for better search results
  - **R3BL Task Management**: Added 9 keywords (task management, workspace, tabs, context switching, workflow, task spaces, claude code, productivity, organization)
  - **R3BL Theme**: Added 6 keywords (theme, color theme, dark theme, rust, syntax highlighting, r3bl)
  - **R3BL Auto Insert Copyright**: Expanded keywords from 2 to 8 (copyright, license, header, automatic, mit, apache, gpl, legal)
  - **R3BL Semantic Configuration**: Added 5 keywords (semantic highlighting, syntax highlighting, configuration, rust, settings)
  - **R3BL Copy Selection Path and Range**: Expanded keywords from 5 to 9 (copy, selection, path, range, claude, claude code, file reference, line numbers, clipboard)
  - **R3BL Fuzzy Search**: Expanded keywords from 5 to 8 (search, fzf, fuzzy, ripgrep, find, file search, fuzzy finder, grep)

## [2025-11-17] - Claude Code Integration for Task Management

### Package Versions
- **R3BL Task Management**: 1.0.2 → 1.0.3
- **R3BL Extension Pack**: 1.0.13 → 1.0.14

### Changes

- **R3BL Task Management 1.0.3**: Claude Code integration and UX improvements
  - **Install Claude Code Integration** command installs `/r3bl-task` slash command
    - Creates `.claude/commands/r3bl-task.md` with task management commands
    - Supports `/r3bl-task create|update|load [task_name]` workflow
    - Enables managing task files from Claude Code CLI
  - **Create Task Space from Task File** command for easy task space creation
    - Quick pick shows ONLY unlinked task files (no longer shows already-linked files)
    - Clear messaging when all files are linked or no files exist
    - Pre-fills task space name from filename
    - Creates task space and switches to it in one action
    - **Fixed race condition bug**: Task space now properly activates when created from file
  - **Smart prompting** when creating task spaces with linked files
    - Non-intrusive notification offers to install Claude Code integration
    - "Don't Ask Again" option respects user preference
    - Only shows if `.claude/commands/r3bl-task.md` doesn't exist
  - **Silent missing file handling**: Files that can't be opened (e.g., on different branch) are silently skipped with console logging instead of showing error notifications
  - **Save lifecycle documentation**: Added comprehensive section to README explaining when task-spaces.json is saved
  - **Power-user workflow**: Run multiple Claude Code instances in parallel (terminal tabs/tmux panes), each working on different tasks, coordinated through a single VS Code instance with task spaces
  - New helper methods for task file management in `TaskSpaceManager`

## [2025-11-17] - Task Management Enhancement

### Package Versions
- **R3BL Task Management**: 1.0.1 → 1.0.2
- **R3BL Extension Pack**: 1.0.12 → 1.0.13

### Changes

- **R3BL Task Management 1.0.2**: Move task files to done folder on deletion
  - When deleting a task space with an associated task file, the file is automatically moved from `task/` to `task/done/`
  - Creates `task/done/` directory if it doesn't exist
  - Handles filename collisions by adding numeric suffixes (e.g., `task_foo_2.md`, `task_foo_3.md`)
  - Shows warning if file cannot be moved but continues with task space deletion
  - Updated deletion confirmation dialog to inform users about file relocation
  - Task files are optional - if no file is associated with a task space, deletion works normally without any file operations

## [2025-11-16] - Auto Insert Copyright Bug Fix

### Package Versions
- **R3BL Auto Insert Copyright**: 1.2.2 → 1.2.3
- **R3BL Extension Pack**: 1.0.10 → 1.0.11

### Changes

- **R3BL Auto Insert Copyright 1.2.3**: Fixed duplicate license insertion bug
  - Fixed critical bug where MIT licenses were repeatedly inserted on every tab switch
  - Improved copyright detection to scan first 30 lines for copyright/license keywords
  - Now properly detects MIT license format where "Copyright" appears on line 3
  - Prevents duplicate license headers from being added to files that already have them
  - Enhanced detection logic with hybrid approach: checks single-line formats and scans multi-line comment blocks
  - All license formats now properly detected: MIT, Apache2, Apache2OneLine, GPL3

## [2025-11-16] - New Extension: R3BL Fuzzy Search

### Package Versions
- **R3BL Fuzzy Search**: NEW → 1.0.0
- **R3BL Extension Pack**: 1.0.9 → 1.0.10

### Changes

- **R3BL Fuzzy Search 1.0.0**: Initial release of fuzzy search extension
  - Fuzzy search across file contents using fzf and ripgrep
  - Smart search with typo tolerance (e.g., "exprt" finds "export")
  - Results displayed in VS Code's Search Editor format with clickable navigation
  - Results automatically saved to `/tmp/` with query-based filename (spaces → underscores)
  - Configurable exclude patterns for files and directories (default: node_modules, .git, .vscode, target)
  - Configurable result limit (default: 100, range: 1-10000)
  - Toggle .gitignore respect on/off (enabled by default)
  - Automatically respects .gitignore, .ignore, and .rgignore files
  - Custom keybinding: `Alt+Shift+D` (same for macOS and Linux)
  - Clean UI with visual indicators (■/.□ for gitignore status)
  - Icon buttons for toggling settings and modifying exclude patterns
  - Platform support: macOS and Linux only (Windows not supported)
  - Requires ripgrep (rg) and fzf to be installed on the system

- **R3BL Extension Pack 1.0.10**: Updated to include R3BL Fuzzy Search
  - Added R3BL Fuzzy Search 1.0.0 to extension pack
  - Now provides complete development experience including fuzzy file content search

## [2025-11-14] - Sublime Merge Color Integration

### Package Versions
- **R3BL Theme**: 1.0.5 → 1.0.6
- **R3BL Extension Pack**: 1.0.8 → 1.0.9

### Changes

- **R3BL Theme 1.0.6**: Sublime Merge color scheme integration
  - Updated sidebar background to `#121c26` (exact color from Sublime Merge theme)
  - Changed explorer selection color from blue (`#094771`) to magenta-purple (`#563044`)
  - Updated hover state to `#634a54` for better visual feedback
  - Changed inactive selection to `#46273a` for clearer state differentiation
  - Updated text colors: foreground to `#aaa`, headings to `#ddd`
  - Integrated color palette from custom Sublime Merge theme for consistent aesthetic
  - Enhances overall sidebar visibility and provides a more cohesive color experience

## [2025-11-13] - Copy Selection Enhancement and Theme Refinement

### Package Versions
- **R3BL Copy Selection Path and Range**: 1.0.2 → 1.0.3
- **R3BL Theme**: 1.0.4 → 1.0.5
- **R3BL Extension Pack**: 1.0.7 → 1.0.8

### Changes

- **R3BL Copy Selection Path and Range 1.0.3**: Clickable notification feature
  - Added "Open" button to notification when copying file path and range
  - Click button to navigate directly to the copied file and selection in editor
  - Improves workflow by allowing quick navigation back to copied locations

- **R3BL Theme 1.0.5**: Improved tree structure visibility
  - Updated `tree.indentGuidesStroke` color to `#b58fa399` for better visibility
  - Enhances file explorer tree navigation experience

## [2025-09-08] - Theme Color Refinements

### Package Versions
- **R3BL Theme**: 1.0.1 → 1.0.2
- **R3BL Extension Pack**: 1.0.1 → 1.0.2

### Changes

- **R3BL Theme 1.0.2**: Enhanced UI color refinements for better visual hierarchy
  - Updated tab border and inactive tab background from `#253340` to darker `#202530` for improved contrast
  - Changed title bar colors from `#253340` to darker `#1a1f26` for better visual separation
  - These subtle color adjustments create a more refined and cohesive dark theme experience
  - Improved overall visual hierarchy while maintaining the signature R3BL aesthetic

- **R3BL Extension Pack 1.0.2**: Updated to include latest theme refinements
  - Updated to include R3BL Theme 1.0.2 with improved UI colors
  - Maintains complete development experience with latest visual enhancements

## [2025-01-29] - Semantic Configuration Enhancement

### Package Versions
- **R3BL Semantic Configuration**: 1.0.0 → 1.0.1
- **R3BL Extension Pack**: 1.0.0 → 1.0.1

### Changes

- **R3BL Semantic Configuration 1.0.1**: Enhanced settings management
  - Added duplicate `editor.semanticHighlighting.enabled` detection to prevent conflicts
  - Shows warning if multiple entries found in settings.json (can happen with language-specific overrides)  
  - Helps prevent configuration conflicts by guiding users to consolidate entries
  - Improved reliability of semantic highlighting configuration

- **R3BL Extension Pack 1.0.1**: Updated to include latest Semantic Configuration
  - Updated dependency to R3BL Semantic Configuration 1.0.1
  - Maintains complete development experience with latest enhancements

## [2025-01-20] - Copyright and Theme Updates

### Package Versions
- **R3BL Auto Insert Copyright**: 1.1.0 → 1.2.0
- **R3BL Theme**: 1.0.0 → 1.0.1

### Changes

- **R3BL Auto Insert Copyright 1.2.0**: New Apache 2.0 one-line license template
  - Added `Apache2OneLine` license option for concise copyright headers
  - Generates single-line format: `// Copyright (c) {year} {author}. Licensed under Apache License, Version 2.0.`
  - Alternative to the traditional multi-line Apache 2.0 license block
  - Available in VS Code settings under "Apache 2.0 License (One Line)"
  - Improved copyright detection for all license formats:
    - Fixed `hasCopyright` function to properly detect both single-line and multi-line copyright headers
    - Now checks both line 0 (for single-line formats like Apache2OneLine) and line 1 (for multi-line formats like MIT/Apache2/GPL3)
    - Prevents duplicate copyright insertion when using different license formats

- **R3BL Theme 1.0.1**: Significantly improved comment visibility and readability
  - Updated comment colors from dull `#6272A4`/`#9C8CB2` to bright `#D4C4E8` for better contrast
  - Fixed all comment color definitions including:
    - General comments (`comment`, `punctuation.definition.comment`)
    - GraphQL line comments (`comment.line.graphql`)
    - GraphQL documentation strings (`string.block.description.graphql.DOCSTRING`)
    - Unused and wildcard comments
  - Enhanced readability for Rust code comments and all supported languages

## [2025-01-12] - New Extensions Added

### Package Versions
- **R3BL Semantic Configuration**: Initial release 1.0.0
- **R3BL Extension Pack**: Initial release 1.0.0
- **R3BL Auto Insert Copyright**: 1.0.0 → 1.1.0

### Changes

- **R3BL Semantic Configuration 1.0.0**: New extension for enhanced Rust syntax highlighting
  - Automatically detects when R3BL Theme is active
  - Offers to apply semantic highlighting automatically
  - Provides commands to enable/disable enhanced highlighting
  - Works seamlessly with rust-analyzer
  - Comprehensive semantic token customizations for Rust development

- **R3BL Extension Pack 1.0.0**: Complete development experience in one package
  - Includes all R3BL extensions plus rust-analyzer
  - Simplified installation process
  - Zero manual configuration required
  - One-click setup for complete R3BL development environment

- **R3BL Auto Insert Copyright 1.1.0**: Updated visual identity
  - Updated logo to unified R3BL cube design
  - Improved consistency across extension family
  - Maintained all existing functionality

### Infrastructure

- **New Build System**:
  - Added `build.sh` script to build all .vsix files without installing
  - Updated `install.sh` to call `build.sh` then install extensions
  - Separated build and install processes for better CI/CD support
- **Enhanced Documentation**: Updated README with detailed build and install instructions
- **Maintainer Guidelines**: Added section for keeping .vsix files up-to-date after changes
- **Optimized File Sizes**: Removed large redundant icon files to reduce extension sizes
- **Improved Installation Process**: Extension pack now properly references and installs all individual extensions

## [2024-12-04] - Initial Release

### Package Versions
- **R3BL Theme**: Initial release 1.0.0
- **R3BL Auto Insert Copyright**: Initial release 1.0.0

### Changes

- **R3BL Theme 1.0.0**: Custom VSCode theme designed for Rust development
  - Dark theme optimized for code readability
  - R3BL brand styling and colors
  - Support for all major programming languages
  - Professional appearance with carefully selected color palette

- **R3BL Auto Insert Copyright 1.0.0**: Automatic copyright header insertion
  - Automatically adds copyright notices to new files
  - Support for multiple license types (MIT, Apache 2.0, GPL 3.0, custom)
  - Manual command: `Prepend Copyright`
  - Configurable file type support
  - Support for C, C++, C#, CSS, Go, Java, JavaScript, Objective-C, Rust, SCSS, Swift,
    TypeScript, TypeScript React, Vue
  - Full license template support
  - Configurable settings for author and license type

### Infrastructure

- Monorepo structure using npm workspaces
- Unified build and packaging system
- Automated install script for local development
- Shared VSCode configuration and tooling
- Comprehensive documentation with extension icons