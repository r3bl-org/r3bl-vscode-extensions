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