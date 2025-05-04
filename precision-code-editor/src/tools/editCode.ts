/**
 * EditCode Tool
 * 
 * Provides functionality for making targeted edits to code files
 * without requiring complete rewrites
 */

import { Request, Response } from 'express';
import { safeReadFile, safeWriteFile, createBackup } from '../utils/fileSystem';
import { characterDiff } from '../utils/diff';
import * as prettier from 'prettier';

/**
 * Handle code editing requests
 */
export async function editCodeHandler(req: Request, res: Response): Promise<void> {
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
    const response: EditCodeResponse = {
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
}

/**
 * Escape regex special characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get prettier parser based on file extension
 */
function getParserForExtension(extension: string): string | null {
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
function findClosestMatch(content: string, searchString: string): { diff: string, changes: number } | null {
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
function calculateSimilarity(a: string, b: string): number {
  let matches = 0;
  const length = Math.min(a.length, b.length);
  
  for (let i = 0; i < length; i++) {
    if (a[i] === b[i]) {
      matches++;
    }
  }
  
  return matches / Math.max(a.length, b.length);
}

// Interfaces
export interface EditCodeResponse {
  success: boolean;
  filePath: string;
  backupPath: string | null;
  replacementCount: number;
  changesCount: number;
  diff: string;
  formatted: boolean;
}

export default {
  editCodeHandler
};