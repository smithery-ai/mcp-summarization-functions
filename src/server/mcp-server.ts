import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { execa } from 'execa';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SummarizationService } from '../services/summarization.js';

// Type definitions for tool arguments
interface SummarizeCommandArgs {
  command: string;
  cwd?: string;
  hint?: string;
  output_format?: string;
}

interface SummarizeFilesArgs {
  paths: string[];
  cwd: string;
  hint?: string;
  output_format?: string;
}

interface SummarizeDirectoryArgs {
  path: string;
  cwd: string;
  recursive?: boolean;
  hint?: string;
  output_format?: string;
}

interface SummarizeTextArgs {
  content: string;
  type: string;
  hint?: string;
  output_format?: string;
}

interface GetFullContentArgs {
  id: string;
}

// Type guards
function isValidFormatParams(args: any): boolean {
  if ('hint' in args && typeof args.hint !== 'string') return false;
		if ('output_format' in args && typeof args.output_format !== 'string') return false;
		return true;
}

function isSummarizeCommandArgs(args: unknown): args is SummarizeCommandArgs {
		return typeof args === 'object' && args !== null &&
				'command' in args && typeof (args as any).command === 'string' &&
    isValidFormatParams(args);
}

function isSummarizeFilesArgs(args: unknown): args is SummarizeFilesArgs {
  return typeof args === 'object' && args !== null &&
    'paths' in args && Array.isArray((args as any).paths) &&
    'cwd' in args && typeof (args as any).cwd === 'string' &&
    isValidFormatParams(args);
}

function isSummarizeDirectoryArgs(args: unknown): args is SummarizeDirectoryArgs {
		return typeof args === 'object' && args !== null &&
				'path' in args && typeof (args as any).path === 'string' &&
				'cwd' in args && typeof (args as any).cwd === 'string' &&
				(!('recursive' in args) || typeof (args as any).recursive === 'boolean') &&
				isValidFormatParams(args);
}

function isSummarizeTextArgs(args: unknown): args is SummarizeTextArgs {
		return typeof args === 'object' && args !== null &&
				'content' in args && typeof (args as any).content === 'string' &&
				'type' in args && typeof (args as any).type === 'string' &&
				isValidFormatParams(args);
}

function isGetFullContentArgs(args: unknown): args is GetFullContentArgs {
  return typeof args === 'object' && args !== null && 'id' in args && typeof (args as any).id === 'string';
}

const directioriesIgnore = [
  "node_modules",
  "build",
  "dist",
  "coverage",
  ".git",
  ".idea",
  ".vscode",
  "out",
  "public",
  "tmp",
  "temp",
  "vendor",
  "logs"
]

export class McpServer {
  private server: Server;
  private summarizationService: SummarizationService;
  private workingDirectory: string;

