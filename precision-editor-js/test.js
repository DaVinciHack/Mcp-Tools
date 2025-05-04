/**
 * Test script for the Precision Editor MCP Server
 * 
 * This script verifies that the MCP server works correctly by testing the main functions
 */

const mcp = require('./index');

async function runTests() {
  console.log('Testing Precision Editor MCP Server...');
  
  try {
    // Test status function
    console.log('\nTesting status function...');
    const statusResult = await mcp({
      name: 'status',
      parameters: {}
    });
    console.log('Status result:', statusResult);
    
    // Create a test file
    const testFilePath = '/Users/duncanburbury/mcp-servers/test-file.txt';
    const testContent = 'This is a test file.\nIt contains some text that we will edit.\nHello world!';
    
    // Test writeFile function
    console.log('\nTesting writeFile function...');
    const writeResult = await mcp({
      name: 'writeFile',
      parameters: {
        filePath: testFilePath,
        content: testContent,
        createBackupFile: false
      }
    });
    console.log('Write result:', writeResult);
    
    // Test readFile function
    console.log('\nTesting readFile function...');
    const readResult = await mcp({
      name: 'readFile',
      parameters: {
        filePath: testFilePath
      }
    });
    console.log('Read result:', readResult);
    
    // Test editCode function
    console.log('\nTesting editCode function...');
    const editResult = await mcp({
      name: 'editCode',
      parameters: {
        filePath: testFilePath,
        oldString: 'Hello world!',
        newString: 'Goodbye world!',
        createBackupFile: true,
        expectedReplacements: 1,
        formatCode: false
      }
    });
    console.log('Edit result:', editResult);
    
    // Verify the edit by reading the file again
    console.log('\nVerifying the edit...');
    const verifyResult = await mcp({
      name: 'readFile',
      parameters: {
        filePath: testFilePath
      }
    });
    console.log('Verify result:', verifyResult);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTests();
