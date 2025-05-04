/**
 * Precision Code Editor MCP Server
 * 
 * A custom MCP server for making targeted edits to code in Palantir Foundry
 */

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { readFileHandler } from './tools/readFile';
import { writeFileHandler } from './tools/writeFile';
import { analyzeCodeHandler } from './tools/analyze';
import { editCodeHandler } from './tools/editCode';
import { configData, loadConfig } from './config';

// Initialize configuration
loadConfig();

/**
 * Creates and configures the Express app
 */
function createApp() {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
  
  // API Routes
  app.post('/api/readFile', readFileHandler);
  app.post('/api/writeFile', writeFileHandler);
  app.post('/api/analyze', analyzeCodeHandler);
  app.post('/api/editCode', editCodeHandler);
  
  // Status endpoint
  app.get('/api/status', (req, res) => {
    res.json({
      status: 'running',
      version: '1.0.0',
      config: configData,
    });
  });
  
  return app;
}

/**
 * MCP Server handler function
 */
export async function handler(req, res) {
  const app = createApp();
  
  // Handle the request using the Express app
  return new Promise((resolve, reject) => {
    app(req, res, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(undefined);
      }
    });
  });
}

// If run directly (not as MCP server)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const app = createApp();
  
  // Start the server
  app.listen(PORT, () => {
    console.log(`Precision Code Editor MCP Server running on port ${PORT}`);
    console.log(`Configuration loaded: ${configData.allowedDirectories.length} directories allowed`);
  });
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: shutting down server');
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('SIGINT signal received: shutting down server');
    process.exit(0);
  });
}

export default { handler };