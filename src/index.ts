#!/usr/bin/env node
import {
  Server,
} from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  Request as ToolCallRequest,
} from '@modelcontextprotocol/sdk/types.js';
import Anthropic from '@anthropic-ai/sdk';
import { execa } from 'execa';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';

// Response type that matches the SDK's expectations
interface ToolResponse {
  _meta?: Record<string, unknown>;
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

const CHAR_THRESHOLD = 512; // Threshold for when to summarize
const MAX_CACHE_AGE = 1000 * 60 * 60; // 1 hour cache lifetime

interface CacheEntry {
  content: string;
  timestamp: number;
}

interface SummarizeCommandArgs {
  command: string;
  cwd?: string;
}

interface SummarizeFilesArgs {
  paths: string[];
}

interface SummarizeDirectoryArgs {
  path: string;
  recursive?: boolean;
}

interface SummarizeTextArgs {
  content: string;
  type: string;
}

interface GetFullContentArgs {
  id: string;
}

// Type guards
function isSummarizeCommandArgs(args: unknown): args is SummarizeCommandArgs {
  return typeof args === 'object' && args !== null && 'command' in args && typeof (args as any).command === 'string';
}

function isSummarizeFilesArgs(args: unknown): args is SummarizeFilesArgs {
  return typeof args === 'object' && args !== null && 'paths' in args && Array.isArray((args as any).paths);
}

function isSummarizeDirectoryArgs(args: unknown): args is SummarizeDirectoryArgs {
  return typeof args === 'object' && args !== null && 'path' in args && typeof (args as any).path === 'string';
}

function isSummarizeTextArgs(args: unknown): args is SummarizeTextArgs {
  return typeof args === 'object' && args !== null && 
    'content' in args && typeof (args as any).content === 'string' &&
    'type' in args && typeof (args as any).type === 'string';
}

function isGetFullContentArgs(args: unknown): args is GetFullContentArgs {
  return typeof args === 'object' && args !== null && 'id' in args && typeof (args as any).id === 'string';
}

class SummarizationServer {
  private server: Server;
  private anthropic: Anthropic;
  private contentCache: Map<string, CacheEntry>;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    this.server = new Server(
      {
        name: 'summarization-functions',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.anthropic = new Anthropic({
      apiKey,
    });

    this.contentCache = new Map();
    this.setupToolHandlers();
    
    // Periodic cache cleanup
    setInterval(() => this.cleanupCache(), MAX_CACHE_AGE);
    
    // Error handling
    this.server.onerror = (error: Error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [id, entry] of this.contentCache.entries()) {
      if (now - entry.timestamp > MAX_CACHE_AGE) {
        this.contentCache.delete(id);
      }
    }
  }

  private async summarizeWithClaude(content: string, type: string): Promise<string> {
    const prompt = `Summarize the following ${type} in a clear, concise way that would be useful for an AI agent. Focus on the most important information and maintain technical accuracy:

${content}

Summary:`;

    const message = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    // Handle the response content safely
    const responseContent = message.content[0];
    if ('text' in responseContent) {
      return responseContent.text;
    }
    throw new Error('Unexpected response format from Claude');
  }

  private storeContent(content: string): string {
    const id = uuidv4();
    this.contentCache.set(id, {
      content,
      timestamp: Date.now(),
    });
    return id;
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'summarize_command',
          description: 'Execute a command and summarize its output if it exceeds the threshold',
          inputSchema: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'Command to execute',
              },
              cwd: {
                type: 'string',
                description: 'Working directory for command execution',
              },
            },
            required: ['command'],
          },
        },
        {
          name: 'summarize_files',
          description: 'Summarize the contents of one or more files',
          inputSchema: {
            type: 'object',
            properties: {
              paths: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Array of file paths to summarize',
              },
            },
            required: ['paths'],
          },
        },
        {
          name: 'summarize_directory',
          description: 'Summarize the structure of a directory',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Directory path to summarize',
              },
              recursive: {
                type: 'boolean',
                description: 'Whether to include subdirectories',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'summarize_text',
          description: 'Summarize any text content (e.g., MCP tool output)',
          inputSchema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'Text content to summarize',
              },
              type: {
                type: 'string',
                description: 'Type of content (e.g., "log output", "API response")',
              },
            },
            required: ['content', 'type'],
          },
        },
        {
          name: 'get_full_content',
          description: 'Retrieve the full content for a given summary ID',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID of the stored content',
              },
            },
            required: ['id'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!request.params?.name) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'Missing tool name'
        );
      }

      if (!request.params.arguments) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'Missing arguments'
        );
      }

      try {
        const response = await (async () => {
          switch (request.params.name) {
            case 'summarize_command':
              if (!isSummarizeCommandArgs(request.params.arguments)) {
                throw new McpError(ErrorCode.InvalidRequest, 'Invalid arguments for summarize_command');
              }
              return await this.handleSummarizeCommand(request.params.arguments);
            case 'summarize_files':
              if (!isSummarizeFilesArgs(request.params.arguments)) {
                throw new McpError(ErrorCode.InvalidRequest, 'Invalid arguments for summarize_files');
              }
              return await this.handleSummarizeFiles(request.params.arguments);
            case 'summarize_directory':
              if (!isSummarizeDirectoryArgs(request.params.arguments)) {
                throw new McpError(ErrorCode.InvalidRequest, 'Invalid arguments for summarize_directory');
              }
              return await this.handleSummarizeDirectory(request.params.arguments);
            case 'summarize_text':
              if (!isSummarizeTextArgs(request.params.arguments)) {
                throw new McpError(ErrorCode.InvalidRequest, 'Invalid arguments for summarize_text');
              }
              return await this.handleSummarizeText(request.params.arguments);
            case 'get_full_content':
              if (!isGetFullContentArgs(request.params.arguments)) {
                throw new McpError(ErrorCode.InvalidRequest, 'Invalid arguments for get_full_content');
              }
              return await this.handleGetFullContent(request.params.arguments);
            default:
              throw new McpError(
                ErrorCode.MethodNotFound,
                `Unknown tool: ${request.params.name}`
              );
          }
        })();

        return {
          _meta: {},
          ...response,
        };
      } catch (error) {
        if (error instanceof McpError) throw error;
        throw new McpError(
          ErrorCode.InternalError,
          `Error in ${request.params.name}: ${(error as Error).message}`
        );
      }
    });
  }

  private async handleSummarizeCommand(args: SummarizeCommandArgs): Promise<ToolResponse> {
    const { stdout, stderr } = await execa(args.command, {
      shell: true,
      cwd: args.cwd,
    });

    const output = stdout + (stderr ? `\nError: ${stderr}` : '');
    
    if (output.length <= CHAR_THRESHOLD) {
      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    }

    const summary = await this.summarizeWithClaude(output, 'command output');
    const id = this.storeContent(output);

    return {
      content: [
        {
          type: 'text',
          text: `Summary (full content ID: ${id}):\n${summary}`,
        },
      ],
    };
  }

  private async handleSummarizeFiles(args: SummarizeFilesArgs): Promise<ToolResponse> {
    const results = await Promise.all(
      args.paths.map(async (filePath: string) => {
        const content = await fs.readFile(filePath, 'utf-8');
        if (content.length <= CHAR_THRESHOLD) {
          return { path: filePath, content };
        }

        const summary = await this.summarizeWithClaude(
          content,
          `code from ${path.basename(filePath)}`
        );
        const id = this.storeContent(content);
        return { path: filePath, summary, id };
      })
    );

    return {
      content: [
        {
          type: 'text',
          text: results
            .map(
              (result) =>
                `${result.path}:\n${
                  'summary' in result
                    ? `Summary (full content ID: ${result.id}):\n${result.summary}`
                    : result.content
                }\n`
            )
            .join('\n'),
        },
      ],
    };
  }

  private async handleSummarizeDirectory(args: SummarizeDirectoryArgs): Promise<ToolResponse> {
    const listDir = async (dir: string, recursive: boolean): Promise<string> => {
      const items = await fs.readdir(dir, { withFileTypes: true });
      let output = '';

      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory() && recursive) {
          output += `${fullPath}/\n`;
          output += await listDir(fullPath, recursive);
        } else {
          output += `${fullPath}\n`;
        }
      }

      return output;
    };

    const listing = await listDir(args.path, args.recursive ?? false);
    
    if (listing.length <= CHAR_THRESHOLD) {
      return {
        content: [
          {
            type: 'text',
            text: listing,
          },
        ],
      };
    }

    const summary = await this.summarizeWithClaude(listing, 'directory listing');
    const id = this.storeContent(listing);

    return {
      content: [
        {
          type: 'text',
          text: `Summary (full content ID: ${id}):\n${summary}`,
        },
      ],
    };
  }

  private async handleSummarizeText(args: SummarizeTextArgs): Promise<ToolResponse> {
    if (args.content.length <= CHAR_THRESHOLD) {
      return {
        content: [
          {
            type: 'text',
            text: args.content,
          },
        ],
      };
    }

    const summary = await this.summarizeWithClaude(args.content, args.type);
    const id = this.storeContent(args.content);

    return {
      content: [
        {
          type: 'text',
          text: `Summary (full content ID: ${id}):\n${summary}`,
        },
      ],
    };
  }

  private async handleGetFullContent(args: GetFullContentArgs): Promise<ToolResponse> {
    const entry = this.contentCache.get(args.id);
    if (!entry) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Content not found or expired'
      );
    }

    return {
      content: [
        {
          type: 'text',
          text: entry.content,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Summarization MCP server running on stdio');
  }
}

const server = new SummarizationServer();
server.run().catch(console.error);
