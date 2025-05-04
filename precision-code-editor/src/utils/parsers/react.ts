/**
 * React Parser
 * 
 * Provides functionality for parsing and analyzing React components
 */

import * as ts from 'typescript';
import * as recast from 'recast';
import * as types from 'ast-types';
import { parseTypeScript } from './typescript';
import { parseJavaScript } from './javascript';
import { configData } from '../../config';

/**
 * Check if the code is a React component
 */
export function isReactComponent(code: string): boolean {
  const containsJsx = code.includes('JSX.Element') || 
                      code.includes('<') && code.includes('/>') ||
                      code.includes('React.createElement');
  
  const importReact = code.includes('import React') || 
                      code.includes('import * as React') ||
                      code.includes('require("react")') ||
                      code.includes("require('react')");
  
  return containsJsx && importReact;
}

/**
 * Find all JSX elements in the code
 */
export function findJsxElements(code: string): JsxElementInfo[] {
  const elements: JsxElementInfo[] = [];
  let ast;
  
  try {
    // Try parsing as TypeScript first
    ast = parseTypeScript(code);
  } catch (error) {
    try {
      // Fall back to JavaScript parser
      ast = parseJavaScript(code).program;
    } catch (innerError) {
      throw new Error(`Failed to parse React component: ${innerError.message}`);
    }
  }
  
  // Visit all nodes looking for JSX elements
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = ts.isJsxElement(node) 
        ? node.openingElement.tagName.getText()
        : node.tagName.getText();
      
      const attributes: JsxAttributeInfo[] = [];
      
      // Get attributes
      const attrs = ts.isJsxElement(node) 
        ? node.openingElement.attributes.properties
        : node.attributes.properties;
      
      attrs.forEach(attr => {
        if (ts.isJsxAttribute(attr)) {
          attributes.push({
            name: attr.name.getText(),
            value: attr.initializer ? attr.initializer.getText() : 'true'
          });
        } else if (ts.isJsxSpreadAttribute(attr)) {
          attributes.push({
            name: '...',
            value: attr.expression.getText(),
            isSpread: true
          });
        }
      });
      
      // Extract children for JSX elements (not self-closing)
      const children: string[] = [];
      if (ts.isJsxElement(node)) {
        node.children.forEach(child => {
          if (ts.isJsxElement(child) || ts.isJsxExpression(child) || ts.isJsxText(child)) {
            children.push(child.getText());
          }
        });
      }
      
      elements.push({
        tagName,
        attributes,
        children,
        text: node.getText(),
        selfClosing: ts.isJsxSelfClosingElement(node)
      });
    }
    
    ts.forEachChild(node, visit);
  };
  
  visit(ast);
  
  return elements;
}

/**
 * Find React hooks in the code
 */
export function findHooks(code: string): HookInfo[] {
  const hooks: HookInfo[] = [];
  let ast;
  
  try {
    // Try parsing as JavaScript first (better for hooks)
    ast = parseJavaScript(code);
  } catch (error) {
    return hooks; // Return empty array if parsing fails
  }
  
  types.visit(ast, {
    visitCallExpression(path) {
      const node = path.node;
      
      // Check if it's a hook call (starts with 'use')
      if (node.callee.type === 'Identifier' && 
          node.callee.name.startsWith('use')) {
        
        hooks.push({
          name: node.callee.name,
          args: node.arguments.map(arg => recast.print(arg).code),
          text: recast.print(node).code
        });
      }
      
      this.traverse(path);
    }
  });
  
  return hooks;
}

/**
 * Identify the component type (Function, Class, or Forward Ref)
 */
export function identifyComponentType(code: string): ComponentType {
  if (code.includes('class') && code.includes('extends React.Component')) {
    return 'ClassComponent';
  } else if (code.includes('React.forwardRef') || code.includes('forwardRef')) {
    return 'ForwardRefComponent';
  } else if (code.includes('function') || code.includes('=>') && code.includes('return')) {
    return 'FunctionComponent';
  } else {
    return 'Unknown';
  }
}

/**
 * Extract props interface/type from component
 */
export function extractPropsType(code: string): string | null {
  // For TypeScript components
  const propsInterfaceRegex = /interface\s+(\w+Props)\s+\{([^}]+)\}/;
  const propsTypeRegex = /type\s+(\w+Props)\s+=\s+\{([^}]+)\}/;
  
  // Try to find props definition
  const interfaceMatch = propsInterfaceRegex.exec(code);
  if (interfaceMatch) {
    return `interface ${interfaceMatch[1]} {${interfaceMatch[2]}}`;
  }
  
  const typeMatch = propsTypeRegex.exec(code);
  if (typeMatch) {
    return `type ${typeMatch[1]} = {${typeMatch[2]}}`;
  }
  
  // Check for props destructuring in function parameters
  const funcPropsRegex = /function\s+\w+\s*\(\s*\{\s*([^}]+)\s*\}\s*:/;
  const arrowPropsRegex = /const\s+\w+\s*=\s*\(\s*\{\s*([^}]+)\s*\}\s*:/;
  
  const funcMatch = funcPropsRegex.exec(code);
  if (funcMatch) {
    return `{ ${funcMatch[1]} }`;
  }
  
  const arrowMatch = arrowPropsRegex.exec(code);
  if (arrowMatch) {
    return `{ ${arrowMatch[1]} }`;
  }
  
  return null;
}

/**
 * Analyze React component and return detailed information
 */
export function analyzeReactComponent(code: string): ReactComponentAnalysis {
  return {
    isReactComponent: isReactComponent(code),
    componentType: identifyComponentType(code),
    jsxElements: findJsxElements(code),
    hooks: findHooks(code),
    propsType: extractPropsType(code)
  };
}

// Types
export type ComponentType = 'FunctionComponent' | 'ClassComponent' | 'ForwardRefComponent' | 'Unknown';

// Interfaces
export interface JsxAttributeInfo {
  name: string;
  value: string;
  isSpread?: boolean;
}

export interface JsxElementInfo {
  tagName: string;
  attributes: JsxAttributeInfo[];
  children: string[];
  text: string;
  selfClosing: boolean;
}

export interface HookInfo {
  name: string;
  args: string[];
  text: string;
}

export interface ReactComponentAnalysis {
  isReactComponent: boolean;
  componentType: ComponentType;
  jsxElements: JsxElementInfo[];
  hooks: HookInfo[];
  propsType: string | null;
}

export default {
  isReactComponent,
  findJsxElements,
  findHooks,
  identifyComponentType,
  extractPropsType,
  analyzeReactComponent
};