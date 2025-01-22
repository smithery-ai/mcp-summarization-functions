#!/usr/bin/env node
// Set up fetch polyfill before any other imports
import fetch, { Headers, Request, Response } from 'node-fetch';
if (!globalThis.fetch) {
  globalThis.fetch = fetch as unknown as typeof globalThis.fetch;
  globalThis.Headers = Headers as unknown as typeof globalThis.Headers;
  globalThis.Request = Request as unknown as typeof globalThis.Request;
  globalThis.Response = Response as unknown as typeof globalThis.Response;
}

import { config } from 'dotenv';
import { createAnthropicModel } from './models/anthropic.js';

// Load environment variables from .env file if present
if (process.env.NODE_ENV !== 'production') {
  config();
}
import { SummarizationService } from './services/summarization.js';
import { McpServer } from './server/mcp-server.js';
import { SummarizationConfig } from './types/models.js';
import { initializeModel } from './models/index.js';

async function main() {
  // Model configuration
  const provider = process.env.PROVIDER;
  if (!provider) {
    throw new Error('PROVIDER environment variable is required');
  }
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error('API_KEY environment variable is required');
  }
  const modelId = process.env.MODEL_ID;

  let baseUrl = null;
  if (process.env.PROVIDER_BASE_URL) {
    baseUrl = process.env.PROVIDER_BASE_URL;
  }


  // 
  let maxTokens = 1024;
  if (process.env.MAX_TOKENS) {
    maxTokens = parseInt(process.env.MAX_TOKENS) || 1024;
  }
  let charThreshold = 512;
  if (process.env.SUMMARIZATION_CHAR_THRESHOLD) {
    charThreshold = parseInt(process.env.SUMMARIZATION_CHAR_THRESHOLD) || 512;
  }
  let cacheMaxAge = 1000 * 60 * 60;
  if (process.env.SUMMARIZATION_CACHE_MAX_AGE) {
    cacheMaxAge = parseInt(process.env.SUMMARIZATION_CACHE_MAX_AGE) || 1000 * 60 * 60;
  }



  try {
    // Create the configuration
    const config: SummarizationConfig = {
      model: {
        apiKey: apiKey,
        model: modelId,
        maxTokens: maxTokens,
        baseUrl: null
      },
      charThreshold: charThreshold, // Threshold for when to summarize
      cacheMaxAge: cacheMaxAge
    };

    const model = initializeModel(provider, config.model);

    // Create and initialize the summarization service
    const summarizationService = new SummarizationService(model, config);
    await summarizationService.initialize();

    // Create and start the MCP server
    const server = new McpServer(summarizationService);
    await server.start();

    // Handle cleanup on process termination
    process.on('SIGINT', async () => {
      await server.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await server.cleanup();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch(console.error);
