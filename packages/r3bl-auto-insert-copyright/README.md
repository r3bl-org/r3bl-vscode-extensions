# R3BL Auto Insert Copyright

Automatically add copyright and license headers to your source code files. Save time and maintain consistency by automating the process of adding copyright notices to new and existing files.

## Features

- **Automatic Insertion**: Copyright headers automatically added when you open new files
- **Multiple License Types**: Support for MIT, Apache 2.0, GPL 3.0, and custom licenses
- **Manual Command**: Add copyright headers to existing files on demand
- **Configurable**: Customize author name, license type, and additional notes
- **Multi-Language Support**: Works with 12+ programming languages
- **New Files Only Mode**: Optionally only add headers to brand new files
- **Smart Detection**: Automatically detects appropriate comment style for each language

## Screenshots

![Copyright Header Example](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-auto-insert-copyright/images/copyright-header-example.png)
*MIT License copyright header automatically inserted at the top of a TypeScript file*

![Prepend Copyright Command](https://raw.githubusercontent.com/r3bl-org/r3bl-vscode-extensions/main/packages/r3bl-auto-insert-copyright/images/prepend-copyright-command.png)
*Use the "Prepend Copyright" command to add headers to existing files*

## Requirements

- VS Code 1.60.0 or higher
- No external dependencies required

## Usage

### Automatic Mode (Default)

By default, copyright headers are automatically added when you create or open new files:

1. Create a new file (e.g., `mycode.ts`)
2. Start typing - the copyright header is automatically inserted at the top
3. Continue coding with the header already in place

### Manual Command

Add a copyright header to an existing file:

1. Open the file you want to add a header to
2. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. Type "Prepend Copyright"
4. Select "Prepend Copyright" command
5. Header is inserted at the top of the file

## Extension Settings

Configure the extension in your `.vscode/settings.json`:

```json
{
  "copyrighter.author": "Your name or Organization",
  "copyrighter.license": "MIT"
}
```

### Available Settings

#### `copyrighter.author`
**Type**: `string`
**Default**: `"Your Name"`
**Description**: The copyright holder name that appears in the header

```json
"copyrighter.author": "Your name or Organization"
```

#### `copyrighter.license`
**Type**: `string`
**Default**: `"MIT"`
**Options**: `"none"`, `"MIT"`, `"Apache2"`, `"Apache2OneLine"`, `"GPL3"`
**Description**: The license type to use for the copyright header

```json
"copyrighter.license": "MIT"
```

#### `copyrighter.note` (Optional)
**Type**: `string`
**Default**: `""`
**Description**: Additional note to include in the copyright header

```json
"copyrighter.note": "All rights reserved."
```

#### `copyrighter.newFilesOnly`
**Type**: `boolean`
**Default**: `true`
**Description**: Only inject copyright in new files (not existing files when opened)

```json
"copyrighter.newFilesOnly": true
```

## Supported Languages

The extension automatically detects the appropriate comment syntax for these languages:

| Language | File Extensions | Comment Style |
|----------|----------------|---------------|
| **C** | `.c`, `.h` | `//` or `/* */` |
| **C++** | `.cpp`, `.hpp`, `.cc` | `//` or `/* */` |
| **C#** | `.cs` | `//` |
| **CSS** | `.css` | `/* */` |
| **Go** | `.go` | `//` |
| **Java** | `.java` | `//` or `/* */` |
| **JavaScript** | `.js`, `.jsx` | `//` |
| **Objective-C** | `.m`, `.mm` | `//` or `/* */` |
| **Rust** | `.rs` | `//` |
| **SCSS** | `.scss` | `//` or `/* */` |
| **Swift** | `.swift` | `//` |
| **TypeScript** | `.ts`, `.tsx` | `//` |
| **Vue** | `.vue` | `<!-- -->` |

## License Templates

### MIT License

```typescript
// Copyright (c) 2025 Your name or Organization. All rights reserved. Licensed under MIT License.
```

### Apache 2.0 (One Line)

```typescript
// Copyright (c) 2025 Your name or Organization. All rights reserved. Licensed under Apache License 2.0.
```

### Apache 2.0 (Full)

```typescript
// Copyright (c) 2025 Your name or Organization
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
```

### GPL 3.0

```typescript
// Copyright (c) 2025 Your name or Organization
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
```

### None (Custom)

```typescript
// Copyright (c) 2025 Your name or Organization
```

## Commands

- `Prepend Copyright` - Manually add a copyright header to the current file

## Use Cases

### Open Source Projects
Automatically add open source license headers (MIT, Apache, GPL) to all your project files to ensure proper licensing.

### Commercial Software
Add proprietary copyright notices to protect your intellectual property.

### Multi-Developer Teams
Ensure consistent copyright headers across all team members' contributions.

### Compliance Requirements
Meet legal or organizational requirements for copyright notices in source code.

## Configuration Examples

### Personal Open Source Project

```json
{
  "copyrighter.author": "John Doe",
  "copyrighter.license": "MIT",
  "copyrighter.newFilesOnly": true
}
```

### Company Project

```json
{
  "copyrighter.author": "Acme Corporation",
  "copyrighter.license": "Apache2",
  "copyrighter.note": "Internal use only",
  "copyrighter.newFilesOnly": false
}
```

### Custom License

```json
{
  "copyrighter.author": "Your Company",
  "copyrighter.license": "none",
  "copyrighter.note": "Proprietary and confidential"
}
```

## How It Works

1. **File Detection**: When you open or create a file, the extension checks if it's a supported language
2. **Header Check**: Checks if a copyright header already exists
3. **Automatic Insertion**: If no header exists and it's a new file (or `newFilesOnly` is `false`), inserts the header
4. **Comment Style**: Automatically uses the correct comment syntax for the file type
5. **Template Fill**: Fills in the template with your configured author, year, license, and notes

## Known Issues

- Only works with text-based source code files
- Header detection is based on simple pattern matching
- Year is automatically set to current year

## Global R3BL Configuration

This extension uses global R3BL settings for feedback and notifications. You can customize how R3BL extensions display messages, including:

- Feedback mechanism (status bar, notifications, or none)
- Status bar message duration for each message type
- Message length and display settings

For detailed configuration options, see the [R3BL Extension Pack Configuration](../r3bl-extension-pack/README.md#configuration) section.

## Release Notes

See [CHANGELOG.md](../../CHANGELOG.md) for detailed release notes and version history.

## License

MIT

## Contributing

Found a bug or want to add support for a new language? Please open an issue at:
https://github.com/r3bl-org/r3bl-vscode-extensions/issues

---

**Code with confidence, license with ease!**