  constructor(summarizationService: SummarizationService) {
    // Get working directory from MCP_WORKING_DIR environment variable
    this.workingDirectory = process.env.MCP_WORKING_DIR || '/';
    if (this.workingDirectory === '/') {
      console.error('Warning: MCP_WORKING_DIR not set, using root directory');
    }
    console.error('Working directory:', this.workingDirectory);
    this.summarizationService = summarizationService;

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

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error: Error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    const formatParameters = {
      hint: {
        type: 'string',
        description: 'Focus area for summarization (e.g., "security_analysis", "api_surface", "error_handling", "dependencies", "type_definitions")',
        enum: ['security_analysis', 'api_surface', 'error_handling', 'dependencies', 'type_definitions']
      },
      output_format: {
        type: 'string',
        description: 'Desired output format (e.g., "text", "json", "markdown", "outline")',
        enum: ['text', 'json', 'markdown', 'outline'],
        default: 'text'
      }
    };
    
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
              ...formatParameters
            },
            required: ['command', 'cwd'],
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
                description: 'Array of file paths to summarize (relative to cwd)',
              },
              cwd: {
                type: 'string',
                description: 'Working directory for resolving file paths',
              },
              ...formatParameters
            },
            required: ['paths', 'cwd'],
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
                description: 'Directory path to summarize (relative to cwd)',
              },
              cwd: {
                type: 'string',
                description: 'Working directory for resolving directory path',
              },
              recursive: {
                type: 'boolean',
                description: 'Whether to include subdirectories',
              },
              ...formatParameters
            },
            required: ['path', 'cwd'],
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
              ...formatParameters
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

  private async handleSummarizeCommand(args: SummarizeCommandArgs) {
    const { stdout, stderr } = await execa(args.command, {
      shell: true,
      cwd: args.cwd,
    });

    const output = stdout + (stderr ? `\nError: ${stderr}` : '');
    const result = await this.summarizationService.maybeSummarize(output, 'command output', {
      hint: args.hint,
      output_format: args.output_format
    });

    return {
      content: [
        {
          type: 'text',
          text: result.isSummarized
            ? `Summary (full content ID: ${result.id}):\n${result.text}`
            : result.text,
        },
      ],
    };
  }

  private async handleSummarizeFiles(args: SummarizeFilesArgs) {
    try {
      const results = await Promise.all(
        args.paths.map(async (filePath: string) => {
          try {
            const resolvedPath = await this.parsePath(filePath, args.cwd || this.workingDirectory, 'summarize_files');
            const content = await fs.readFile(resolvedPath, 'utf-8');
            const result = await this.summarizationService.maybeSummarize(
              content,
              `code from ${path.basename(filePath)}`,
              {
                hint: args.hint,
                output_format: args.output_format
              }
            );
            return { path: filePath, ...result };
          } catch (error) {
            throw new McpError(
              ErrorCode.InternalError,
              `Error in summarize_files: ${(error as Error).message}`
            );
          }
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
                    result.isSummarized
                      ? `Summary (full content ID: ${result.id}):\n${result.text}`
                      : result.text
                  }\n`
              )
              .join('\n'),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Error in summarize_files: ${(error as Error).message}`
      );
    }
  }
  
  private async parsePath(filePath: string, cwd: string, toolName: string): Promise<string> {
    // Always treat paths as relative to the provided working directory
    const resolvedPath = path.join(cwd, filePath);
    
    try {
      // Check if path exists and is accessible
      const stats = await fs.stat(resolvedPath);
      return resolvedPath;
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Error in ${toolName}: Path not found: ${filePath} (resolved to ${resolvedPath})`
      );
    }
  }
  
  private async handleSummarizeDirectory(args: SummarizeDirectoryArgs) {
    try {
      const MAX_DEPTH = 5; // Maximum directory depth
      const MAX_FILES = 1000; // Maximum number of files to process
      const MAX_FILES_PER_DIR = 100; // Maximum files to show per directory
  
      const resolvedPath = await this.parsePath(args.path, args.cwd || this.workingDirectory, 'summarize_directory');
      let totalFiles = 0;
      let truncated = false;
  
      const listDir = async (dir: string, recursive: boolean, depth: number = 0): Promise<string> => {
        try {
          if (depth >= MAX_DEPTH) {
            return `[Directory depth limit (${MAX_DEPTH}) reached]\n`;
          }
  
          const items = await fs.readdir(dir, { withFileTypes: true });
          let output = '';
          let fileCount = 0;
  
          // Sort items to show directories first
          const sortedItems = items.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.name.localeCompare(b.name);
          });
  
          for (const item of sortedItems) {
            if (totalFiles >= MAX_FILES) {
              truncated = true;
              break;
            }
  
            const fullPath = path.join(dir, item.name);
            const relativePath = path.relative(resolvedPath, fullPath);
  
            if (item.isDirectory()) {
              output += `${relativePath}/\n`;
              if (directioriesIgnore.includes(item.name)) {
                output += `[${item.name}/ contents skipped]\n`;
                continue;
              }
              if (recursive) {
                output += await listDir(fullPath, recursive, depth + 1);
              }
            } else {
              if (fileCount >= MAX_FILES_PER_DIR) {
                if (fileCount === MAX_FILES_PER_DIR) {
                  output += `[${items.length - fileCount} more files in this directory]\n`;
                }
                continue;
              }
              output += `${relativePath}\n`;
              fileCount++;
              totalFiles++;
            }
          }
  
          return output;
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `Error in summarize_directory: ${(error as Error).message}`
          );
        }
      };
  
      let listing = await listDir(resolvedPath, args.recursive ?? false);
      if (truncated) {
        listing += `\n[Output truncated: Reached maximum file limit of ${MAX_FILES}]\n`;
      }
  
      // Always force summarization for directory listings
      const result = await this.summarizationService.maybeSummarize(
        listing,
        'directory listing',
        {
          hint: args.hint,
          output_format: args.output_format
        }
      );
  
      return {
        content: [
          {
            type: 'text',
            text: `Summary (full content ID: ${result.id}):\n${result.text}`,
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Error in summarize_directory: ${(error as Error).message}`
      );
    }
  }

  private async handleSummarizeText(args: SummarizeTextArgs) {
    const result = await this.summarizationService.maybeSummarize(args.content, args.type, {
      hint: args.hint,
      output_format: args.output_format
    });

    return {
      content: [
        {
          type: 'text',
          text: result.isSummarized
            ? `Summary (full content ID: ${result.id}):\n${result.text}`
            : result.text,
        }
      ],
    };
  }

  private async handleGetFullContent(args: GetFullContentArgs) {
    const content = this.summarizationService.getFullContent(args.id);
    if (!content) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Content not found or expired'
      );
    }

    return {
      content: [
        {
          type: 'text',
          text: content,
        },
      ],
    };
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Summarization MCP server running on stdio');
  }

  async cleanup(): Promise<void> {
    await this.summarizationService.cleanup();
    await this.server.close();
  }
}