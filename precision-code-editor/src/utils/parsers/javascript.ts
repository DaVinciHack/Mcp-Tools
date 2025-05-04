/**
 * JavaScript Parser
 * 
 * Provides functionality for parsing and analyzing JavaScript code
 */

import * as recast from 'recast';
import * as types from 'ast-types';
import { configData } from '../../config';

/**
 * Parse JavaScript code and return the AST
 */
export function parseJavaScript(code: string): any {
  try {
    return recast.parse(code, {
      parser: require('@typescript-eslint/parser')
    });
  } catch (error) {
    throw new Error(`Failed to parse JavaScript code: ${error.message}`);
  }
}

/**
 * Get all imports from a JavaScript file
 */
export function getImports(ast: any): ImportInfo[] {
  const imports: ImportInfo[] = [];
  
  types.visit(ast, {
    visitImportDeclaration(path) {
      const node = path.node;
      const moduleSpecifier = node.source.value;
      
      let importType: 'default' | 'named' | 'namespace' | 'all' = 'named';
      let importedItems: string[] = [];
      
      // Check import type and collect imported items
      if (node.specifiers) {
        node.specifiers.forEach(specifier => {
          if (specifier.type === 'ImportDefaultSpecifier') {
            importType = 'default';
            importedItems.push(specifier.local.name);
          } else if (specifier.type === 'ImportNamespaceSpecifier') {
            importType = 'namespace';
            importedItems.push(specifier.local.name);
          } else if (specifier.type === 'ImportSpecifier') {
            importType = 'named';
            const importedName = specifier.imported.name !== specifier.local.name 
              ? `${specifier.imported.name} as ${specifier.local.name}`
              : specifier.local.name;
            
            importedItems.push(importedName);
          }
        });
      }
      
      imports.push({
        moduleSpecifier,
        importType,
        importedItems,
        text: recast.print(node).code
      });
      
      this.traverse(path);
    }
  });
  
  return imports;
}

/**
 * Get all exports from a JavaScript file
 */
export function getExports(ast: any): ExportInfo[] {
  const exports: ExportInfo[] = [];
  
  types.visit(ast, {
    visitExportNamedDeclaration(path) {
      const node = path.node;
      const exportedItems: string[] = [];
      
      if (node.specifiers && node.specifiers.length > 0) {
        node.specifiers.forEach(specifier => {
          const exportedName = specifier.exported.name !== specifier.local.name 
            ? `${specifier.local.name} as ${specifier.exported.name}`
            : specifier.local.name;
          
          exportedItems.push(exportedName);
        });
        
        exports.push({
          type: 'named',
          exportedItems,
          moduleSpecifier: node.source ? node.source.value : undefined,
          text: recast.print(node).code
        });
      } else if (node.declaration) {
        // Export declaration
        if (node.declaration.type === 'VariableDeclaration') {
          node.declaration.declarations.forEach(declaration => {
            exportedItems.push(declaration.id.name);
          });
          
          exports.push({
            type: 'variable',
            exportedItems,
            text: recast.print(node).code
          });
        } else if (node.declaration.id) {
          // Function, class or other named declaration
          exports.push({
            type: node.declaration.type.replace('Declaration', '').toLowerCase(),
            exportedItems: [node.declaration.id.name],
            text: recast.print(node).code
          });
        }
      }
      
      this.traverse(path);
    },
    
    visitExportDefaultDeclaration(path) {
      const node = path.node;
      
      exports.push({
        type: 'default',
        exportedItems: ['default'],
        text: recast.print(node).code
      });
      
      this.traverse(path);
    },
    
    visitExportAllDeclaration(path) {
      const node = path.node;
      
      exports.push({
        type: 'all',
        exportedItems: ['*'],
        moduleSpecifier: node.source.value,
        text: recast.print(node).code
      });
      
      this.traverse(path);
    }
  });
  
  return exports;
}

/**
 * Get all functions from a JavaScript file
 */
