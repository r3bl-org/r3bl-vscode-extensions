#!/bin/bash

set -e

echo "🔨 Building R3BL VSCode Extensions..."
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

# Build and package all individual extensions
echo ""
echo -e "${BLUE}Building individual extensions...${NC}"

# Build R3BL Theme
echo -e "${BLUE}Building R3BL Theme...${NC}"
cd packages/r3bl-theme
vsce package --no-dependencies
cd ../..

# Build R3BL Auto Insert Copyright
echo -e "${BLUE}Building R3BL Auto Insert Copyright...${NC}"
cd packages/r3bl-auto-insert-copyright
npm install
npm run compile
vsce package --no-dependencies
cd ../..

# Build R3BL Semantic Configuration
echo -e "${BLUE}Building R3BL Semantic Configuration...${NC}"
cd packages/r3bl-semantic-config
npm install
npm run compile
vsce package --no-dependencies
cd ../..

# Build the extension pack
echo ""
echo -e "${BLUE}Building R3BL Extension Pack...${NC}"
cd packages/r3bl-extension-pack
vsce package --no-dependencies

# Check if VSIX file was created
if [ ! -f "r3bl-extension-pack-1.0.0.vsix" ]; then
    echo -e "${RED}Error: Failed to create r3bl-extension-pack-1.0.0.vsix${NC}"
    exit 1
fi

cd ../..

echo ""
echo -e "${GREEN}🎉 All extensions built successfully!${NC}"
echo ""
echo -e "${BLUE}Built extensions:${NC}"
echo "  • packages/r3bl-theme/r3bl-theme-1.0.0.vsix"
echo "  • packages/r3bl-auto-insert-copyright/r3bl-auto-insert-copyright-1.1.0.vsix"
echo "  • packages/r3bl-semantic-config/r3bl-semantic-config-1.0.0.vsix"
echo "  • packages/r3bl-extension-pack/r3bl-extension-pack-1.0.0.vsix"
echo ""
echo -e "${BLUE}To install the extensions, run: ./install.sh${NC}"