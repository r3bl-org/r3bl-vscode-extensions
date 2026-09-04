#!/bin/bash

set -e

# Source shared script library
source ./script_lib.sh

# All available extensions in build order
ALL_EXTENSIONS=(
    "r3bl-shared"
    "r3bl-theme"
    "r3bl-auto-insert-copyright"
    "r3bl-semantic-config"
    "r3bl-task-management"
    "r3bl-copy-selection-path-and-range"
    "r3bl-fuzzy-search"
    "r3bl-opened-editors"
    "r3bl-extension-pack"
)

# Show help
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: ./build.sh [extension-name...]"
    echo ""
    echo "Build all or specific R3BL VSCode extensions and generate .vsix artifacts."
    echo ""
    echo "Arguments:"
    echo "  [extension-name...]  Optional. Names of specific extensions to build."
    echo "                       If omitted, all extensions are built."
    echo ""
    echo "Available extensions:"
    for ext in "${ALL_EXTENSIONS[@]}"; do
        echo "  • $ext"
    done
    echo ""
    echo "Examples:"
    echo "  ./build.sh                                          # Build all extensions"
    echo "  ./build.sh r3bl-semantic-config                     # Build only semantic config"
    echo "  ./build.sh r3bl-semantic-config r3bl-extension-pack # Build semantic config & extension pack"
    echo ""
    echo "After building, run ./install.sh to install locally."
    exit 0
fi

echo "🔨 Building R3BL VSCode Extensions..."
echo "======================================"

# Check requirements
check_requirements

# Get all extension versions
get_all_versions

declare -A EXT_VERSIONS=(
    ["r3bl-shared"]="${SHARED_VERSION}"
    ["r3bl-theme"]="${THEME_VERSION}"
    ["r3bl-auto-insert-copyright"]="${COPYRIGHT_VERSION}"
    ["r3bl-semantic-config"]="${SEMANTIC_VERSION}"
    ["r3bl-task-management"]="${TASK_MANAGEMENT_VERSION}"
    ["r3bl-copy-selection-path-and-range"]="${COPY_SELECTION_VERSION}"
    ["r3bl-fuzzy-search"]="${FUZZY_SEARCH_VERSION}"
    ["r3bl-opened-editors"]="${OPENED_EDITORS_VERSION}"
    ["r3bl-extension-pack"]="${EXTENSION_PACK_VERSION}"
)

# Determine target extensions to build
TARGET_EXTENSIONS=()
BUILD_ALL=false

