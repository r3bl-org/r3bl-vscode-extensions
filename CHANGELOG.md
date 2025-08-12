<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Change Log](#change-log)
  - [[1.2.0] - 2025-08-12](#120---2025-08-12)
    - [Added](#added)
  - [[1.1.0] - 2025-01-12](#110---2025-01-12)
    - [Added](#added-1)
    - [Changed](#changed-1)
    - [Infrastructure](#infrastructure-1)
  - [[1.0.0] - 2024-12-04](#100---2024-12-04)
    - [Added](#added-2)
    - [Infrastructure](#infrastructure-2)
  - [Initial Releases](#initial-releases)
    - [R3BL Theme 1.0.0](#r3bl-theme-100)
    - [R3BL Auto Insert Copyright 1.0.0](#r3bl-auto-insert-copyright-100)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Change Log

All notable changes to the R3BL VSCode Extensions will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project
adheres to [Semantic Versioning](http://semver.org/).

## [1.2.0] - 2025-08-12

### Added

- **R3BL Auto Insert Copyright 1.2.0**: New Apache 2.0 one-line license template
  - Added `Apache2OneLine` license option for concise copyright headers
  - Generates single-line format: `// Copyright (c) {year} {author}. Licensed under Apache License, Version 2.0.`
  - Alternative to the traditional multi-line Apache 2.0 license block
  - Available in VS Code settings under "Apache 2.0 License (One Line)"

### Fixed

- **R3BL Auto Insert Copyright 1.2.0**: Improved copyright detection for all license formats
  - Fixed `hasCopyright` function to properly detect both single-line and multi-line copyright headers
  - Now checks both line 0 (for single-line formats like Apache2OneLine) and line 1 (for multi-line formats like MIT/Apache2/GPL3)
  - Prevents duplicate copyright insertion when using different license formats

## [1.1.0] - 2025-01-12

### Added

- **R3BL Semantic Configuration 1.0.0**: New extension for enhanced Rust syntax highlighting
  - Automatically detects when R3BL Theme is active
  - Offers to apply semantic highlighting automatically
  - Provides commands to enable/disable enhanced highlighting
  - Works seamlessly with rust-analyzer

- **R3BL Extension Pack 1.0.0**: Complete development experience in one package
  - Includes all R3BL extensions plus rust-analyzer
  - Simplified installation process
  - Zero manual configuration required

### Changed

- **R3BL Auto Insert Copyright 1.1.0**: Updated logo to unified R3BL cube design
- **Optimized File Sizes**: Removed large redundant icon files to reduce extension sizes
- **Improved Installation Process**: Extension pack now properly references and installs all individual extensions

### Infrastructure

- **New Build System**:
  - Added `build.sh` script to build all .vsix files without installing
  - Updated `install.sh` to call `build.sh` then install extensions
  - Separated build and install processes for better CI/CD support
- **Enhanced Documentation**: Updated README with detailed build and install instructions
- **Maintainer Guidelines**: Added section for keeping .vsix files up-to-date after changes

## [1.0.0] - 2024-12-04

### Added

- **R3BL Theme**: Custom VSCode theme designed for Rust development
  - Dark theme optimized for code readability
  - R3BL brand styling and colors
  - Support for all major programming languages

- **R3BL Auto Insert Copyright**: Automatic copyright header insertion
  - Automatically adds copyright notices to new files
  - Support for multiple license types (MIT, Apache 2.0, GPL 3.0, custom)
  - Manual command: `Prepend Copyright`
  - Configurable file type support
  - Support for C, C++, C#, CSS, Go, Java, JavaScript, Objective-C, Rust, SCSS, Swift,
    TypeScript, TypeScript React, Vue

### Infrastructure

- Monorepo structure using npm workspaces
- Unified build and packaging system
- Automated install script for local development
- Shared VSCode configuration and tooling
- Comprehensive documentation with extension icons

## Initial Releases

### R3BL Theme 1.0.0

- Initial release of the R3BL theme for VSCode

### R3BL Auto Insert Copyright 1.0.0

- Initial release with automatic copyright insertion functionality
- Full license template support
- Configurable settings for author and license type
