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

# Helper function to install extension to all available editors
install_extension() {
    local vsix_path="$1"
    if command -v code &> /dev/null; then
        code --install-extension "$vsix_path" --force
    fi
    if command -v code-insiders &> /dev/null; then
        code-insiders --install-extension "$vsix_path" --force
    fi
    if command -v codium &> /dev/null; then
        codium --install-extension "$vsix_path" --force
    fi
    if command -v codium-insiders &> /dev/null; then
        codium-insiders --install-extension "$vsix_path" --force
    fi
    if command -v antigravity-ide &> /dev/null; then
        antigravity-ide --install-extension "$vsix_path" --force
    fi
}

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

# Install the extension pack
echo ""
echo -e "${BLUE}Installing R3BL Extension Pack...${NC}"

# Install for regular VSCode
if command -v code &> /dev/null; then
    echo -e "${BLUE}Installing R3BL Extension Pack for VSCode...${NC}"
    if code --install-extension packages/r3bl-extension-pack/r3bl-extension-pack-${EXTENSION_PACK_VERSION}.vsix --force; then
        echo -e "${GREEN}✓ R3BL Extension Pack installed successfully for VSCode!${NC}"
    else
        echo -e "${RED}✗ Failed to install R3BL Extension Pack for VSCode${NC}"
    fi
else
    echo -e "${YELLOW}VSCode not found, skipping installation for VSCode${NC}"
fi

# Install for VSCode Insiders
if command -v code-insiders &> /dev/null; then
    echo -e "${BLUE}Installing R3BL Extension Pack for VSCode Insiders...${NC}"
    if code-insiders --install-extension packages/r3bl-extension-pack/r3bl-extension-pack-${EXTENSION_PACK_VERSION}.vsix --force; then
        echo -e "${GREEN}✓ R3BL Extension Pack installed successfully for VSCode Insiders!${NC}"
    else
        echo -e "${RED}✗ Failed to install R3BL Extension Pack for VSCode Insiders${NC}"
    fi
else
    echo -e "${YELLOW}VSCode Insiders not found, skipping installation for VSCode Insiders${NC}"
fi

# Install for VSCodium
if command -v codium &> /dev/null; then
    echo -e "${BLUE}Installing R3BL Extension Pack for VSCodium...${NC}"
    if codium --install-extension packages/r3bl-extension-pack/r3bl-extension-pack-${EXTENSION_PACK_VERSION}.vsix --force; then
        echo -e "${GREEN}✓ R3BL Extension Pack installed successfully for VSCodium!${NC}"
    else
        echo -e "${RED}✗ Failed to install R3BL Extension Pack for VSCodium${NC}"
    fi
else
    echo -e "${YELLOW}VSCodium not found, skipping installation for VSCodium${NC}"
fi

# Install for VSCodium Insiders
if command -v codium-insiders &> /dev/null; then
    echo -e "${BLUE}Installing R3BL Extension Pack for VSCodium Insiders...${NC}"
    if codium-insiders --install-extension packages/r3bl-extension-pack/r3bl-extension-pack-${EXTENSION_PACK_VERSION}.vsix --force; then
        echo -e "${GREEN}✓ R3BL Extension Pack installed successfully for VSCodium Insiders!${NC}"
    else
        echo -e "${RED}✗ Failed to install R3BL Extension Pack for VSCodium Insiders${NC}"
    fi
else
    echo -e "${YELLOW}VSCodium Insiders not found, skipping installation for VSCodium Insiders${NC}"
fi

# Install for Antigravity IDE
if command -v antigravity-ide &> /dev/null; then
    echo -e "${BLUE}Installing R3BL Extension Pack for Antigravity IDE...${NC}"
    if antigravity-ide --install-extension packages/r3bl-extension-pack/r3bl-extension-pack-${EXTENSION_PACK_VERSION}.vsix --force; then
        echo -e "${GREEN}✓ R3BL Extension Pack installed successfully for Antigravity IDE!${NC}"
    else
        echo -e "${RED}✗ Failed to install R3BL Extension Pack for Antigravity IDE${NC}"
    fi
else
    echo -e "${YELLOW}Antigravity IDE not found, skipping installation for Antigravity IDE${NC}"
fi

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
