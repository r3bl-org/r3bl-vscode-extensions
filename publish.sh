#!/bin/bash

set -e

# Source shared script library
source ./script_lib.sh

# Get all extension versions
get_all_versions

# Check for required tokens (expected to be set in ~/.profile or environment)
if [ -z "$VSCE_PAT" ]; then
    echo -e "${RED}Error: VSCE_PAT not set${NC}"
    echo "Add to ~/.profile: export VSCE_PAT='your-vs-marketplace-token'"
    exit 1
fi

if [ -z "$OVSX_PAT" ]; then
    echo -e "${RED}Error: OVSX_PAT not set${NC}"
    echo "Add to ~/.profile: export OVSX_PAT='your-open-vsx-token'"
    exit 1
fi

# Map extension names to their versions
declare -A EXT_VERSIONS=(
    ["r3bl-shared"]="${SHARED_VERSION}"
    ["r3bl-semantic-config"]="${SEMANTIC_VERSION}"
    ["r3bl-theme"]="${THEME_VERSION}"
    ["r3bl-auto-insert-copyright"]="${COPYRIGHT_VERSION}"
    ["r3bl-copy-selection-path-and-range"]="${COPY_SELECTION_VERSION}"
    ["r3bl-fuzzy-search"]="${FUZZY_SEARCH_VERSION}"
    ["r3bl-task-management"]="${TASK_MANAGEMENT_VERSION}"
    ["r3bl-extension-pack"]="${EXTENSION_PACK_VERSION}"
)

# Show usage if no arguments
if [ $# -eq 0 ]; then
    echo "📦 Publish R3BL Extensions to Marketplaces"
    echo "==========================================="
    echo ""
    echo "Usage: ./publish.sh <extension-name> [extension-name...]"
    echo ""
    echo "Available extensions:"
    for ext in "${!EXT_VERSIONS[@]}"; do
        echo "  • ${ext} (v${EXT_VERSIONS[$ext]})"
    done | sort
    echo ""
    echo "Examples:"
    echo "  ./publish.sh r3bl-task-management"
    echo "  ./publish.sh r3bl-task-management r3bl-extension-pack"
    echo "  ./publish.sh r3bl-shared r3bl-theme r3bl-task-management r3bl-extension-pack"
    exit 0
fi

echo "📦 Publishing R3BL Extensions to Marketplaces..."
echo "================================================="
echo ""

# Publish each specified extension
for ext in "$@"; do
    version="${EXT_VERSIONS[$ext]}"

    if [ -z "$version" ]; then
        echo -e "${RED}Error: Unknown extension '${ext}'${NC}"
        echo "Run ./publish.sh without arguments to see available extensions."
        exit 1
    fi

    vsix_path="packages/${ext}/${ext}-${version}.vsix"

    if [ ! -f "$vsix_path" ]; then
        echo -e "${RED}Error: VSIX not found: ${vsix_path}${NC}"
        echo "Run ./build.sh first to generate the VSIX file."
        exit 1
    fi

    echo -e "${BLUE}Publishing ${ext} v${version}...${NC}"

    # Publish to VS Marketplace
    echo -e "  ${BLUE}→ VS Marketplace${NC}"
    if npx vsce publish --packagePath "$vsix_path" -p "$VSCE_PAT" 2>&1 | grep -q "already exists"; then
        echo -e "  ${YELLOW}⚠ Already exists on VS Marketplace${NC}"
    elif npx vsce publish --packagePath "$vsix_path" -p "$VSCE_PAT"; then
        echo -e "  ${GREEN}✓ Published to VS Marketplace${NC}"
    else
        echo -e "  ${RED}✗ Failed to publish to VS Marketplace${NC}"
    fi

    # Publish to Open VSX
    echo -e "  ${BLUE}→ Open VSX${NC}"
    if npx ovsx publish "$vsix_path" -p "$OVSX_PAT" 2>&1 | grep -q "already published"; then
        echo -e "  ${YELLOW}⚠ Already exists on Open VSX${NC}"
    elif npx ovsx publish "$vsix_path" -p "$OVSX_PAT"; then
        echo -e "  ${GREEN}✓ Published to Open VSX${NC}"
    else
        echo -e "  ${RED}✗ Failed to publish to Open VSX${NC}"
    fi

    echo ""
done

echo -e "${GREEN}🎉 Done!${NC}"
echo ""
echo "Check your extensions at:"
echo "  VS Marketplace: https://marketplace.visualstudio.com/publishers/R3BL"
echo "  Open VSX:       https://open-vsx.org/namespace/R3BL"