if [ $# -eq 0 ]; then
    BUILD_ALL=true
    TARGET_EXTENSIONS=("${ALL_EXTENSIONS[@]}")
else
    for arg in "$@"; do
        if [ -z "${EXT_VERSIONS[$arg]}" ]; then
            echo -e "${RED}Error: Unknown extension '${arg}'${NC}"
            echo "Run ./build.sh --help to see available extensions."
            exit 1
        fi
        TARGET_EXTENSIONS+=("$arg")
    done
fi

# Function to build a single extension
build_extension() {
    local ext="$1"
    local ver="${EXT_VERSIONS[$ext]}"

    case "$ext" in
        r3bl-shared)
            echo -e "${BLUE}Building R3BL Shared...${NC}"
            cd packages/r3bl-shared
            [ ! -d "node_modules" ] && npm install
            npm run build
            npx --no vsce package --no-dependencies --skip-license
            cleanup_old_versions "r3bl-shared" "$ver" "."
            cd ../..
            ;;
        r3bl-theme)
            echo -e "${BLUE}Building R3BL Theme...${NC}"
            cd packages/r3bl-theme
            npx --no vsce package --no-dependencies --skip-license
            cleanup_old_versions "r3bl-theme" "$ver" "."
            cd ../..
            ;;
        r3bl-auto-insert-copyright)
            echo -e "${BLUE}Building R3BL Auto Insert Copyright...${NC}"
            cd packages/r3bl-auto-insert-copyright
            [ ! -d "node_modules" ] && npm install
            npm run compile
            npx --no vsce package --no-dependencies --skip-license
            cleanup_old_versions "r3bl-auto-insert-copyright" "$ver" "."
            cd ../..
            ;;
        r3bl-semantic-config)
            echo -e "${BLUE}Building R3BL Semantic Configuration...${NC}"
            cd packages/r3bl-semantic-config
            [ ! -d "node_modules" ] && npm install
            npm run compile
            npm test
            npx --no vsce package --no-dependencies --skip-license
            cleanup_old_versions "r3bl-semantic-config" "$ver" "."
            cd ../..
            ;;
        r3bl-task-management)
            echo -e "${BLUE}Building R3BL Task Management...${NC}"
            cd packages/r3bl-task-management
            [ ! -d "node_modules" ] && npm install
            npm run compile
            npx --no vsce package --no-dependencies --skip-license
            cleanup_old_versions "r3bl-task-management" "$ver" "."
            cd ../..
            ;;
        r3bl-copy-selection-path-and-range)
            echo -e "${BLUE}Building R3BL Copy Selection Path and Range...${NC}"
            cd packages/r3bl-copy-selection-path-and-range
            [ ! -d "node_modules" ] && npm install
            npm run build
            npx --no vsce package --no-dependencies --skip-license
            cleanup_old_versions "r3bl-copy-selection-path-and-range" "$ver" "."
            cd ../..
            ;;
        r3bl-fuzzy-search)
            echo -e "${BLUE}Building R3BL Fuzzy Search...${NC}"
            cd packages/r3bl-fuzzy-search
            [ ! -d "node_modules" ] && npm install
            npm run compile
            npm test
            npx --no vsce package --no-dependencies --skip-license
            cleanup_old_versions "r3bl-fuzzy-search" "$ver" "."
            cd ../..
            ;;
        r3bl-opened-editors)
            echo -e "${BLUE}Building R3BL Opened Editors...${NC}"
            cd packages/r3bl-opened-editors
            [ ! -d "node_modules" ] && npm install
            npm run compile
            npm test
            npx --no vsce package --no-dependencies --skip-license
            cleanup_old_versions "r3bl-opened-editors" "$ver" "."
            cd ../..
            ;;
        r3bl-extension-pack)
            echo -e "${BLUE}Building R3BL Extension Pack...${NC}"
            cd packages/r3bl-extension-pack
            npx --no vsce package --no-dependencies --skip-license
            cleanup_old_versions "r3bl-extension-pack" "$ver" "."
            if [ ! -f "r3bl-extension-pack-${ver}.vsix" ]; then
                echo -e "${RED}Error: Failed to create r3bl-extension-pack-${ver}.vsix${NC}"
                exit 1
            fi
            cd ../..
            ;;
    esac
}

# Pre-build formatting and dependencies
if [ "$BUILD_ALL" = true ]; then
    echo -e "${BLUE}Formatting code with Prettier...${NC}"
    npm run format

    echo -e "${BLUE}Installing dependencies...${NC}"
    npm install
else
    echo -e "${BLUE}Formatting target extension code with Prettier...${NC}"
    for ext in "${TARGET_EXTENSIONS[@]}"; do
        npx prettier --write "packages/${ext}/**/*.{ts,js,json,md}" 2>/dev/null || true
    done
fi

# Build target extensions
echo ""
echo -e "${BLUE}Building target extension(s)...${NC}"
for ext in "${TARGET_EXTENSIONS[@]}"; do
    build_extension "$ext"
done

# Print final results
if [ "$BUILD_ALL" = true ]; then
    print_built_extensions
else
    echo ""
    echo -e "${GREEN}🎉 Specified extension(s) built successfully!${NC}"
    echo ""
    echo -e "${BLUE}Built extensions:${NC}"
    for ext in "${TARGET_EXTENSIONS[@]}"; do
        ver="${EXT_VERSIONS[$ext]}"
        echo "  • packages/${ext}/${ext}-${ver}.vsix"
    done
    echo ""
    echo -e "${BLUE}To install the extensions, run: ./install.sh${NC}"
fi
