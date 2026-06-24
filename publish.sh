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

# Function to get published version from Open VSX
get_openvsx_version() {
    local ext_name="$1"
    curl -s "https://open-vsx.org/api/R3BL/${ext_name}" 2>/dev/null | grep -o '"version":"[^"]*"' | head -1 | cut -d'"' -f4
}

# Function to check if version is newer than published
is_version_newer() {
    local local_ver="$1"
    local published_ver="$2"

    if [ -z "$published_ver" ]; then
        return 0  # No published version, so local is "newer"
    fi

    # Compare versions using sort -V
    local higher=$(echo -e "${local_ver}\n${published_ver}" | sort -V | tail -1)
    if [ "$higher" = "$local_ver" ] && [ "$local_ver" != "$published_ver" ]; then
        return 0  # Local is newer
    else
        return 1  # Local is same or older
    fi
}

# Show usage if no arguments or --help
if [ $# -eq 0 ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "📦 Publish R3BL Extensions to Marketplaces"
    echo "==========================================="
    echo ""
    echo "Usage: ./publish.sh <extension-name> [extension-name...]"
    echo ""
    echo "Publishes specified extensions to both VS Marketplace and Open VSX."
    echo ""
    echo "Requires environment variables:"
    echo "  VSCE_PAT  - VS Marketplace token (Azure DevOps)"
    echo "  OVSX_PAT  - Open VSX token"
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

# Pre-check: Verify all versions are newer than published
echo -e "${BLUE}Pre-checking versions against Open VSX...${NC}"
all_versions_ok=true
for ext in "$@"; do
    version="${EXT_VERSIONS[$ext]}"

    if [ -z "$version" ]; then
        echo -e "${RED}Error: Unknown extension '${ext}'${NC}"
        echo "Run ./publish.sh without arguments to see available extensions."
        exit 1
    fi

    published_ver=$(get_openvsx_version "$ext")

    if [ -n "$published_ver" ]; then
        if is_version_newer "$version" "$published_ver"; then
            echo -e "  ${GREEN}✓${NC} ${ext}: ${published_ver} → ${version} (will publish)"
        else
            echo -e "  ${YELLOW}⚠${NC} ${ext}: v${version} already published (current: ${published_ver})"
            echo -e "    ${YELLOW}→ If you just published, WAIT for verification. DON'T bump version!${NC}"
            all_versions_ok=false
        fi
    else
        echo -e "  ${GREEN}✓${NC} ${ext}: v${version} (new extension)"
    fi
done
echo ""

if [ "$all_versions_ok" = false ]; then
    echo -e "${YELLOW}Some versions already exist on the marketplace.${NC}"
    echo -e "${YELLOW}If you recently published, versions may be in verification queue.${NC}"
    echo -e "${YELLOW}Wait 5-10 minutes for verification before bumping versions.${NC}"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    echo ""
fi

# Publish each specified extension
for ext in "$@"; do
    version="${EXT_VERSIONS[$ext]}"
    vsix_path="packages/${ext}/${ext}-${version}.vsix"

    if [ ! -f "$vsix_path" ]; then
        echo -e "${RED}Error: VSIX not found: ${vsix_path}${NC}"
        echo "Run ./build.sh first to generate the VSIX file."
        exit 1
    fi

    echo -e "${BLUE}Publishing ${ext} v${version}...${NC}"

    # Publish to VS Marketplace
    echo -e "  ${BLUE}→ VS Marketplace${NC}"
    vsce_output=$(npx --yes vsce publish --packagePath "$vsix_path" -p "$VSCE_PAT" 2>&1) || true
    if echo "$vsce_output" | grep -q "already exists"; then
        echo -e "  ${YELLOW}⚠ Version already exists (may be in verification queue)${NC}"
    elif echo "$vsce_output" | grep -qE "(Successfully published|DONE.*Published)"; then
        echo -e "  ${GREEN}✓ Published to VS Marketplace${NC}"
    else
        echo -e "  ${RED}✗ Failed to publish to VS Marketplace${NC}"
        echo "    $vsce_output"
    fi

    # Publish to Open VSX
    echo -e "  ${BLUE}→ Open VSX${NC}"
    ovsx_output=$(npx --yes ovsx publish "$vsix_path" -p "$OVSX_PAT" 2>&1) || true
    if echo "$ovsx_output" | grep -q "already published"; then
        echo -e "  ${YELLOW}⚠ Version already exists (may be in verification queue)${NC}"
    elif echo "$ovsx_output" | grep -q "Published"; then
        echo -e "  ${GREEN}✓ Published to Open VSX${NC}"
    else
        echo -e "  ${RED}✗ Failed to publish to Open VSX${NC}"
        echo "    $ovsx_output"
    fi

    echo ""
done

echo -e "${GREEN}🎉 Done!${NC}"
echo ""
echo "Check your extensions at:"
echo "  VS Marketplace: https://marketplace.visualstudio.com/publishers/R3BL"
echo "  Open VSX:       https://open-vsx.org/namespace/R3BL"
echo ""
echo -e "${BLUE}Note: New versions may take 5-10 minutes to become visible.${NC}"
echo -e "${BLUE}If 'already exists' appeared, WAIT - don't bump versions!${NC}"
