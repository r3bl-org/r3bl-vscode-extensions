# Development Guide for R3BL VSCode Extensions

This document provides instructions for Claude on working with this monorepo of R3BL VSCode extensions.

## Project Overview

This is a monorepo containing multiple R3BL VSCode extensions:

```
packages/
├── r3bl-extension-pack/              # Extension pack (installs all R3BL extensions)
├── r3bl-theme/                       # Theme extension
├── r3bl-auto-insert-copyright/       # Copyright insertion extension
├── r3bl-semantic-config/             # Semantic highlighting configuration
├── r3bl-task-management/             # Task space management extension
└── r3bl-copy-selection-path-and-range/ # Copy file paths with selection ranges extension
```

Each extension maintains its own `package.json` and can be developed independently while sharing common tooling and configuration.

## Modifying Existing Extensions

**When you make changes to an existing extension, follow these steps:**

### 1. Make Code Changes

Edit the source code in `packages/extension-name/src/`

### 2. Update Extension Version

In `packages/extension-name/package.json`, increment the version number:

```json
{
  "version": "1.2.0"  // Increment from 1.1.0
}
```

**Important:** Version numbers must follow semantic versioning (MAJOR.MINOR.PATCH).

### 3. Update Extension Pack Version

In `packages/r3bl-extension-pack/package.json`, also increment the version to reflect that it includes the updated extension:

```json
{
  "version": "1.0.5"  // Increment version to show pack includes updated extensions
}
```

⚠️ **Always update both the extension's version AND the extension pack version!**

### 4. Build and Generate Artifacts

```bash
./build.sh
```

This script automatically:
- Compiles TypeScript extensions
- Generates new .vsix files with the correct versioned names
- **Removes all outdated versions** of the extension (e.g., `r3bl-theme-1.0.2.vsix` is deleted when building 1.0.3)
- Creates the extension pack with all current extension versions

### 5. Test the Changes (Optional but Recommended)

```bash
./install.sh
```

This installs the newly built extensions to your local VSCode/Insiders.

### 6. Commit Your Changes

When making a commit, make sure you do not include the following in the commit message:
```
🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

```bash
git add packages/extension-name/src/ packages/extension-name/package.json packages/r3bl-extension-pack/package.json
git commit -m "[extension-name] Description of changes"
```

### Key Points for Modifications

- ✅ Version numbers must match between `package.json` and generated `.vsix` filenames
- ✅ Scripts automatically clean up old versions - no manual file deletion needed
- ✅ Always update both the extension's version AND the extension pack version
- ✅ Both `build.sh` and `install.sh` dynamically read versions from `package.json`

## Creating New Extensions

**To add a new extension to the monorepo:**

### 1. Create the Extension Directory

```bash
mkdir -p packages/r3bl-new-extension/src
```

### 2. Copy Structure from Existing Extension

```bash
cp -r packages/r3bl-task-management/{package.json,tsconfig.json,webpack.config.js,.vscodeignore} packages/r3bl-new-extension/
```

### 3. Update Extension Metadata

In `packages/r3bl-new-extension/package.json`:

```json
{
  "name": "r3bl-new-extension",
  "displayName": "R3BL New Extension",
  "version": "1.0.0",
  "publisher": "R3BL",
  "description": "Description of what this extension does"
}
```

### 4. Implement Your Extension

Create the source code in `packages/r3bl-new-extension/src/`

### 5. Add Extension to Extension Pack

In `packages/r3bl-extension-pack/package.json`, add to the `extensionPack` array:

```json
{
  "version": "1.0.X",  // Increment
  "extensionPack": [
    "R3BL.r3bl-theme",
    "R3BL.r3bl-auto-insert-copyright",
    "R3BL.r3bl-semantic-config",
    "R3BL.r3bl-task-management",
    "R3BL.r3bl-new-extension"  // ← Add here
  ]
}
```

### 6. Update README.md

- Add the new extension to the table of contents
- Add a section under "Individual Extensions"
- Update the "Extension Pack" description
- Update the "Structure" section

### 7. Update `script_lib.sh`

Add version detection for the new extension:

```bash
NEW_EXTENSION_VERSION=$(get_version "./packages/r3bl-new-extension/package.json")
```

### 8. Update `build.sh`

Add a build section for the new extension:

```bash
# Build R3BL New Extension
echo -e "${BLUE}Building R3BL New Extension...${NC}"
cd packages/r3bl-new-extension
npm install
npm run compile
vsce package --no-dependencies
cleanup_old_versions "r3bl-new-extension" "$NEW_EXTENSION_VERSION" "."
cd ../..
```

### 9. Update `install.sh`

Add an install section for the new extension:

```bash
# Install R3BL New Extension
if command -v code &> /dev/null; then
    code --install-extension packages/r3bl-new-extension/r3bl-new-extension-${NEW_EXTENSION_VERSION}.vsix
