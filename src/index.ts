#!/usr/bin/env node
import { createClaudeModel } from './models/claude.js';
import { SummarizationService } from './services/summarization.js';
import { McpServer } from './server/mcp-server.js';
import { SummarizationConfig } from './types/models.js';

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  try {
    // Create and configure the summarization model
    const model = createClaudeModel();

    // Create the configuration
    const config: SummarizationConfig = {
      model: {
        apiKey,
        model: 'claude-3-sonnet-20240229',
        maxTokens: 1024,
      },
      charThreshold: 512, // Threshold for when to summarize
      cacheMaxAge: 1000 * 60 * 60, // 1 hour cache lifetime
    };

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
