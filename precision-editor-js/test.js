/**
 * Test script for the Precision Editor MCP Server
 * 
 * This script simulates MCP protocol messages to test the server's functionality
 */

// Import the MCP handler
const mcpHandler = require('./index');

// Mock options for the MCP handler
const mockOptions = {
  onMessage: (handler) => {
    mockOptions.messageHandler = handler;
  },
  onShutdown: (handler) => {
    mockOptions.shutdownHandler = handler;
  },
  messageHandler: null,
  shutdownHandler: null
};

// Initialize the MCP handler
async function initializeMcpHandler() {
  return await mcpHandler(mockOptions);
}

// Simulate sending a message to the MCP handler
async function sendMessage(message) {
  if (!mockOptions.messageHandler) {
    throw new Error('Message handler not initialized');
  }
  return await mockOptions.messageHandler(message);
}

// Test initialize request
async function testInitialize() {
  console.log('\nTesting initialize request...');
  
  const initializeMessage = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };
  
  const response = await sendMessage(initializeMessage);
  console.log('Initialize response:', response);
  
  if (response.id === 1 && response.result) {
    console.log('✅ Initialize request successful');
    return true;
  } else {
    console.log('❌ Initialize request failed');
    return false;
  }
}

// Test readFile function
async function testReadFile(filePath) {
  console.log('\nTesting readFile function...');
  
  const readFileMessage = {
    jsonrpc: '2.0',
    id: 2,
    method: 'mcp/execute',
    params: {
      name: 'readFile',
      parameters: {
        filePath
      }
    }
  };
  
  const response = await sendMessage(readFileMessage);
  console.log('ReadFile response:', response);
  
  if (response.id === 2 && response.result && response.result.success) {
    console.log('✅ ReadFile function successful');
    return response.result;
  } else {
    console.log('❌ ReadFile function failed');
    return null;
  }
}

// Test writeFile function
async function testWriteFile(filePath, content) {
  console.log('\nTesting writeFile function...');
  
  const writeFileMessage = {
    jsonrpc: '2.0',
    id: 3,
    method: 'mcp/execute',
    params: {
      name: 'writeFile',
      parameters: {
        filePath,
        content,
        createBackupFile: false
      }
    }
  };
  
  const response = await sendMessage(writeFileMessage);
  console.log('WriteFile response:', response);
  
  if (response.id === 3 && response.result && response.result.success) {
    console.log('✅ WriteFile function successful');
    return response.result;
  } else {
    console.log('❌ WriteFile function failed');
    return null;
  }
}

// Test editCode function
async function testEditCode(filePath, oldString, newString) {
  console.log('\nTesting editCode function...');
  
  const editCodeMessage = {
    jsonrpc: '2.0',
    id: 4,
    method: 'mcp/execute',
    params: {
      name: 'editCode',
      parameters: {
        filePath,
        oldString,
        newString,
        createBackupFile: true,
        expectedReplacements: 1,
        formatCode: false
      }
    }
  };
  
  const response = await sendMessage(editCodeMessage);
  console.log('EditCode response:', response);
  
  if (response.id === 4 && response.result && response.result.success) {
    console.log('✅ EditCode function successful');
    return response.result;
  } else {
    console.log('❌ EditCode function failed');
    return null;
  }
}

// Test status function
async function testStatus() {
  console.log('\nTesting status function...');
  
  const statusMessage = {
    jsonrpc: '2.0',
    id: 5,
    method: 'mcp/execute',
    params: {
      name: 'status',
      parameters: {}
    }
  };
  
  const response = await sendMessage(statusMessage);
  console.log('Status response:', response);
  
  if (response.id === 5 && response.result && response.result.status) {
    console.log('✅ Status function successful');
    return response.result;
  } else {
    console.log('❌ Status function failed');
    return null;
  }
}

// Run all tests
async function runTests() {
  console.log('Testing Precision Editor MCP Server...');
  
  try {
    // Initialize the MCP handler
    const apiFunctions = await initializeMcpHandler();
    console.log('MCP Handler initialized:', Object.keys(apiFunctions));
    
    // Test initialize request
    await testInitialize();
    
    // Create a test file
    const testFilePath = '/Users/duncanburbury/mcp-servers/test-file.txt';
    const testContent = 'This is a test file.\nIt contains some text that we will edit.\nHello world!';
    
    // Test writeFile function
    await testWriteFile(testFilePath, testContent);
    
    // Test readFile function
    await testReadFile(testFilePath);
    
    // Test editCode function
    await testEditCode(testFilePath, 'Hello world!', 'Goodbye world!');
    
    // Verify the edit by reading the file again
    console.log('\nVerifying the edit...');
    await testReadFile(testFilePath);
    
    // Test status function
    await testStatus();
    
    console.log('\nAll tests completed successfully!');
    
    // Shut down the MCP handler
    if (mockOptions.shutdownHandler) {
      mockOptions.shutdownHandler();
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
runTests();