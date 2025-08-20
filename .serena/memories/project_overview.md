# R3BL VSCode Extensions - Project Overview

## Purpose
A monorepo containing VSCode extensions for R3BL development:
- R3BL Theme: Custom dark theme optimized for Rust and Markdown
- R3BL Auto Insert Copyright: Automatic copyright header insertion 
- R3BL Semantic Configuration: Enhanced Rust syntax highlighting
- R3BL Extension Pack: Meta-extension that installs all above extensions

## Tech Stack
- TypeScript for extensions with logic (auto-insert-copyright, semantic-config)
- VSCode Extension API
- Node.js >= 18.0.0, npm >= 8.0.0
- vsce for packaging extensions

## Repository Structure
```
packages/
├── r3bl-extension-pack/        # Meta extension pack
├── r3bl-theme/                 # Theme extension (JSON-based)
├── r3bl-auto-insert-copyright/ # Copyright insertion (TypeScript)
└── r3bl-semantic-config/       # Semantic highlighting (TypeScript)
```

## Key Features
- The semantic config extension detects R3BL theme and offers enhanced highlighting
- Automatic copyright insertion for new files
- Zero manual configuration required when using extension pack