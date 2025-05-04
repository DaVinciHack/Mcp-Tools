# Mcp-Tools

A collection of custom MCP servers for enhancing developer productivity with Palantir Foundry and flight planning applications.

## Available Tools

### [Precision Code Editor](./precision-code-editor)

A custom MCP server for making targeted edits to code in Palantir Foundry and React applications without requiring complete rewrites.

**Features:**
- Make targeted edits to specific sections of code
- Analyze TypeScript, JavaScript, and React components
- Get intelligent suggestions for code improvements
- Generate diffs and create automatic backups

## Installation

Each tool can be installed as an MCP server for use with Claude or other MCP-compatible assistants.

To install a specific tool, navigate to its directory and follow the installation instructions in its README.

## Usage with Claude

Once installed, Claude can access the tools to help with development tasks. For example:

```
Claude, please analyze this React component and suggest improvements.
```

```
Claude, please make a targeted edit to this code by replacing the function name 'calculateRoute' with 'computeFlightPath'.
```

## Coming Soon

More specialized MCP tools for flight planning and Palantir Foundry development will be added to this collection.

## License

MIT

## Author

DaVinciHack