fi
```

### 10. Build and Test

```bash
./build.sh
./install.sh
```

### 11. Commit All Changes

When making a commit, make sure you do not include the following in the commit message:
```
🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

```bash
git add packages/r3bl-new-extension/ packages/r3bl-extension-pack/package.json README.md script_lib.sh build.sh install.sh
git commit -m "[extension-name] Add r3bl-new-extension"
```

### Key Points for Creating New Extensions

- ✅ New extensions must follow the same structure as existing ones
- ✅ Must be added to the extension pack's `extensionPack` array
- ✅ Must be integrated into `build.sh` and `install.sh`
- ✅ Start with version 1.0.0
- ✅ Update all documentation

## For Maintainers

**⚠️ Important:** After making changes to any extension, always run:

```bash
./build.sh
```

This generates all .vsix files with your latest changes. The build script:
- Compiles TypeScript extensions (r3bl-auto-insert-copyright, r3bl-semantic-config, r3bl-copy-selection-path-and-range)
- Packages all individual extensions
- Builds the extension pack
- Creates all .vsix artifacts in their respective directories

After building, run `./install.sh` to install the generated .vsix files. This separation is crucial for:
- Clean separation between building and installing
- Enabling CI/CD workflows that only build artifacts
- Allowing install.sh to work with pre-built .vsix files
- Maintaining consistency across the monorepo

## Build and Package Commands

```bash
# Generate all extension .vsix artifacts
./build.sh

# Or build specific extensions manually:
npm run build:theme
npm run build:copyright
npm run build:semantic-config

# Package specific extensions:
npm run package:theme
npm run package:copyright
npm run package:semantic-config
npm run package:extension-pack
```

## Maintaining CHANGELOG.md

**Always update CHANGELOG.md when making changes to extensions.** This keeps users informed about what's new.

### Format and Structure

The CHANGELOG follows [Keep a Changelog](http://keepachangelog.com/) format:

```markdown
## [YYYY-MM-DD] - Brief Description

### Package Versions
- **Extension Name**: OLD_VERSION → NEW_VERSION
- **R3BL Extension Pack**: OLD_VERSION → NEW_VERSION

### Changes

- **Extension Name VERSION**: Brief description
  - Detailed bullet point about what changed
  - Another detail
  - Include technical improvements or bug fixes
```

### When to Update

Update CHANGELOG.md when:
- Making changes to any extension (new features, bug fixes, refactors)
- Updating version numbers
- Adding or removing extensions from the pack

### Example Entry

```markdown
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
```

### Key Points

- ✅ Add new entry at the TOP of the changelog (most recent first)
- ✅ Use today's date in [YYYY-MM-DD] format
- ✅ List all extensions that changed with old → new versions
- ✅ Include clear descriptions of what changed and why
- ✅ Be user-focused: explain benefits, not just technical details
- ✅ Update changelog BEFORE committing

## Quick Workflow Checklist

When modifying an extension:

- [ ] Make code changes in `packages/extension-name/src/`
- [ ] Update version in `packages/extension-name/package.json`
- [ ] Update version in `packages/r3bl-extension-pack/package.json`
- [ ] Update CHANGELOG.md with changes and new versions
- [ ] Run `./build.sh` to generate artifacts
- [ ] Run `./install.sh` to test locally (optional)
- [ ] Commit changes with proper git add of modified files
- [ ] Push to repository

When creating a new extension:

- [ ] Create directory structure in `packages/`
- [ ] Copy configuration files from existing extension
- [ ] Update `package.json` metadata
- [ ] Implement extension in `src/`
- [ ] Add to `r3bl-extension-pack/package.json`
- [ ] Update README.md
- [ ] Update CHANGELOG.md with new extension
- [ ] Update `script_lib.sh`, `build.sh`, `install.sh`
- [ ] Run `./build.sh` and `./install.sh` to test
- [ ] Commit all changes

## Version Management Notes

The following files automatically read versions from `package.json`:
- `build.sh` - reads version to name .vsix files correctly
- `install.sh` - reads version to install correct .vsix files

Do NOT manually edit version numbers in scripts or .vsix filenames. The scripts handle this automatically based on the `package.json` version fields.
