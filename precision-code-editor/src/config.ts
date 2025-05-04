/**
 * Configuration module for the Precision Code Editor
 * 
 * This module handles loading and managing configuration settings
 * including allowed directories, blocked commands, and parser options
 */

import fs from 'fs';
import path from 'path';

// Configuration interface
export interface Config {
  allowedDirectories: string[];
  defaultShell: string;
  blockedCommands: string[];
  parserOptions: {
    typescript: {
      strictNullChecks: boolean;
      target: string;
    };
    javascript: {
      ecmaVersion: number;
    };
    react: {
      jsx: boolean;
    };
  };
  editorOptions: {
    tabSize: number;
    insertSpaces: boolean;
    defaultFormatter: string;
  };
}

// Default configuration
export const configData: Config = {
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
  ],
  parserOptions: {
    typescript: {
      strictNullChecks: true,
      target: 'ES2020',
    },
    javascript: {
      ecmaVersion: 2020,
    },
    react: {
      jsx: true,
    },
  },
  editorOptions: {
    tabSize: 2,
    insertSpaces: true,
    defaultFormatter: 'prettier',
  }
};

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

/**
 * Load configuration from file or create default if not exists
 */
export function loadConfig(): void {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const fileData = fs.readFileSync(CONFIG_PATH, 'utf8');
      const loadedConfig = JSON.parse(fileData);
      
      // Merge with default config to ensure all fields exist
      Object.assign(configData, loadedConfig);
      console.log('Configuration loaded from file');
    } else {
      // Create default config file
      saveConfig();
      console.log('Default configuration created');
    }
  } catch (error) {
    console.error('Error loading configuration:', error);
    console.log('Using default configuration');
  }
}

/**
 * Save current configuration to file
 */
export function saveConfig(): void {
  try {
    fs.writeFileSync(
      CONFIG_PATH,
      JSON.stringify(configData, null, 2),
      'utf8'
    );
    console.log('Configuration saved to file');
  } catch (error) {
    console.error('Error saving configuration:', error);
  }
}

/**
 * Update a specific configuration value
 */
export function updateConfig<K extends keyof Config>(
  key: K,
  value: Config[K]
): void {
  configData[key] = value;
  saveConfig();
}

/**
 * Check if a path is within allowed directories
 */
export function isPathAllowed(checkPath: string): boolean {
  return configData.allowedDirectories.some(dir => 
    checkPath.startsWith(dir)
  );
}

/**
 * Add a directory to allowed directories
 */
export function addAllowedDirectory(directory: string): void {
  if (!configData.allowedDirectories.includes(directory)) {
    configData.allowedDirectories.push(directory);
    saveConfig();
  }
}

export default {
  configData,
  loadConfig,
  saveConfig,
  updateConfig,
  isPathAllowed,
  addAllowedDirectory
};