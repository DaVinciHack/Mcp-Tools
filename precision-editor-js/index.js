/**
 * Precision Code Editor MCP Server (JavaScript Version)
 * 
 * A simplified MCP server for making targeted edits to code
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const prettier = require('prettier');

// Default configuration
const config = {
  allowedDirectories: [
    '/Users/duncanburbury/projects',
    '/Users/duncanburbury/mcp-servers'
  ],
  defaultShell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
  blockedCommands: [
    'rm -rf /',
    'deltree',
    'format',
    '> /dev/sda'
  ]
};

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

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

// API Routes
app.post('/api/readFile', async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter: filePath'
      });
      return;
    }
    
    // Read file content
    const fileContent = await safeReadFile(filePath);
    
    // Get file metadata
    const fileInfo = await fs.stat(filePath);
    
    // Prepare response
    const response = {
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
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/writeFile', async (req, res) => {
  try {
    const { filePath, content, createBackupFile = true } = req.body;
    
    if (!filePath) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter: filePath'
      });
      return;
    }
    
    if (content === undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter: content'
      });
      return;
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
    const response = {
      success: true,
      filePath,
      backupPath: backupPath || null,
      newFile: !fileExisted,
      changesCount: diff ? diff.changes : content.length,
      diff: diff ? diff.diff : null,
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error writing file:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/editCode', async (req, res) => {
  try {
    const { 
      filePath, 
      oldString, 
      newString, 
      createBackupFile = true,
      expectedReplacements = 1,
      formatCode = false
    } = req.body;
    
    if (!filePath || !oldString || newString === undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters: filePath, oldString, or newString'
      });
      return;
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
      
      res.status(400).json({
        success: false,
        error: 'No matches found for the specified old string',
        suggestion: closestMatch ? {
          diff: closestMatch.diff,
          changesCount: closestMatch.changes
        } : null
      });
      return;
    }
    
    if (replacementCount !== expectedReplacements) {
      res.status(400).json({
        success: false,
        error: `Found ${replacementCount} occurrences of the specified string, but expected ${expectedReplacements}`,
        actualReplacements: replacementCount
      });
      return;
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
    const response = {
      success: true,
      filePath,
      backupPath: backupPath || null,
      replacementCount,
      changesCount: diff.changes,
      diff: diff.diff,
      formatted: formatCode
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error editing code:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    version: '1.0.0',
    config
  });
});

// MCP Server handler function
async function handler(req, res) {
  return new Promise((resolve, reject) => {
    app(req, res, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(undefined);
      }
    });
  });
}

// If run directly (not as MCP server)
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  
  // Start the server
  app.listen(PORT, () => {
    console.log(`Precision Code Editor MCP Server running on port ${PORT}`);
    console.log(`Configuration loaded: ${config.allowedDirectories.length} directories allowed`);
  });
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: shutting down server');
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('SIGINT signal received: shutting down server');
    process.exit(0);
  });
}

module.exports = { handler };