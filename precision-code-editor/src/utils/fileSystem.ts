/**
 * File System Utilities
 * 
 * Provides helper functions for file system operations with safety checks
 */

import fs from 'fs-extra';
import path from 'path';
import { isPathAllowed } from '../config';

/**
 * Safely read a file with path validation
 */
export async function safeReadFile(filePath: string): Promise<string> {
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
export async function safeWriteFile(filePath: string, content: string): Promise<void> {
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
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file metadata
 */
export async function getFileInfo(filePath: string): Promise<fs.Stats> {
  const normalizedPath = path.normalize(filePath);
  
  if (!isPathAllowed(normalizedPath)) {
    throw new Error(`Access denied: ${normalizedPath} is not in allowed directories`);
  }
  
  try {
    return await fs.stat(normalizedPath);
  } catch (err) {
    throw new Error(`Failed to get file info for ${normalizedPath}: ${err.message}`);
  }
}

/**
 * List files in a directory
 */
export async function listDirectory(dirPath: string): Promise<string[]> {
  const normalizedPath = path.normalize(dirPath);
  
  if (!isPathAllowed(normalizedPath)) {
    throw new Error(`Access denied: ${normalizedPath} is not in allowed directories`);
  }
  
  try {
    return await fs.readdir(normalizedPath);
  } catch (err) {
    throw new Error(`Failed to list directory ${normalizedPath}: ${err.message}`);
  }
}

/**
 * Create backup of a file before making changes
 */
export async function createBackup(filePath: string): Promise<string> {
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

export default {
  safeReadFile,
  safeWriteFile,
  fileExists,
  getFileInfo,
  listDirectory,
  createBackup
};