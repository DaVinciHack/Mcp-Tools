/**
 * Analyze Code Tool
 * 
 * Provides functionality for analyzing code structure and dependencies
 */

import { Request, Response } from 'express';
import path from 'path';
import { safeReadFile } from '../utils/fileSystem';
import { analyzeTypeScript } from '../utils/parsers/typescript';
import { analyzeJavaScript } from '../utils/parsers/javascript';
import { analyzeReactComponent, isReactComponent } from '../utils/parsers/react';

/**
 * Handle code analysis requests
 */
export async function analyzeCodeHandler(req: Request, res: Response): Promise<void> {
  try {
    const { filePath, code, type } = req.body;
    
    if (!code && !filePath) {
      res.status(400).json({
        success: false,
        error: 'Either filePath or code must be provided'
      });
      return;
    }
    
    // Get code content - either from request or by reading file
    let codeContent = code;
    if (!codeContent && filePath) {
      codeContent = await safeReadFile(filePath);
    }
    
    // Determine code type if not specified
    let codeType = type;
    if (!codeType && filePath) {
      const extension = path.extname(filePath).toLowerCase();
      codeType = getCodeTypeFromExtension(extension);
    }
    
    // Auto-detect React
    const isReact = isReactComponent(codeContent);
    if (isReact) {
      codeType = 'react';
    }
    
    // Fallback to JavaScript if type still unknown
    if (!codeType) {
      codeType = 'javascript';
    }
    
    // Analyze based on code type
    let analysis = null;
    
    switch (codeType) {
      case 'typescript':
      case 'ts':
      case 'tsx':
        analysis = analyzeTypeScript(codeContent);
        break;
        
      case 'javascript':
      case 'js':
      case 'jsx':
        analysis = analyzeJavaScript(codeContent);
        break;
        
      case 'react':
        analysis = {
          ...analyzeReactComponent(codeContent),
          // Add additional analysis based on file extension
          ...(filePath && path.extname(filePath).toLowerCase().includes('ts') 
              ? analyzeTypeScript(codeContent) 
              : analyzeJavaScript(codeContent))
        };
        break;
        
      default:
        throw new Error(`Unsupported code type: ${codeType}`);
    }
    
    // Prepare response
    const response: AnalyzeCodeResponse = {
      success: true,
      type: codeType,
      filePath: filePath || null,
      analysis,
      suggestions: generateSuggestions(analysis, codeType)
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error analyzing code:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Determine code type from file extension
 */
function getCodeTypeFromExtension(extension: string): string {
  switch (extension) {
    case '.ts':
      return 'typescript';
    case '.tsx':
      return 'typescript';
    case '.js':
      return 'javascript';
    case '.jsx':
      return 'javascript';
    default:
      return '';
  }
}

/**
 * Generate code improvement suggestions based on analysis
 */
function generateSuggestions(analysis: any, codeType: string): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  try {
    // TypeScript/JavaScript specific suggestions
    if (codeType === 'typescript' || codeType === 'javascript') {
      // Check for missing exports
      if (analysis.exports && analysis.exports.length === 0) {
        suggestions.push({
          type: 'best-practice',
          message: 'Consider exporting at least one function or value from this file',
          priority: 'low'
        });
      }
      
      // Check for large classes/interfaces
      if (analysis.classes && analysis.classes.some(cls => cls.methods.length > 10)) {
        suggestions.push({
          type: 'code-quality',
          message: 'Large classes detected - consider breaking them into smaller, more focused classes',
          priority: 'medium'
        });
      }
      
      // Check for too many parameters in functions
      if (analysis.functions) {
        const largeParameterFunctions = analysis.functions.filter(func => func.parameters && func.parameters.length > 4);
        if (largeParameterFunctions.length > 0) {
          suggestions.push({
            type: 'code-quality',
            message: `Function(s) ${largeParameterFunctions.map(f => f.name).join(', ')} have many parameters - consider using an options object instead`,
            priority: 'medium'
          });
        }
      }
    }
    
    // React specific suggestions
    if (codeType === 'react') {
      // Check for hooks not following rules of hooks
      if (analysis.hooks) {
        const hooksInConditions = analysis.hooks.some(hook => 
          hook.text.includes('if (') || 
          hook.text.includes('} else {') ||
          hook.text.includes('for (') ||
          hook.text.includes('while (')
        );
        
        if (hooksInConditions) {
          suggestions.push({
            type: 'error',
            message: 'Hooks might be called inside conditions or loops - this violates the Rules of Hooks',
            priority: 'high'
          });
        }
      }
      
      // Check for missing dependencies in useEffect
      if (analysis.hooks && analysis.hooks.some(h => h.name === 'useEffect' && h.args.length > 1 && h.args[1] === '[]')) {
        suggestions.push({
          type: 'warning',
          message: 'useEffect with empty dependency array found - ensure all dependencies are properly included',
          priority: 'medium'
        });
      }
      
      // Check for missing React key in lists
      if (analysis.jsxElements && analysis.jsxElements.some(el => 
        (el.tagName === 'map' || el.text.includes('.map(')) && 
        !el.text.includes('key=')
      )) {
        suggestions.push({
          type: 'warning',
          message: 'Possible list rendering without key prop - each element in a list should have a unique key',
          priority: 'high'
        });
      }
    }
    
    // Common suggestions
    if (analysis.imports && analysis.imports.length > 10) {
      suggestions.push({
        type: 'best-practice',
        message: 'Large number of imports - consider refactoring to reduce dependencies',
        priority: 'low'
      });
    }
    
  } catch (error) {
    console.error('Error generating suggestions:', error);
    // Continue without suggestions
  }
  
  return suggestions;
}

// Interfaces
export interface AnalyzeCodeResponse {
  success: boolean;
  type: string;
  filePath: string | null;
  analysis: any;
  suggestions: Suggestion[];
}

export interface Suggestion {
  type: 'error' | 'warning' | 'best-practice' | 'code-quality';
  message: string;
  priority: 'high' | 'medium' | 'low';
}

export default {
  analyzeCodeHandler
};