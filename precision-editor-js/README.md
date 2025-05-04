# Precision Editor JS

A simplified JavaScript MCP server for making targeted edits to code in Palantir Foundry and React applications.

## Features

- **Read Files**: Safely read files with path validation
- **Write Files**: Write content to files with automatic backups
- **Edit Code**: Make targeted edits to specific sections of code
- **Format Code**: Automatically format code using Prettier
- **Path Safety**: Validates file paths against allowed directories

## Installation

1. Clone this repository
2. Install dependencies:
```bash
cd precision-editor-js
npm install
```

3. Start the server:
```bash
npm start
```

## API Endpoints

### Read File

```
POST /api/readFile
```

Request body:
```json
{
  "filePath": "/path/to/file.ts"
}
```

### Write File

```
POST /api/writeFile
```

Request body:
```json
{
  "filePath": "/path/to/file.ts",
  "content": "// New file content...",
  "createBackupFile": true
}
```

### Edit Code

```
POST /api/editCode
```

Request body:
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

## Configuration

By default, the server allows access to these directories:
- `/Users/duncanburbury/projects`
- `/Users/duncanburbury/mcp-servers`

You can modify these in the `config` object at the top of `index.js`.

## Usage with Claude

Once installed, Claude can use this server to make targeted edits to your code. Examples:

- "Read this file and tell me about its structure"
- "Make a targeted edit to replace all instances of function X with function Y"
- "Write this content to a new file"

## License

MIT

## Author

DaVinciHack