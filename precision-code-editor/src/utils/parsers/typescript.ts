/**
 * TypeScript Parser
 * 
 * Provides functionality for parsing and analyzing TypeScript code
 */

import * as ts from 'typescript';
import { configData } from '../../config';

/**
 * Parse TypeScript code and return the AST
 */
export function parseTypeScript(code: string): ts.SourceFile {
  return ts.createSourceFile(
    'file.ts',
    code,
    ts.ScriptTarget.Latest,
    true
  );
}

/**
 * Get all imports from a TypeScript file
 */
export function getImports(sourceFile: ts.SourceFile): ImportInfo[] {
  const imports: ImportInfo[] = [];
  
  // Visit each node in the file
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier.getText().replace(/['"]/g, '');
      
      let importType: 'default' | 'named' | 'namespace' | 'all' = 'named';
      let importedItems: string[] = [];
      
      // Check import type
      if (node.importClause) {
        // Default import
        if (node.importClause.name) {
          importType = 'default';
          importedItems.push(node.importClause.name.text);
        }
        
        // Named imports
        if (node.importClause.namedBindings) {
          if (ts.isNamedImports(node.importClause.namedBindings)) {
            importType = 'named';
            node.importClause.namedBindings.elements.forEach(element => {
              const importedName = element.propertyName 
                ? `${element.propertyName.text} as ${element.name.text}`
                : element.name.text;
              
              importedItems.push(importedName);
            });
          }
          // Namespace import
          else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
            importType = 'namespace';
            importedItems.push(node.importClause.namedBindings.name.text);
          }
        }
      }
      
      imports.push({
        moduleSpecifier,
        importType,
        importedItems,
        lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        text: node.getText()
      });
    }
    
    ts.forEachChild(node, visit);
  };
  
  visit(sourceFile);
  
  return imports;
}

/**
 * Get all exported declarations from a TypeScript file
 */
export function getExports(sourceFile: ts.SourceFile): ExportInfo[] {
  const exports: ExportInfo[] = [];
  
  // Visit each node in the file
  const visit = (node: ts.Node) => {
    if (ts.isExportDeclaration(node)) {
      const exportedItems: string[] = [];
      
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach(element => {
          const exportedName = element.propertyName 
            ? `${element.propertyName.text} as ${element.name.text}`
            : element.name.text;
          
          exportedItems.push(exportedName);
        });
      }
      
      exports.push({
        type: 'named',
        exportedItems,
        moduleSpecifier: node.moduleSpecifier 
          ? node.moduleSpecifier.getText().replace(/['"]/g, '')
          : undefined,
        lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        text: node.getText()
      });
    } 
    else if (ts.isVariableStatement(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      node.declarationList.declarations.forEach(declaration => {
        exports.push({
          type: 'variable',
          exportedItems: [declaration.name.getText()],
          lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          text: node.getText()
        });
      });
    }
    else if (
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && 
      node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      if (node.name) {
        const type = ts.isFunctionDeclaration(node) 
          ? 'function' 
          : ts.isClassDeclaration(node)
            ? 'class'
            : ts.isInterfaceDeclaration(node)
              ? 'interface'
              : 'type';
              
        exports.push({
          type,
          exportedItems: [node.name.text],
          lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          text: node.getText()
        });
      }
    }
    
    ts.forEachChild(node, visit);
  };
  
  visit(sourceFile);
  
  return exports;
}

/**
 * Find all interfaces in the TypeScript code
 */
export function getInterfaces(sourceFile: ts.SourceFile): InterfaceInfo[] {
  const interfaces: InterfaceInfo[] = [];
  
  // Visit each node in the file
  const visit = (node: ts.Node) => {
    if (ts.isInterfaceDeclaration(node)) {
      const properties: PropertyInfo[] = [];
      const methods: MethodInfo[] = [];
      
      // Get interface members
      node.members.forEach(member => {
        // Property
        if (ts.isPropertySignature(member)) {
          properties.push({
            name: member.name.getText(),
            type: member.type ? member.type.getText() : 'any',
            optional: member.questionToken !== undefined,
            lineNumber: sourceFile.getLineAndCharacterOfPosition(member.getStart()).line + 1
          });
        }
        // Method
        else if (ts.isMethodSignature(member)) {
          const params: ParameterInfo[] = [];
          
          member.parameters.forEach(param => {
            params.push({
              name: param.name.getText(),
              type: param.type ? param.type.getText() : 'any',
              optional: param.questionToken !== undefined,
              defaultValue: param.initializer ? param.initializer.getText() : undefined
            });
          });
          
          methods.push({
            name: member.name.getText(),
            returnType: member.type ? member.type.getText() : 'any',
            parameters: params,
            lineNumber: sourceFile.getLineAndCharacterOfPosition(member.getStart()).line + 1
          });
        }
      });
      
      interfaces.push({
        name: node.name.text,
        properties,
        methods,
        heritage: node.heritageClauses?.map(h => h.getText()) || [],
        lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        exported: node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false
      });
    }
    
    ts.forEachChild(node, visit);
  };
  
  visit(sourceFile);
  
  return interfaces;
}

/**
 * Find all classes in the TypeScript code
 */
export function getClasses(sourceFile: ts.SourceFile): ClassInfo[] {
  const classes: ClassInfo[] = [];
  
  // Visit each node in the file
  const visit = (node: ts.Node) => {
    if (ts.isClassDeclaration(node) && node.name) {
      const properties: PropertyInfo[] = [];
      const methods: MethodInfo[] = [];
      
      // Get class members
      node.members.forEach(member => {
        // Property
        if (ts.isPropertyDeclaration(member)) {
          properties.push({
            name: member.name.getText(),
            type: member.type ? member.type.getText() : 'any',
            optional: member.questionToken !== undefined,
            lineNumber: sourceFile.getLineAndCharacterOfPosition(member.getStart()).line + 1,
            modifiers: member.modifiers?.map(m => m.getText()) || []
          });
        }
        // Method
        else if (ts.isMethodDeclaration(member) && member.name) {
          const params: ParameterInfo[] = [];
          
          member.parameters.forEach(param => {
            params.push({
              name: param.name.getText(),
              type: param.type ? param.type.getText() : 'any',
              optional: param.questionToken !== undefined,
              defaultValue: param.initializer ? param.initializer.getText() : undefined
            });
          });
          
          methods.push({
            name: member.name.getText(),
            returnType: member.type ? member.type.getText() : 'any',
            parameters: params,
            lineNumber: sourceFile.getLineAndCharacterOfPosition(member.getStart()).line + 1,
            modifiers: member.modifiers?.map(m => m.getText()) || []
          });
        }
      });
      
      classes.push({
        name: node.name.text,
        properties,
        methods,
        heritage: node.heritageClauses?.map(h => h.getText()) || [],
        lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        exported: node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false,
        modifiers: node.modifiers?.map(m => m.getText()) || []
      });
    }
    
    ts.forEachChild(node, visit);
  };
  
  visit(sourceFile);
  
  return classes;
}

/**
 * Find all functions in the TypeScript code
 */
export function getFunctions(sourceFile: ts.SourceFile): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  
  // Visit each node in the file
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const params: ParameterInfo[] = [];
      
      node.parameters.forEach(param => {
        params.push({
          name: param.name.getText(),
          type: param.type ? param.type.getText() : 'any',
          optional: param.questionToken !== undefined,
          defaultValue: param.initializer ? param.initializer.getText() : undefined
        });
      });
      
      functions.push({
        name: node.name.text,
        returnType: node.type ? node.type.getText() : 'any',
        parameters: params,
        lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        exported: node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false,
        async: node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false
      });
    }
    
    ts.forEachChild(node, visit);
  };
  
  visit(sourceFile);
  
  return functions;
}

