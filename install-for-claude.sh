#!/bin/bash

# MCP Tools Installation Script for Claude

echo "Installing MCP Tools for Claude..."

# Check if npx is installed
if ! command -v npx &> /dev/null; then
  echo "Error: npx is not installed. Please install Node.js and npm first."
  exit 1
fi

# Choose which tool to install
echo "Available tools:"
echo "1. Precision Code Editor"
echo ""
read -p "Which tool would you like to install? (1): " tool_choice

case $tool_choice in
  "" | "1")
    tool_dir="precision-code-editor"
    tool_name="Precision Code Editor"
    ;;
  *)
    echo "Invalid choice. Exiting."
    exit 1
    ;;
esac

echo "Installing $tool_name..."

# Navigate to the tool directory
cd "$tool_dir"

# Install dependencies
npm install

# Build the project
npm run build

echo "Building MCP server..."

# Install the MCP server with Claude
npx @anthropic-ai/cli mcp install "$(pwd)"

echo "Installation complete!"
echo "The $tool_name MCP server is now available to Claude."
echo "You can start using it immediately in your conversation with Claude."
