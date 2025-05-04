/**
 * WriteFile Tool
 * 
 * Provides functionality to safely write files with path validation
 * and automatic backup creation
 */

import { Request, Response } from 'express';
import path from 'path';
import { safeReadFile, safeWriteFile, createBackup, fileExists } from '../utils/fileSystem';
import { characterDiff } from '../utils/diff';

/**
 * Handle file writing requests
 */
export async function writeFileHandler(req: Request, res: Response): Promise<void> {
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
    const response: WriteFileResponse = {
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
}

// Interfaces
export interface WriteFileResponse {
  success: boolean;
  filePath: string;
  backupPath: string | null;
  newFile: boolean;
  changesCount: number;
  diff: string | null;
}

export default {
  writeFileHandler
};