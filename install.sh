#!/bin/bash

set -e

# Show help
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: ./install.sh"
    echo ""
    echo "Install all built R3BL extensions to local VSCode editors."
    echo ""
    echo "Installs to all detected editors:"
    echo "  • code (VSCode)"
    echo "  • code-insiders (VSCode Insiders)"
    echo "  • codium (VSCodium)"
    echo "  • codium-insiders (VSCodium Insiders)"
    echo "  • antigravity-ide (Antigravity IDE)"
    echo ""
    echo "Run ./build.sh first to generate .vsix artifacts."
    exit 0
fi

echo "🚀 Installing R3BL Extension Pack..."
echo "======================================"

# Source shared script library
source ./script_lib.sh

# Check requirements
check_requirements

# Get all extension versions
get_all_versions

# Supported CLI editors
EDITORS=(
    "code:VSCode"
    "code-insiders:VSCode Insiders"
    "codium:VSCodium"
    "codium-insiders:VSCodium Insiders"
    "antigravity-ide:Antigravity IDE"
)

# Helper function to install extension to all available CLI editors
install_extension() {
    local vsix_path="$1"
    for entry in "${EDITORS[@]}"; do
        local cmd="${entry%%:*}"
        if command -v "$cmd" &> /dev/null; then
            "$cmd" --install-extension "$vsix_path" --force
        fi
    done
}

# Helper function to purge untrusted extensions from all available editors
purge_untrusted_extension() {
    local ext_id="$1"
    echo -e "${YELLOW}Purging untrusted extension ${ext_id}...${NC}"
    for entry in "${EDITORS[@]}"; do
        local cmd="${entry%%:*}"
        if command -v "$cmd" &> /dev/null; then
            "$cmd" --uninstall-extension "$ext_id" 2>/dev/null || true
        fi
    done
    # Wipe leftover directories from local extension directories
    rm -rf "$HOME/.vscode/extensions/${ext_id}"* 2>/dev/null || true
    rm -rf "$HOME/.vscode-insiders/extensions/${ext_id}"* 2>/dev/null || true
    rm -rf "$HOME/.vscode-oss/extensions/${ext_id}"* 2>/dev/null || true
    rm -rf "$HOME/.vscode-oss-insiders/extensions/${ext_id}"* 2>/dev/null || true
    rm -rf "$HOME/.vscodium-insiders/extensions/${ext_id}"* 2>/dev/null || true
    rm -rf "$HOME/.antigravity-ide/extensions/${ext_id}"* 2>/dev/null || true
}

# Purge untrusted third-party extension
purge_untrusted_extension "nicholashsiang.vscode-opened-editors"

# Install all individual extensions first (required for extension pack to work)
echo ""
echo -e "${BLUE}Installing individual extensions...${NC}"

# Install R3BL Shared (infrastructure - must be first since other extensions depend on it)
install_extension "packages/r3bl-shared/r3bl-shared-${SHARED_VERSION}.vsix"

# Install R3BL Theme
install_extension "packages/r3bl-theme/r3bl-theme-${THEME_VERSION}.vsix"

# Install R3BL Auto Insert Copyright
install_extension "packages/r3bl-auto-insert-copyright/r3bl-auto-insert-copyright-${COPYRIGHT_VERSION}.vsix"

# Install R3BL Semantic Configuration
install_extension "packages/r3bl-semantic-config/r3bl-semantic-config-${SEMANTIC_VERSION}.vsix"

# Install R3BL Task Management
install_extension "packages/r3bl-task-management/r3bl-task-management-${TASK_MANAGEMENT_VERSION}.vsix"

# Install R3BL Copy Selection Path and Range
install_extension "packages/r3bl-copy-selection-path-and-range/r3bl-copy-selection-path-and-range-${COPY_SELECTION_VERSION}.vsix"

# Install R3BL Fuzzy Search
install_extension "packages/r3bl-fuzzy-search/r3bl-fuzzy-search-${FUZZY_SEARCH_VERSION}.vsix"

# Install R3BL Opened Editors
install_extension "packages/r3bl-opened-editors/r3bl-opened-editors-${OPENED_EDITORS_VERSION}.vsix"

# Install the extension pack
echo ""
echo -e "${BLUE}Installing R3BL Extension Pack...${NC}"

EXTENSION_PACK_VSIX="packages/r3bl-extension-pack/r3bl-extension-pack-${EXTENSION_PACK_VERSION}.vsix"
for entry in "${EDITORS[@]}"; do
    cmd="${entry%%:*}"
    name="${entry#*:}"
    if command -v "$cmd" &> /dev/null; then
        echo -e "${BLUE}Installing R3BL Extension Pack for ${name}...${NC}"
        if "$cmd" --install-extension "$EXTENSION_PACK_VSIX" --force; then
            echo -e "${GREEN}✓ R3BL Extension Pack installed successfully for ${name}!${NC}"
        else
            echo -e "${RED}✗ Failed to install R3BL Extension Pack for ${name}${NC}"
        fi
    else
        echo -e "${YELLOW}${name} not found, skipping installation for ${name}${NC}"
    fi
done

echo ""
echo -e "${GREEN}🎉 Installation complete!${NC}"
echo ""
echo -e "${BLUE}The R3BL Extension Pack includes:${NC}"
echo "  • R3BL Shared - Shared utilities and centralized services (infrastructure)"
echo "  • R3BL Theme - Custom dark theme optimized for Rust and Markdown"
echo "  • R3BL Auto Insert Copyright - Automatic copyright header insertion"
echo "  • R3BL Semantic Configuration - Enhanced Rust syntax highlighting"
echo "  • R3BL Task Management - Manage task spaces and organize open tabs"
echo "  • R3BL Copy Selection Path and Range - Copy file paths with line ranges"
echo "  • R3BL Fuzzy Search - Fuzzy search in files using fzf"
echo "  • rust-analyzer - Official Rust language server"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Restart VSCode/Insiders/Codium/Antigravity IDE"
echo "2. Select 'R3BL Theme' from Color Theme picker (Ctrl+K Ctrl+T)"
echo "3. Configure copyright settings in VSCode preferences if needed"
echo ""
echo -e "${GREEN}Enjoy your R3BL development experience!${NC}"
