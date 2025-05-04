#!/bin/bash

# Precision Code Editor MCP Server Installation Script

echo "Installing Precision Code Editor MCP Server..."

# Install dependencies
npm install

# Build the project
npm run build

echo "Creating sample configuration..."

# Create config directory if it doesn't exist
mkdir -p config

# Create default config if it doesn't exist
if [ ! -f "config.json" ]; then
  cat > config.json << EOF
{
  "allowedDirectories": [
    "/Users/duncanburbury/projects",
    "/Users/duncanburbury/mcp-servers"
  ],
  "defaultShell": "/bin/bash",
  "blockedCommands": [
    "rm -rf /",
    "deltree",
    "format",
    "> /dev/sda"
  ],
  "parserOptions": {
    "typescript": {
      "strictNullChecks": true,
      "target": "ES2020"
    },
    "javascript": {
      "ecmaVersion": 2020
    },
    "react": {
      "jsx": true
    }
  },
  "editorOptions": {
    "tabSize": 2,
    "insertSpaces": true,
    "defaultFormatter": "prettier"
  }
}
EOF
  echo "Created default config.json"
else
  echo "Config.json already exists, skipping..."
fi

echo "Installation complete!"
echo "Start the server with: npm start"
