# R3BL VSCode Extensions

A monorepo containing all R3BL VSCode extensions.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Extensions](#extensions)
  - [R3BL Extension Pack (Recommended)](#r3bl-extension-pack-recommended)
  - [Individual Extensions](#individual-extensions)
    - [R3BL Theme](#r3bl-theme)
    - [R3BL Auto Insert Copyright](#r3bl-auto-insert-copyright)
    - [R3BL Semantic Configuration](#r3bl-semantic-configuration)
- [Installation](#installation)
  - [Quick Start (Recommended)](#quick-start-recommended)
  - [Using Prebuilt Extensions](#using-prebuilt-extensions)
  - [Using Prebuilt Extensions](#using-prebuilt-extensions-1)
  - [Build and Install](#build-and-install)
  - [Manual Installation](#manual-installation)
- [Usage](#usage)
  - [Getting Started](#getting-started)
- [Development](#development)
  - [Setup](#setup)
  - [Building](#building)
  - [Packaging](#packaging)
  - [For Maintainers](#for-maintainers)
  - [Testing](#testing)
  - [Linting](#linting)
- [Structure](#structure)
- [Publishing](#publishing)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Extensions

### R3BL Extension Pack (Recommended)

<img src="packages/r3bl-theme/r3bl-cube-logo.png" width="128" alt="R3BL Extension Pack Icon" />

**The complete R3BL development experience in one package!** This extension pack includes:

- **R3BL Theme** - Custom dark theme optimized for Rust and Markdown
- **R3BL Auto Insert Copyright** - Automatic copyright header insertion
- **R3BL Semantic Configuration** - Enhanced Rust syntax highlighting (automatic)
- **rust-analyzer** - Official Rust language server

**What you get:**

- ✅ Beautiful, carefully crafted dark theme
- ✅ Automatic copyright headers for new files
- ✅ Enhanced semantic highlighting for Rust (applied automatically)
- ✅ Full Rust language support via rust-analyzer
- ✅ Zero manual configuration required

### Individual Extensions

If you prefer to install extensions individually:

#### R3BL Theme

A custom VSCode theme designed for Rust and Markdown with R3BL styling. Features a
carefully crafted dark theme optimized for code readability and visual appeal.

**Usage:**

- Go to `File > Preferences > Color Theme` (or `Ctrl+K Ctrl+T`)
- Select "R3BL Theme" from the list

#### R3BL Auto Insert Copyright

Automatically includes copyright and license headers in your source code files. This
extension saves time and cognitive energy by automating the process of adding copyright
notices to new files.

**Features:**

- Automatically adds copyright notices to new files upon opening
- Supports multiple license types (MIT, Apache 2.0, GPL 3.0, or custom)
- Manual command available: `Prepend Copyright`
- Configurable for specific file types
- Works right out of the box with sensible defaults

**Supported Languages:** C, C++, C#, CSS, Go, Java, JavaScript, Objective-C, Rust, SCSS,
Swift, TypeScript, TypeScript React, Vue

**Configuration:**

- `copyrighter.author`: Set the copyright holder name
- `copyrighter.license`: Choose license type (none, Apache2, MIT, GPL3)
- `copyrighter.note`: Optional additional note
- `copyrighter.newFilesOnly`: Only inject copyright in new files

Example VSCode settings:

```json
{
  "copyrighter.author": "Your Name",
  "copyrighter.license": "MIT"
}
```

#### R3BL Semantic Configuration

Automatically applies enhanced semantic highlighting settings for Rust development. This
extension:

- Detects when R3BL Theme is active
- Offers to apply semantic highlighting automatically
- Provides commands to enable/disable enhanced highlighting
- Works seamlessly with rust-analyzer

## Installation

### Quick Start (Recommended)

**Install the complete R3BL development experience with one extension:**

1. **Install the R3BL Extension Pack:**

   ```bash
   # For VSCode users
   code --install-extension r3bl-extension-pack-1.0.0.vsix

   # For VSCode Insiders users
   code-insiders --install-extension r3bl-extension-pack-1.0.0.vsix
   ```

2. **Restart VSCode** and you're ready to go!
   - R3BL Theme will be available in your color themes
   - Copyright insertion will work automatically
   - Enhanced Rust semantic highlighting will be offered when you select the R3BL Theme
   - rust-analyzer will provide full Rust language support

### Using Prebuilt Extensions

### Using Prebuilt Extensions

If you prefer to install individual extensions using prebuilt .vsix files:

1. **Clone the repository:**

   ```bash
   git clone https://github.com/r3bl-org/r3bl-vscode-extensions.git
   cd r3bl-vscode-extensions
   ```

2. **Install specific extensions:**

   ```bash
   # For VSCode users
   # Install R3BL Theme
   code --install-extension r3bl-theme-1.0.0.vsix
   # Install R3BL Auto Insert Copyright
   code --install-extension r3bl-auto-insert-copyright-1.0.0.vsix
   # Install R3BL Semantic Configuration
   code --install-extension r3bl-semantic-config-1.0.0.vsix

   # For VSCode Insiders users
   # Install R3BL Theme
   code-insiders --install-extension r3bl-theme-1.0.0.vsix
   # Install R3BL Auto Insert Copyright
   code-insiders --install-extension r3bl-auto-insert-copyright-1.0.0.vsix
   # Install R3BL Semantic Configuration
   code-insiders --install-extension r3bl-semantic-config-1.0.0.vsix
   ```

3. **Install rust-analyzer separately:**

   ```bash
   code --install-extension rust-lang.rust-analyzer
   ```

4. **Restart VSCode** and enjoy your new extensions!

### Build and Install

If you want to build the extensions from source:

1. **Clone the repository:**

   ```bash
   git clone https://github.com/r3bl-org/r3bl-vscode-extensions.git
   cd r3bl-vscode-extensions
   ```

2. **Choose your approach:**

   **Option A: Build and Install (Recommended)**
   ```bash
   ./install.sh
   ```
   This script will:
   - Build all extensions (.vsix files)
   - Install individual extensions to VSCode/Insiders
   - Install the extension pack

   **Option B: Build Only**
   ```bash
   ./build.sh
   ```
   This script will:
   - Build all extensions (.vsix files) without installing
   - Useful for CI/CD or creating distribution packages

3. **Restart VSCode** and enjoy your new extensions!

### Manual Installation

If you prefer to install manually or need to install specific extensions:

1. **Prerequisites:**

   ```bash
   # Install vsce globally if not already installed
   npm install -g @vscode/vsce
   ```

2. **Clone and setup:**

   ```bash
   git clone https://github.com/r3bl-org/r3bl-vscode-extensions.git
   cd r3bl-vscode-extensions
   npm install
   ```

3. **Build and install specific extensions:**

   ```bash
   # For R3BL Theme
   cd packages/r3bl-theme
   vsce package --no-dependencies
   code --install-extension r3bl-theme-1.0.0.vsix

   # For R3BL Auto Insert Copyright
   cd ../r3bl-auto-insert-copyright
   npm run compile
   vsce package --no-dependencies
   code --install-extension r3bl-auto-insert-copyright-1.0.0.vsix

   # For R3BL Semantic Configuration
   cd ../r3bl-semantic-config
   npm run compile
   vsce package --no-dependencies
   code --install-extension r3bl-semantic-config-1.0.0.vsix

   # For R3BL Extension Pack
   cd ../r3bl-extension-pack
   vsce package --no-dependencies
   code --install-extension r3bl-extension-pack-1.0.0.vsix
   ```

## Usage

### Getting Started

1. **Install the R3BL Extension Pack** (recommended) or individual extensions
2. **Select the R3BL Theme:**
   - Go to `File > Preferences > Color Theme` (or `Ctrl+K Ctrl+T`)
   - Select "R3BL Theme" from the list
3. **Enable Enhanced Semantic Highlighting:**
   - When you select the R3BL Theme, the semantic configuration extension will offer to
     apply enhanced highlighting
   - Click "Yes" to automatically configure semantic tokens for Rust
   - Or use the command palette: `R3BL: Enable Semantic Highlighting`

That's it! No manual configuration needed - everything is handled automatically.

## Development

### Setup

```bash
npm install
```

### Building

```bash
# Build all extensions (.vsix files)
./build.sh

# Or build specific extensions manually:
npm run build:theme
npm run build:copyright
npm run build:semantic-config
```

### Packaging

```bash
# Package all extensions (same as build.sh)
./build.sh

# Or package specific extensions:
npm run package:theme
npm run package:copyright
npm run package:semantic-config
npm run package:extension-pack
```

### For Maintainers

**⚠️ Important:** After making changes to any extension, always run:

```bash
./build.sh
```

This ensures all .vsix files in the repository are up-to-date with your changes. The build script:
- Compiles TypeScript extensions (r3bl-auto-insert-copyright, r3bl-semantic-config)
- Packages all individual extensions
- Builds the extension pack
- Updates all .vsix files in their respective directories

This is crucial for:
- Keeping distributed .vsix files current
- Ensuring the install.sh script works with latest code
- Maintaining consistency across the monorepo

### Testing

```bash
npm run test
```

### Linting

```bash
npm run lint
```

## Structure

```
packages/
├── r3bl-extension-pack/        # Extension pack (installs all R3BL extensions)
├── r3bl-theme/                 # Theme extension
├── r3bl-auto-insert-copyright/ # Copyright insertion extension
└── r3bl-semantic-config/       # Semantic highlighting configuration
```

Each extension maintains its own package.json and can be developed independently while
sharing common tooling and configuration.

## Publishing

Each extension can be published individually to the VSCode marketplace using their
respective package.json configurations.

## License

MIT - See individual extension LICENSE files for details.
