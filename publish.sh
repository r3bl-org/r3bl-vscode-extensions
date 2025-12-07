#!/bin/bash

set -e

echo "📦 Publishing R3BL Extensions to Marketplaces..."
echo "================================================="

# Source shared script library
source ./script_lib.sh

# Check requirements
check_requirements

# Get all extension versions
get_all_versions

# Check for required tokens
if [ -z "$VSCE_PAT" ]; then
    echo -e "${RED}Error: VSCE_PAT environment variable not set${NC}"
    echo "Set it with: export VSCE_PAT='your-vs-marketplace-token'"
    exit 1
fi

if [ -z "$OVSX_PAT" ]; then
    echo -e "${RED}Error: OVSX_PAT environment variable not set${NC}"
    echo "Set it with: export OVSX_PAT='your-open-vsx-token'"
    exit 1
fi

# Define extensions in dependency order
EXTENSIONS=(
    "r3bl-shared:${SHARED_VERSION}"
    "r3bl-semantic-config:${SEMANTIC_VERSION}"
    "r3bl-theme:${THEME_VERSION}"
    "r3bl-auto-insert-copyright:${COPYRIGHT_VERSION}"
    "r3bl-copy-selection-path-and-range:${COPY_SELECTION_VERSION}"
    "r3bl-fuzzy-search:${FUZZY_SEARCH_VERSION}"
    "r3bl-task-management:${TASK_MANAGEMENT_VERSION}"
    "r3bl-extension-pack:${EXTENSION_PACK_VERSION}"
)

echo ""
echo -e "${BLUE}Publishing to Visual Studio Marketplace...${NC}"
echo "--------------------------------------------"

for entry in "${EXTENSIONS[@]}"; do
    ext="${entry%%:*}"
    version="${entry##*:}"
    vsix_path="packages/${ext}/${ext}-${version}.vsix"

    if [ -f "$vsix_path" ]; then
        echo -e "${BLUE}Publishing ${ext} v${version} to VS Marketplace...${NC}"
        if npx vsce publish --packagePath "$vsix_path" -p "$VSCE_PAT"; then
            echo -e "${GREEN}✓ ${ext} published to VS Marketplace${NC}"
        else
            echo -e "${RED}✗ Failed to publish ${ext} to VS Marketplace${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ VSIX not found: ${vsix_path}${NC}"
    fi
done

echo ""
echo -e "${BLUE}Publishing to Open VSX Registry...${NC}"
echo "-----------------------------------"

for entry in "${EXTENSIONS[@]}"; do
    ext="${entry%%:*}"
    version="${entry##*:}"
    vsix_path="packages/${ext}/${ext}-${version}.vsix"

    if [ -f "$vsix_path" ]; then
        echo -e "${BLUE}Publishing ${ext} v${version} to Open VSX...${NC}"
        if npx ovsx publish "$vsix_path" -p "$OVSX_PAT"; then
            echo -e "${GREEN}✓ ${ext} published to Open VSX${NC}"
        else
            echo -e "${RED}✗ Failed to publish ${ext} to Open VSX${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ VSIX not found: ${vsix_path}${NC}"
    fi
done

echo ""
echo -e "${GREEN}🎉 Publishing complete!${NC}"
echo ""
echo "Check your extensions at:"
echo "  VS Marketplace: https://marketplace.visualstudio.com/publishers/R3BL"
echo "  Open VSX:       https://open-vsx.org/namespace/R3BL"