/**
 * Analyze TypeScript code and return detailed structure information
 */
export function analyzeTypeScript(code: string): TypeScriptAnalysis {
  const sourceFile = parseTypeScript(code);
  
  return {
    imports: getImports(sourceFile),
    exports: getExports(sourceFile),
    interfaces: getInterfaces(sourceFile),
    classes: getClasses(sourceFile),
    functions: getFunctions(sourceFile)
  };
}

// Interfaces
export interface ImportInfo {
  moduleSpecifier: string;
  importType: 'default' | 'named' | 'namespace' | 'all';
  importedItems: string[];
  lineNumber: number;
  text: string;
}

export interface ExportInfo {
  type: 'named' | 'default' | 'variable' | 'function' | 'class' | 'interface' | 'type';
  exportedItems: string[];
  moduleSpecifier?: string;
  lineNumber: number;
  text: string;
}

export interface PropertyInfo {
  name: string;
  type: string;
  optional: boolean;
  lineNumber: number;
  modifiers?: string[];
}

export interface ParameterInfo {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}

export interface MethodInfo {
  name: string;
  returnType: string;
  parameters: ParameterInfo[];
  lineNumber: number;
  modifiers?: string[];
}

export interface InterfaceInfo {
  name: string;
  properties: PropertyInfo[];
  methods: MethodInfo[];
  heritage: string[];
  lineNumber: number;
  exported: boolean;
}

export interface ClassInfo {
  name: string;
  properties: PropertyInfo[];
  methods: MethodInfo[];
  heritage: string[];
  lineNumber: number;
  exported: boolean;
  modifiers: string[];
}

export interface FunctionInfo {
  name: string;
  returnType: string;
  parameters: ParameterInfo[];
  lineNumber: number;
  exported: boolean;
  async: boolean;
}

export interface TypeScriptAnalysis {
  imports: ImportInfo[];
  exports: ExportInfo[];
  interfaces: InterfaceInfo[];
  classes: ClassInfo[];
  functions: FunctionInfo[];
}

export default {
  parseTypeScript,
  analyzeTypeScript,
  getImports,
  getExports,
  getInterfaces,
  getClasses,
  getFunctions
};