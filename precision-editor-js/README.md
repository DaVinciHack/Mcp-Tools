# Precision Editor JS

A simplified MCP server for making targeted edits to code in Palantir Foundry and React applications without rewriting entire files.

## Features

- **Read Files**: Safely read files with path validation
- **Write Files**: Write content to files with automatic backups
- **Edit Code**: Make targeted edits to specific sections of code
- **Format Code**: Automatically format code using Prettier
- **Path Safety**: Validates file paths against allowed directories

## Installation

1. Install the MCP server:
```bash
npm i -g @anthropic-ai/cli
npx @anthropic-ai/cli mcp install /Users/duncanburbury/mcp-servers/Mcp-Tools/precision-editor-js
```

2. Restart Claude or any MCP-compatible application to detect the new tool

## Usage

Once installed, you can use the Precision Editor JS through Claude or other MCP-compatible assistants. Here are some example prompts:

### Reading a File

```
Claude, please use the precision-editor-js to read this file: /path/to/file.js
```

### Writing a File

```
Claude, please use the precision-editor-js to write this content to /path/to/file.js:

const greeting = "Hello, world!";
console.log(greeting);
```

### Editing Code

```
Claude, please use the precision-editor-js to replace "function calculateDistance()" with "function computeDistance()" in /path/to/file.js
```

### Complex Edits

```
Claude, please use the precision-editor-js to make the following edit:

File: /path/to/component.jsx
Old code: 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

New code:
  const [state, setState] = useState({
    isLoading: false,
    error: null
  });
```

## Allowed Directories

By default, the server allows access to these directories:
- `/Users/duncanburbury/projects`
- `/Users/duncanburbury/mcp-servers`
- `/Users/duncanburbury/Fast-Planner-Clean`

## Why Use Precision Editing?

Making targeted edits instead of rewriting entire files provides several benefits:

1. **Reduced Risk**: Only changes what needs to be changed, minimizing the risk of introducing bugs
2. **Better Diffs**: Generates cleaner diffs for code reviews
3. **Preserves Context**: Maintains surrounding code and comments
4. **Automatic Backups**: Creates backups before making changes
5. **Works with Large Files**: Efficiently handles large files by only modifying necessary parts

## License

MIT

## Author

DaVinciHack