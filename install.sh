#!/bin/bash

set -e

echo "🚀 Installing R3BL VSCode Extensions..."
echo "======================================"

# Colors for output
RED='\033[1;31m'
GREEN='\033[1;32m'
BLUE='\033[1;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if vsce is installed
if ! command -v vsce &> /dev/null; then
    echo -e "${RED}Error: vsce is not installed. Please install it with: npm install -g @vscode/vsce${NC}"
    exit 1
fi

# Install dependencies for the monorepo
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

# Function to build and install an extension
install_extension() {
    local package_dir="$1"
    local extension_name="$2"
    local vsix_file="$3"
    
    echo ""
    echo -e "${BLUE}Building ${extension_name}...${NC}"
    cd "packages/${package_dir}"
    
    # Build the extension if it has a build script
    if grep -q '"compile"' package.json 2>/dev/null; then
        echo -e "${BLUE}Compiling ${extension_name}...${NC}"
        npm run compile
    fi
    
    # Package the extension
    echo -e "${BLUE}Packaging ${extension_name}...${NC}"
    vsce package --no-dependencies
    
    # Check if VSIX file was created
    if [ ! -f "$vsix_file" ]; then
        echo -e "${RED}Error: Failed to create $vsix_file${NC}"
        cd ../..
        return 1
    fi
    
    echo -e "${GREEN}✓ VSIX file created: $vsix_file${NC}"
    
    # Install for regular VSCode
    if command -v code &> /dev/null; then
        echo -e "${BLUE}Installing ${extension_name} for VSCode...${NC}"
        if code --install-extension "$vsix_file"; then
            echo -e "${GREEN}✓ ${extension_name} installed successfully for VSCode!${NC}"
        else
            echo -e "${RED}✗ Failed to install ${extension_name} for VSCode${NC}"
        fi
    else
        echo -e "${YELLOW}VSCode not found, skipping installation for VSCode${NC}"
    fi
    
    # Install for VSCode Insiders
    if command -v code-insiders &> /dev/null; then
        echo -e "${BLUE}Installing ${extension_name} for VSCode Insiders...${NC}"
        if code-insiders --install-extension "$vsix_file"; then
            echo -e "${GREEN}✓ ${extension_name} installed successfully for VSCode Insiders!${NC}"
        else
            echo -e "${RED}✗ Failed to install ${extension_name} for VSCode Insiders${NC}"
        fi
    else
        echo -e "${YELLOW}VSCode Insiders not found, skipping installation for VSCode Insiders${NC}"
    fi
    
    cd ../..
}

# Install R3BL Theme
install_extension "r3bl-theme" "R3BL Theme" "r3bl-theme-1.0.0.vsix"

# Install R3BL Auto Insert Copyright
install_extension "r3bl-auto-insert-copyright" "R3BL Auto Insert Copyright" "r3bl-auto-insert-copyright-1.0.0.vsix"

echo ""
echo -e "${GREEN}🎉 Installation complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Restart VSCode/Insiders"
echo "2. For R3BL Theme: Select 'R3BL Theme' from Color Theme picker (Ctrl+K Ctrl+T)"
echo "3. For R3BL Auto Insert Copyright: Configure settings in VSCode preferences"
echo ""
echo -e "${GREEN}All R3BL extensions are now installed and ready to use!${NC}"