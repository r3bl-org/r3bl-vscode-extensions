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
cleanup_old_versions "r3bl-theme" "$THEME_VERSION" "."
cd ../..

# Build R3BL Auto Insert Copyright
echo -e "${BLUE}Building R3BL Auto Insert Copyright...${NC}"
cd packages/r3bl-auto-insert-copyright
npm install
npm run compile
vsce package --no-dependencies
cleanup_old_versions "r3bl-auto-insert-copyright" "$COPYRIGHT_VERSION" "."
cd ../..

# Build R3BL Semantic Configuration
echo -e "${BLUE}Building R3BL Semantic Configuration...${NC}"
cd packages/r3bl-semantic-config
npm install
npm run compile
vsce package --no-dependencies
cleanup_old_versions "r3bl-semantic-config" "$SEMANTIC_VERSION" "."
cd ../..

# Build R3BL Task Management
echo -e "${BLUE}Building R3BL Task Management...${NC}"
cd packages/r3bl-task-management
npm install
npm run compile
vsce package --no-dependencies
cleanup_old_versions "r3bl-task-management" "$TASK_MANAGEMENT_VERSION" "."
cd ../..

# Build R3BL Copy Selection Path and Range
echo -e "${BLUE}Building R3BL Copy Selection Path and Range...${NC}"
cd packages/r3bl-copy-selection-path-and-range
npm install
npm run build
vsce package --no-dependencies
cleanup_old_versions "r3bl-copy-selection-path-and-range" "$COPY_SELECTION_VERSION" "."
cd ../..

# Build R3BL Fuzzy Search
echo -e "${BLUE}Building R3BL Fuzzy Search...${NC}"
cd packages/r3bl-fuzzy-search
npm install
npm run compile
vsce package --no-dependencies
cleanup_old_versions "r3bl-fuzzy-search" "$FUZZY_SEARCH_VERSION" "."
cd ../..

# Build the extension pack
echo ""
echo -e "${BLUE}Building R3BL Extension Pack...${NC}"
cd packages/r3bl-extension-pack

vsce package --no-dependencies

# Clean up old versions of the extension pack
cleanup_old_versions "r3bl-extension-pack" "$EXTENSION_PACK_VERSION" "."

# Check if VSIX file was created
if [ ! -f "r3bl-extension-pack-${EXTENSION_PACK_VERSION}.vsix" ]; then
    echo -e "${RED}Error: Failed to create r3bl-extension-pack-${EXTENSION_PACK_VERSION}.vsix${NC}"
    exit 1
fi

cd ../..

# Print final results
print_built_extensions
