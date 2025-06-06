/**
 * Precision Code Editor MCP Server
 * 
 * A simplified MCP server for making targeted edits to code without rewriting entire files
 */

const fs = require('fs-extra');
const path = require('path');
const prettier = require('prettier');

// Default configuration
const config = {
  allowedDirectories: [
    '/Users/duncanburbury/projects',
    '/Users/duncanburbury/mcp-servers',
    '/Users/duncanburbury/Fast-Planner-Clean'
  ],
  blockedCommands: [
    'rm -rf /',
    'deltree',
    'format',
    '> /dev/sda'
  ]
};

/**
 * Function to check if a path is within allowed directories
 */
function isPathAllowed(checkPath) {
  return config.allowedDirectories.some(dir => 
    checkPath.startsWith(dir)
  );
}

/**
 * Safely read a file with path validation
 */
async function safeReadFile(filePath) {
  const normalizedPath = path.normalize(filePath);
  
  if (!isPathAllowed(normalizedPath)) {
    throw new Error(`Access denied: ${normalizedPath} is not in allowed directories`);
  }
  
  try {
    return await fs.readFile(normalizedPath, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read file ${normalizedPath}: ${err.message}`);
  }
}

/**
 * Safely write to a file with path validation
 */
async function safeWriteFile(filePath, content) {
  const normalizedPath = path.normalize(filePath);
  
  if (!isPathAllowed(normalizedPath)) {
    throw new Error(`Access denied: ${normalizedPath} is not in allowed directories`);
  }
  
  try {
    const dirPath = path.dirname(normalizedPath);
    await fs.ensureDir(dirPath);
    await fs.writeFile(normalizedPath, content, 'utf8');
  } catch (err) {
    throw new Error(`Failed to write to file ${normalizedPath}: ${err.message}`);
  }
}

/**
 * Create backup of a file before making changes
 */
async function createBackup(filePath) {
  const normalizedPath = path.normalize(filePath);
  
  if (!isPathAllowed(normalizedPath)) {
    throw new Error(`Access denied: ${normalizedPath} is not in allowed directories`);
  }
  
  try {
    const backupPath = `${normalizedPath}.backup-${Date.now()}`;
    await fs.copy(normalizedPath, backupPath);
    return backupPath;
  } catch (err) {
    throw new Error(`Failed to create backup of ${normalizedPath}: ${err.message}`);
  }
}

/**
 * Check if a file exists
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate character-level differences between two strings
 */
function characterDiff(oldText, newText) {
  let i = 0;
  const maxLen = Math.min(oldText.length, newText.length);
  
  // Find common prefix
  while (i < maxLen && oldText[i] === newText[i]) {
    i++;
  }
  
  const commonPrefix = oldText.substring(0, i);
  
  // Find common suffix
  let j = 0;
  while (
    j < maxLen - i &&
    oldText[oldText.length - 1 - j] === newText[newText.length - 1 - j]
  ) {
    j++;
  }
  
  const commonSuffix = oldText.substring(oldText.length - j);
  
  const oldDiff = oldText.substring(i, oldText.length - j);
  const newDiff = newText.substring(i, newText.length - j);
  
  // Format the diff
  const formattedDiff = `${commonPrefix}{-${oldDiff}-}{+${newDiff}+}${commonSuffix}`;
  
  return {
    diff: formattedDiff,
    changes: Math.max(oldDiff.length, newDiff.length)
  };
}

/**
 * Escape regex special characters in a string
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get prettier parser based on file extension
 */
function getParserForExtension(extension) {
  switch (extension.toLowerCase()) {
    case 'js':
      return 'babel';
    case 'jsx':
      return 'babel';
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'typescript';
    case 'json':
      return 'json';
    case 'css':
      return 'css';
    case 'scss':
      return 'scss';
    case 'html':
      return 'html';
    case 'md':
      return 'markdown';
    case 'yml':
    case 'yaml':
      return 'yaml';
    default:
      return null;
  }
}

/**
 * Find the closest match to the given string in the content
 */
function findClosestMatch(content, searchString) {
  // Simple implementation - find a substring that's similar
  // We'll look for parts of the search string that are at least 50% of its length
  const minLength = Math.floor(searchString.length * 0.5);
  
  for (let i = 0; i < content.length - minLength; i++) {
    const testString = content.substr(i, searchString.length);
    const similarity = calculateSimilarity(testString, searchString);
    
    if (similarity > 0.7) { // 70% similar
      return characterDiff(testString, searchString);
    }
  }
  
  return null;
}

/**
 * Calculate similarity between two strings (0-1)
 */
function calculateSimilarity(a, b) {
  let matches = 0;
  const length = Math.min(a.length, b.length);
  
  for (let i = 0; i < length; i++) {
    if (a[i] === b[i]) {
      matches++;
    }
  }
  
  return matches / Math.max(a.length, b.length);
}

/**
 * Read a file implementation
 */
async function readFile(filePath) {
  console.error(`Reading file: ${filePath}`);
  
  if (!filePath) {
    throw new Error('Missing required parameter: filePath');
  }
  
  // Read file content
  const fileContent = await safeReadFile(filePath);
  
  // Get file metadata
  const fileInfo = await fs.stat(filePath);
  
  // Prepare response
  return {
    success: true,
    filePath,
    content: fileContent,
    info: {
      size: fileInfo.size,
      modified: fileInfo.mtime.toISOString(),
      created: fileInfo.birthtime.toISOString(),
      extension: path.extname(filePath).toLowerCase()
    }
  };
}

/**
 * Write to a file implementation
 */
async function writeFile(filePath, content, createBackupFile = true) {
  console.error(`Writing to file: ${filePath}`);
  
  if (!filePath) {
    throw new Error('Missing required parameter: filePath');
  }
  
  if (content === undefined) {
    throw new Error('Missing required parameter: content');
  }
  
  let originalContent = '';
  let backupPath = '';
  let fileExisted = false;
  
  // Check if file exists
  fileExisted = await fileExists(filePath);
  
  // If file exists, create backup
  if (fileExisted && createBackupFile) {
    try {
      originalContent = await safeReadFile(filePath);
      backupPath = await createBackup(filePath);
    } catch (backupError) {
      console.error('Error creating backup:', backupError);
      // Continue without backup
    }
  }
  
  // Write file content
  await safeWriteFile(filePath, content);
  
  // Calculate diff if original content exists
  let diff = null;
  if (fileExisted && originalContent) {
    diff = characterDiff(originalContent, content);
  }
  
  // Prepare response
  return {
    success: true,
    filePath,
    backupPath: backupPath || null,
    newFile: !fileExisted,
    changesCount: diff ? diff.changes : content.length,
    diff: diff ? diff.diff : null,
  };
}

/**
 * Edit code implementation
 */
async function editCode(filePath, oldString, newString, createBackupFile = true, expectedReplacements = 1, formatCode = false) {
  console.error(`Editing code in file: ${filePath}`);
  
  if (!filePath || !oldString || newString === undefined) {
    throw new Error('Missing required parameters: filePath, oldString, or newString');
  }
  
  // Read original file content
  let fileContent = await safeReadFile(filePath);
  const originalContent = fileContent;
  
  // Create backup if requested
  let backupPath = '';
  if (createBackupFile) {
    try {
      backupPath = await createBackup(filePath);
    } catch (backupError) {
      console.error('Error creating backup:', backupError);
      // Continue without backup
    }
  }
  
  // Perform the replacement
  const replacementCount = (fileContent.match(new RegExp(escapeRegExp(oldString), 'g')) || []).length;
  
  if (replacementCount === 0) {
    // No matches found - try to find closest match for better error message
    const closestMatch = findClosestMatch(fileContent, oldString);
    
    throw new Error(JSON.stringify({
      error: 'No matches found for the specified old string',
      suggestion: closestMatch ? {
        diff: closestMatch.diff,
        changesCount: closestMatch.changes
      } : null
    }));
  }
  
  if (replacementCount !== expectedReplacements) {
    throw new Error(JSON.stringify({
      error: `Found ${replacementCount} occurrences of the specified string, but expected ${expectedReplacements}`,
      actualReplacements: replacementCount
    }));
  }
  
  // Perform the replacement
  fileContent = fileContent.replace(new RegExp(escapeRegExp(oldString), 'g'), newString);
  
  // Format code if requested
  if (formatCode) {
    try {
      const extension = filePath.split('.').pop() || '';
      const parser = getParserForExtension(extension);
      
      if (parser) {
        fileContent = await prettier.format(fileContent, {
          parser,
          singleQuote: true,
          tabWidth: 2,
          trailingComma: 'es5'
        });
      }
    } catch (formatError) {
      console.error('Error formatting code:', formatError);
      // Continue without formatting
    }
  }
  
  // Write updated content back to file
  await safeWriteFile(filePath, fileContent);
  
  // Calculate diff
  const diff = characterDiff(oldString, newString);
  
  // Prepare response
  return {
    success: true,
    filePath,
    backupPath: backupPath || null,
    replacementCount,
    changesCount: diff.changes,
    diff: diff.diff,
    formatted: formatCode
  };
}

/**
 * Get status implementation
 */
function getStatus() {
  return {
    status: 'running',
    version: '1.0.0',
    config
  };
}

// Main MCP handler
module.exports = async function(options) {
  console.error("MCP Server started with options:", JSON.stringify(options, null, 2));
  
  // Initialize the server (for MCP protocol)
  const initialized = { capabilities: {} };
  
  // Set up the message handler
  options.onMessage(async (message) => {
    console.error("Received message:", JSON.stringify(message, null, 2));
    
    try {
      // Handle JSON-RPC messages
      if (message.jsonrpc === "2.0") {
        // Handle initialization request
        if (message.method === "initialize") {
          console.error("Handling initialize request");
          return {
            jsonrpc: "2.0",
            id: message.id,
            result: initialized
          };
        }
        
        // Handle function call request
        if (message.method === "mcp/execute") {
          const { name, parameters } = message.params;
          console.error(`Executing function: ${name} with parameters:`, JSON.stringify(parameters, null, 2));
          
          let result;
          
          try {
            switch (name) {
              case 'readFile':
                result = await readFile(parameters.filePath);
                break;
                
              case 'writeFile':
                result = await writeFile(
                  parameters.filePath,
                  parameters.content,
                  parameters.createBackupFile
                );
                break;
                
              case 'editCode':
                result = await editCode(
                  parameters.filePath,
                  parameters.oldString,
                  parameters.newString,
                  parameters.createBackupFile,
                  parameters.expectedReplacements,
                  parameters.formatCode
                );
                break;
                
              case 'status':
                result = getStatus();
                break;
                
              default:
                throw new Error(`Unknown function: ${name}`);
            }
            
            console.error(`Function ${name} executed successfully with result:`, JSON.stringify(result, null, 2));
            
            return {
              jsonrpc: "2.0",
              id: message.id,
              result
            };
          } catch (error) {
            console.error(`Error executing function ${name}:`, error);
            
            return {
              jsonrpc: "2.0",
              id: message.id,
              error: {
                code: -32000,
                message: error.message || "Unknown error"
              }
            };
          }
        }
      }
      
      // Handle any other message types
      console.error("Unhandled message type:", message);
      
      return {
        jsonrpc: "2.0",
        id: message.id || null,
        error: {
          code: -32601,
          message: "Method not supported"
        }
      };
    } catch (error) {
      console.error("Error handling message:", error);
      
      return {
        jsonrpc: "2.0",
        id: message.id || null,
        error: {
          code: -32603,
          message: "Internal error"
        }
      };
    }
  });
  
  // Set up shutdown handler
  options.onShutdown(() => {
    console.error("MCP Server shutting down");
  });
  
  console.error("MCP Server initialization complete");
  
  // Export functions for testing
  return {
    readFile,
    writeFile,
    editCode,
    getStatus
  };
};