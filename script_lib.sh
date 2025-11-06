#!/bin/bash

# R3BL VSCode Extensions - Shared Script Library
# ==============================================
# This file contains common functions used by build.sh and install.sh

# Colors for output
RED='\033[1;31m'
GREEN='\033[1;32m'
BLUE='\033[1;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to get version from package.json
# Usage: get_version "./path/to/package.json"
get_version() {
    local package_path="$1"
    if [ ! -f "$package_path" ]; then
        echo -e "${RED}Error: package.json not found at $package_path${NC}" >&2
        exit 1
    fi
    node -p "require('$package_path').version" 2>/dev/null || {
        echo -e "${RED}Error: Failed to read version from $package_path${NC}" >&2
        exit 1
    }
}

# Function to get all extension versions
# Sets global variables: THEME_VERSION, COPYRIGHT_VERSION, SEMANTIC_VERSION, TASK_MANAGEMENT_VERSION, COPY_SELECTION_VERSION, EXTENSION_PACK_VERSION
get_all_versions() {
    echo -e "${BLUE}Reading extension versions...${NC}"

    THEME_VERSION=$(get_version "./packages/r3bl-theme/package.json")
    COPYRIGHT_VERSION=$(get_version "./packages/r3bl-auto-insert-copyright/package.json")
    SEMANTIC_VERSION=$(get_version "./packages/r3bl-semantic-config/package.json")
    TASK_MANAGEMENT_VERSION=$(get_version "./packages/r3bl-task-management/package.json")
    COPY_SELECTION_VERSION=$(get_version "./packages/r3bl-copy-selection-path-and-range/package.json")
    EXTENSION_PACK_VERSION=$(get_version "./packages/r3bl-extension-pack/package.json")

    echo -e "${BLUE}Detected versions:${NC}"
    echo "  • R3BL Theme: ${THEME_VERSION}"
    echo "  • R3BL Auto Insert Copyright: ${COPYRIGHT_VERSION}"
    echo "  • R3BL Semantic Configuration: ${SEMANTIC_VERSION}"
    echo "  • R3BL Task Management: ${TASK_MANAGEMENT_VERSION}"
    echo "  • R3BL Copy Selection Path and Range: ${COPY_SELECTION_VERSION}"
    echo "  • R3BL Extension Pack: ${EXTENSION_PACK_VERSION}"
    echo ""
}

# Function to check if required tools are available
check_requirements() {
    local missing_tools=()

    # Check for Node.js (required for version detection)
    if ! command -v node &> /dev/null; then
        missing_tools+=("node")
    fi

    # Check for vsce (required for building)
    if ! command -v vsce &> /dev/null; then
        missing_tools+=("vsce (@vscode/vsce)")
    fi

    if [ ${#missing_tools[@]} -gt 0 ]; then
        echo -e "${RED}Error: Missing required tools:${NC}"
        for tool in "${missing_tools[@]}"; do
            echo "  • $tool"
        done
        echo ""
        echo -e "${YELLOW}Please install the missing tools and try again.${NC}"
        echo "  • Node.js: https://nodejs.org/"
        echo "  • vsce: npm install -g @vscode/vsce"
        exit 1
    fi
}

# Function to remove outdated VSIX files for an extension
# Usage: cleanup_old_versions "extension-name" "current-version" "packages/extension-folder"
cleanup_old_versions() {
    local extension_name="$1"
    local current_version="$2"
    local extension_path="$3"

    if [ ! -d "$extension_path" ]; then
        return
    fi

    # Find all VSIX files for this extension and remove outdated ones
    local count=0
    for vsix_file in "$extension_path"/${extension_name}-*.vsix; do
        # Check if file exists (glob might not expand to anything)
        if [ -f "$vsix_file" ]; then
            # Extract version from filename
            local file_version=$(basename "$vsix_file" | sed "s/${extension_name}-//;s/.vsix//")

            # If version doesn't match current version, remove it
            if [ "$file_version" != "$current_version" ]; then
                rm -f "$vsix_file"
                echo -e "${YELLOW}Removed outdated: ${vsix_file}${NC}"
                ((count++))
            fi
        fi
    done

    if [ $count -gt 0 ]; then
        echo -e "${BLUE}Cleaned up $count outdated version(s) of $extension_name${NC}"
    fi
}

# Function to print extension list with dynamic versions
print_built_extensions() {
    echo ""
    echo -e "${GREEN}🎉 All extensions built successfully!${NC}"
    echo ""
    echo -e "${BLUE}Built extensions:${NC}"
    echo "  • packages/r3bl-theme/r3bl-theme-${THEME_VERSION}.vsix"
    echo "  • packages/r3bl-auto-insert-copyright/r3bl-auto-insert-copyright-${COPYRIGHT_VERSION}.vsix"
    echo "  • packages/r3bl-semantic-config/r3bl-semantic-config-${SEMANTIC_VERSION}.vsix"
    echo "  • packages/r3bl-task-management/r3bl-task-management-${TASK_MANAGEMENT_VERSION}.vsix"
    echo "  • packages/r3bl-copy-selection-path-and-range/r3bl-copy-selection-path-and-range-${COPY_SELECTION_VERSION}.vsix"
    echo "  • packages/r3bl-extension-pack/r3bl-extension-pack-${EXTENSION_PACK_VERSION}.vsix"
    echo ""
    echo -e "${BLUE}To install the extensions, run: ./install.sh${NC}"
}
