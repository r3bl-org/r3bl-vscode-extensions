# Change Log

All notable changes to the R3BL VSCode Extensions will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

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
  - Support for C, C++, C#, CSS, Go, Java, JavaScript, Objective-C, Rust, SCSS, Swift, TypeScript, TypeScript React, Vue

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