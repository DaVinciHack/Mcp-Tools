# Precision Code Editor MCP Server

A custom MCP server for making targeted edits to code in Palantir Foundry and React applications without requiring complete rewrites.

## Overview

This tool solves a common problem when working with large codebases: the need to make small, precise changes without rewriting entire files. It's particularly useful for:

- Refactoring React components
- Updating TypeScript/JavaScript code
- Analyzing code structure
- Making surgical edits to specific sections of code

## Features

- **Targeted Code Editing**: Make precise changes to specific parts of your code
- **Code Analysis**: Analyze TypeScript, JavaScript, and React components
- **Smart Suggestions**: Get intelligent suggestions for code improvements
- **Diff Generation**: See character-level differences between changes
- **Automatic Backups**: Creates backups before making changes
- **Path Safety**: Validates file paths against allowed directories

## Installation as MCP Server

### Using with Claude

1. Clone this repository:
```
git clone https://github.com/DaVinciHack/Mcp-Tools.git
```

2. Install the MCP server with Claude:
```
npx @anthropic-ai/cli mcp install precision-code-editor
```

3. Claude can now use the server for code editing and analysis tasks

### Manual Installation

1. Clone this repository
2. Install dependencies:
```bash
cd precision-code-editor
npm install
```

3. Build the project:
```bash
npm run build
```

4. Start the server:
```bash
npm start
```

## Usage

The server provides several API endpoints that can be accessed directly or through the MCP interface:

### Read File

Reads a file and optionally analyzes its structure.

```json
{
  "filePath": "/path/to/file.ts",
  "analyze": true
}
```

### Write File

Writes content to a file, creating a backup of the original.

```json
{
  "filePath": "/path/to/file.ts",
  "content": "// New file content...",
  "createBackupFile": true
}
```

### Edit Code

Makes targeted edits to specific sections of code.

```json
{
  "filePath": "/path/to/file.ts",
  "oldString": "function oldName() {",
  "newString": "function newName() {",
  "expectedReplacements": 1,
  "createBackupFile": true,
  "formatCode": true
}
```

### Analyze Code

Analyzes code structure and provides suggestions.

```json
{
  "filePath": "/path/to/file.ts"
}
```

OR

```json
{
  "code": "const myFunc = () => { return 42; }",
  "type": "javascript"
}
```

## Configuration

The server uses a config file located at the project root (`config.json`). If not present, a default configuration will be created on first run.

You can modify the allowed directories, parser options, and editor preferences in this file.

## License

MIT

## Author

DaVinciHack

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.