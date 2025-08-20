# Task Completion Requirements

After making any code changes:

1. **Run linting:** `npm run lint`
2. **Run tests:** `npm run test` 
3. **Build extensions:** `./build.sh` (critical - updates .vsix files)

## Why build.sh is critical
- Compiles TypeScript extensions
- Packages all individual extensions
- Builds the extension pack
- Updates all .vsix files for distribution
- Ensures install.sh works with latest code