export function getFunctions(ast: any): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  
  types.visit(ast, {
    visitFunctionDeclaration(path) {
      const node = path.node;
      
      if (node.id) {
        const params: ParameterInfo[] = [];
        
        node.params.forEach(param => {
          let paramName = '';
          let defaultValue;
          let isOptional = false;
          
          // Handle different parameter types
          if (param.type === 'Identifier') {
            paramName = param.name;
          } else if (param.type === 'AssignmentPattern') {
            paramName = param.left.name;
            defaultValue = recast.print(param.right).code;
            isOptional = true;
          } else if (param.type === 'RestElement') {
            paramName = `...${param.argument.name}`;
          } else if (param.type === 'ObjectPattern') {
            paramName = recast.print(param).code;
          } else if (param.type === 'ArrayPattern') {
            paramName = recast.print(param).code;
          }
          
          params.push({
            name: paramName,
            optional: isOptional,
            defaultValue
          });
        });
        
        functions.push({
          name: node.id.name,
          parameters: params,
          async: !!node.async,
          exported: path.parent.node.type === 'ExportNamedDeclaration' || 
                   path.parent.node.type === 'ExportDefaultDeclaration',
          text: recast.print(node).code
        });
      }
      
      this.traverse(path);
    },
    
    visitArrowFunctionExpression(path) {
      const node = path.node;
      const parentNode = path.parent.node;
      
      // Only include arrow functions assigned to variables
      if (parentNode.type === 'VariableDeclarator' && parentNode.id) {
        const params: ParameterInfo[] = [];
        
        node.params.forEach(param => {
          let paramName = '';
          let defaultValue;
          let isOptional = false;
          
          // Handle different parameter types
          if (param.type === 'Identifier') {
            paramName = param.name;
          } else if (param.type === 'AssignmentPattern') {
            paramName = param.left.name;
            defaultValue = recast.print(param.right).code;
            isOptional = true;
          } else if (param.type === 'RestElement') {
            paramName = `...${param.argument.name}`;
          } else if (param.type === 'ObjectPattern') {
            paramName = recast.print(param).code;
          } else if (param.type === 'ArrayPattern') {
            paramName = recast.print(param).code;
          }
          
          params.push({
            name: paramName,
            optional: isOptional,
            defaultValue
          });
        });
        
        functions.push({
          name: parentNode.id.name,
          parameters: params,
          async: !!node.async,
          exported: path.parent.parent.parent.node.type === 'ExportNamedDeclaration' || 
                   path.parent.parent.parent.node.type === 'ExportDefaultDeclaration',
          text: recast.print(path.parent.node).code
        });
      }
      
      this.traverse(path);
    }
  });
  
  return functions;
}

/**
 * Get all classes from a JavaScript file
 */
export function getClasses(ast: any): ClassInfo[] {
  const classes: ClassInfo[] = [];
  
  types.visit(ast, {
    visitClassDeclaration(path) {
      const node = path.node;
      
      if (node.id) {
        const methods: MethodInfo[] = [];
        const properties: PropertyInfo[] = [];
        
        // Get methods
        node.body.body.forEach(member => {
          if (member.type === 'MethodDefinition') {
            const params: ParameterInfo[] = [];
            
            member.value.params.forEach(param => {
              let paramName = '';
              let defaultValue;
              let isOptional = false;
              
              // Handle different parameter types
              if (param.type === 'Identifier') {
                paramName = param.name;
              } else if (param.type === 'AssignmentPattern') {
                paramName = param.left.name;
                defaultValue = recast.print(param.right).code;
                isOptional = true;
              } else if (param.type === 'RestElement') {
                paramName = `...${param.argument.name}`;
              } else if (param.type === 'ObjectPattern') {
                paramName = recast.print(param).code;
              } else if (param.type === 'ArrayPattern') {
                paramName = recast.print(param).code;
              }
              
              params.push({
                name: paramName,
                optional: isOptional,
                defaultValue
              });
            });
            
            methods.push({
              name: member.key.name || member.key.value,
              parameters: params,
              kind: member.kind,
              static: member.static,
              text: recast.print(member).code
            });
          }
          // Class properties (requires babel parser)
          else if (member.type === 'ClassProperty') {
            properties.push({
              name: member.key.name || member.key.value,
              static: member.static,
              text: recast.print(member).code
            });
          }
        });
        
        classes.push({
          name: node.id.name,
          methods,
          properties,
          superClass: node.superClass ? recast.print(node.superClass).code : undefined,
          exported: path.parent.node.type === 'ExportNamedDeclaration' || 
                   path.parent.node.type === 'ExportDefaultDeclaration',
          text: recast.print(node).code
        });
      }
      
      this.traverse(path);
    }
  });
  
  return classes;
}

/**
 * Analyze JavaScript code and return detailed structure information
 */
export function analyzeJavaScript(code: string): JavaScriptAnalysis {
  const ast = parseJavaScript(code);
  
  return {
    imports: getImports(ast),
    exports: getExports(ast),
    functions: getFunctions(ast),
    classes: getClasses(ast)
  };
}

// Interfaces
export interface ImportInfo {
  moduleSpecifier: string;
  importType: 'default' | 'named' | 'namespace' | 'all';
  importedItems: string[];
  text: string;
}

export interface ExportInfo {
  type: 'named' | 'default' | 'all' | 'variable' | 'function' | 'class';
  exportedItems: string[];
  moduleSpecifier?: string;
  text: string;
}

export interface ParameterInfo {
  name: string;
  optional: boolean;
  defaultValue?: string;
}

export interface FunctionInfo {
  name: string;
  parameters: ParameterInfo[];
  async: boolean;
  exported: boolean;
  text: string;
}

export interface MethodInfo {
  name: string;
  parameters: ParameterInfo[];
  kind: string;
  static: boolean;
  text: string;
}

export interface PropertyInfo {
  name: string;
  static: boolean;
  text: string;
}

export interface ClassInfo {
  name: string;
  methods: MethodInfo[];
  properties: PropertyInfo[];
  superClass?: string;
  exported: boolean;
  text: string;
}

export interface JavaScriptAnalysis {
  imports: ImportInfo[];
  exports: ExportInfo[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
}

export default {
  parseJavaScript,
  analyzeJavaScript,
  getImports,
  getExports,
  getFunctions,
  getClasses
};