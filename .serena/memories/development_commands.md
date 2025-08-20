# Development Commands

## Setup
```bash
npm install
```

## Building
```bash
# Build all extensions
./build.sh

# Build specific extensions
npm run build:theme
npm run build:copyright
npm run build:semantic-config
```

## Packaging
```bash
# Package all extensions
./build.sh

# Package specific extensions
npm run package:theme
npm run package:copyright
npm run package:semantic-config
npm run package:extension-pack
```

## Quality Assurance
```bash
# Testing
npm run test

# Linting
npm run lint
```

## Installation
```bash
# Build and install all extensions
./install.sh
```

## Important for Maintainers
Always run `./build.sh` after making changes to keep .vsix files up-to-date.