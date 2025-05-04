#!/bin/bash

# Precision Code Editor MCP Server Installation Script for Claude

echo "Installing Precision Code Editor MCP Server for Claude..."

# Check if npx is installed
if ! command -v npx &> /dev/null; then
  echo "Error: npx is not installed. Please install Node.js and npm first."
  exit 1
fi

# Install dependencies
npm install

# Build the project
npm run build

echo "Building MCP server..."

# Install the MCP server
npx @anthropic-ai/cli mcp install /Users/duncanburbury/mcp-servers/precision-code-editor

echo "Installation complete!"
echo "The Precision Code Editor MCP server is now available to Claude."
echo "You can start using it by asking Claude to make targeted code edits."
