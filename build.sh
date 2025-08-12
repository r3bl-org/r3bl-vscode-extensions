#!/bin/bash

set -e

echo "🔨 Building R3BL VSCode Extensions..."
echo "======================================"

# Source shared script library
source ./script_lib.sh

# Check requirements
check_requirements

# Get all extension versions
get_all_versions

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

# Get extension pack version before building
CURRENT_EXTENSION_PACK_VERSION=$(node -p "require('./package.json').version")

vsce package --no-dependencies

# Check if VSIX file was created
if [ ! -f "r3bl-extension-pack-${CURRENT_EXTENSION_PACK_VERSION}.vsix" ]; then
    echo -e "${RED}Error: Failed to create r3bl-extension-pack-${CURRENT_EXTENSION_PACK_VERSION}.vsix${NC}"
    exit 1
fi

cd ../..

# Print final results
print_built_extensions