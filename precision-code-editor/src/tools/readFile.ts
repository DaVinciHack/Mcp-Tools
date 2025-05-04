/**
 * ReadFile Tool
 * 
 * Provides functionality to safely read files with path validation
 * and returns enhanced file information
 */

import { Request, Response } from 'express';
import path from 'path';
import { safeReadFile, getFileInfo } from '../utils/fileSystem';
import { analyzeTypeScript } from '../utils/parsers/typescript';
import { analyzeJavaScript } from '../utils/parsers/javascript';
import { analyzeReactComponent, isReactComponent } from '../utils/parsers/react';

/**
 * Handle file reading requests
 */
export async function readFileHandler(req: Request, res: Response): Promise<void> {
  try {
    const { filePath, analyze = false } = req.body;
    
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
    const fileInfo = await getFileInfo(filePath);
    
    // Prepare response
    const response: FileResponse = {
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
    
    // Analyze file if requested
    if (analyze) {
      response.analysis = await analyzeFile(filePath, fileContent);
    }
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Analyze file content based on file type
 */
async function analyzeFile(filePath: string, content: string): Promise<FileAnalysis | null> {
  const extension = path.extname(filePath).toLowerCase();
  
  try {
    // Check for React component first (regardless of extension)
    if (isReactComponent(content)) {
      return {
        type: 'react',
        data: analyzeReactComponent(content)
      };
    }
    
    // Then check by extension
    switch (extension) {
      case '.ts':
      case '.tsx':
        return {
          type: 'typescript',
          data: analyzeTypeScript(content)
        };
        
      case '.js':
      case '.jsx':
        return {
          type: 'javascript',
          data: analyzeJavaScript(content)
        };
        
      case '.json':
        return {
          type: 'json',
          data: JSON.parse(content)
        };
        
      default:
        return null;
    }
  } catch (error) {
    console.error(`Error analyzing file: ${filePath}`, error);
    return {
      type: 'error',
      data: {
        message: error.message
      }
    };
  }
}

// Interfaces
export interface FileResponse {
  success: boolean;
  filePath: string;
  content: string;
  info: {
    size: number;
    modified: string;
    created: string;
    extension: string;
  };
  analysis?: FileAnalysis | null;
}

export interface FileAnalysis {
  type: 'typescript' | 'javascript' | 'react' | 'json' | 'error';
  data: any;
}

export default {
  readFileHandler
};