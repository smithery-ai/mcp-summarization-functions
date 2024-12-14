import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { McpServer } from '../../server/mcp-server';
import { SummarizationService } from '../../services/summarization';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { execa } from 'execa';

// Mock type for test purposes - only include properties we actually use
interface MockExecaResult {
		stdout: string;
		stderr: string;
		command?: string;
		exitCode?: number;
}

import * as fs from 'fs/promises';
import { Dirent } from 'fs';

// Helper function to create mock Dirent objects
function createMockDirent(name: string, isDir: boolean): Dirent {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false
  } as Dirent;
}
import { SummarizationModel, ModelConfig } from '../../types/models';

// Mock dependencies
jest.mock('execa');
jest.mock('fs/promises');
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');

// Create mock functions with proper types
const mockExeca = jest.mocked(execa);
const mockReadFile = jest.fn<typeof fs.readFile>();
const mockReaddir = jest.fn<typeof fs.readdir>();

// Setup fs/promises mock
jest.mock('fs/promises', () => ({
  readFile: mockReadFile,
		readdir: mockReaddir,
		__esModule: true
}));


jest.mock('@modelcontextprotocol/sdk/server/stdio.js');

// Define response types
interface ToolResponse {
  content: Array<{ type: string; text: string }>;
}

interface ToolSchema {
  type: string;
  properties: {
    [key: string]: {
      type: string;
      description: string;
    };
  };
  required?: string[];
}

interface ListToolsResponse {
  tools: Array<{
    name: string;
    description: string;
    inputSchema: ToolSchema;
  }>;
}

// Mock model for testing
class MockModel implements SummarizationModel {
  async initialize(config: ModelConfig): Promise<void> {}
  async summarize(content: string, type: string): Promise<string> {
    return `Summarized ${type}`;
  }
  async cleanup(): Promise<void> {}
}

describe('McpServer', () => {
  let server: McpServer;
  let summarizationService: SummarizationService;
  let listToolsHandler: jest.Mock;
  let callToolHandler: jest.Mock;

  beforeEach(() => {
    const mockModel = new MockModel();
    summarizationService = new SummarizationService(mockModel, {
      model: { apiKey: 'test-key' },
      charThreshold: 100,
      cacheMaxAge: 1000
    });
    server = new McpServer(summarizationService);

    // Capture handlers during initialization
    const originalSetHandler = server['server'].setRequestHandler;
    server['server'].setRequestHandler = jest.fn((schema: any, handler: any) => {
      if (schema.method === 'list_tools') {
        listToolsHandler = handler;
      } else if (schema.method === 'call_tool') {
        callToolHandler = handler;
      }
      return originalSetHandler.call(server['server'], schema, handler);
    });

    // Initialize server to set up handlers
    server['setupToolHandlers']();

    // Set up mock implementations
    const defaultMockResult: ExecaResult<string> = {
      command: '',
      exitCode: 0,
      stdout: '',
      stderr: '',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false,
      signal: undefined,
      signalDescription: undefined,
      stdio: [undefined, undefined, undefined],
      cwd: process.cwd(),
      escapedCommand: '',
      pipedFrom: undefined,
      ipcOutput: undefined,
      all: undefined
    };
    mockExeca.mockResolvedValue(defaultMockResult);

    mockReadFile.mockResolvedValue('');
    mockReaddir.mockResolvedValue([]);
  });

  afterEach(async () => {
    await server.cleanup();
    jest.clearAllMocks();
  });

  describe('tool registration', () => {
    it('should register all tools', async () => {
      const response = await listToolsHandler({}) as ListToolsResponse;

      const toolNames = response.tools.map(t => t.name);
      expect(toolNames).toEqual([
        'summarize_command',
        'summarize_files',
        'summarize_directory',
        'summarize_text',
        'get_full_content'
      ]);
    });
  });

  describe('summarize_command', () => {
    beforeEach(() => {
      (execa as unknown as jest.Mock).mockImplementation(() => ({
        stdout: 'command output',
        stderr: ''
      }));
    });

    it('should execute and summarize command output', async () => {
      const commandMockResult: MockExecaResult = {
        stdout: 'command output',
        stderr: '',
        command: 'test command',
        exitCode: 0
      };
      mockExeca.mockResolvedValue(commandMockResult);

      const response = await callToolHandler({
        params: {
          name: 'summarize_command',
										arguments: {
            command: 'test command',
            cwd: '/test/path'
          }
        }
      }) as ToolResponse;

      expect(mockExeca).toHaveBeenCalledWith('test command', {
        shell: true,
        cwd: '/test/path'
      });
      expect(response.content[0].text).toBe('command output');
    });

    it('should include stderr in output if present', async () => {
      mockExeca.mockResolvedValue({
        stdout: 'stdout',
        stderr: 'error occurred',
        failed: false,
        killed: false,
        command: 'test',
        exitCode: 0,
        timedOut: false,
        isCanceled: false,
        signalDescription: null,
        signal: null
      });

      const response = await callToolHandler({
        params: {
          name: 'summarize_command',
          arguments: { command: 'test' }
        }
      }) as ToolResponse;

      expect(response.content[0].text).toBe('stdout\nError: error occurred');
    });

    it('should handle command execution errors', async () => {
      mockExeca.mockRejectedValue(new Error('Command failed'));

      await expect(callToolHandler({
        params: {
          name: 'summarize_command',
          arguments: { command: 'test' }
        }
      })).rejects.toThrow(new McpError(ErrorCode.InternalError, 'Error in summarize_command: Command failed'));
    });
  });

  describe('summarize_files', () => {
    beforeEach(() => {
      mockReadFile.mockResolvedValue('file content');
    });

    it('should summarize file contents', async () => {
      const response = await callToolHandler({
        params: {
          name: 'summarize_files',
          arguments: {
            paths: ['test.txt']
          }
        }
      }) as ToolResponse;

      expect(mockReadFile).toHaveBeenCalled();
      expect(response.content[0].text).toContain('test.txt');
    });
  });

  describe('summarize_directory', () => {
    beforeEach(() => {
      mockReaddir.mockResolvedValue([
        createMockDirent('file.txt', false),
        createMockDirent('dir', true)
      ]);
    });

    it('should list directory contents', async () => {
      const response = await callToolHandler({
        params: {
          name: 'summarize_directory',
          arguments: {
            path: '/test',
            recursive: false
          }
        }
      }) as ToolResponse;

      expect(mockReaddir).toHaveBeenCalled();
      expect(response.content[0].text).toContain('file.txt');
      expect(response.content[0].text).toContain('dir');
    });
  });

  describe('summarize_text', () => {
    it('should summarize text content', async () => {
      const longContent = 'A'.repeat(150);
      const response = await callToolHandler({
        params: {
          name: 'summarize_text',
          arguments: {
            content: longContent,
            type: 'test content'
          }
        }
      }) as ToolResponse;

      expect(response.content[0].text).toContain('Summarized test content');
    });

    it('should return original text if short', async () => {
      const response = await callToolHandler({
        params: {
          name: 'summarize_text',
          arguments: {
            content: 'short text',
            type: 'test'
          }
        }
      }) as ToolResponse;

      expect(response.content[0].text).toBe('short text');
    });
  });

  describe('get_full_content', () => {
    let contentId: string;

    beforeEach(async () => {
      // First summarize something to get an ID
      const longContent = 'A'.repeat(150);
      const summaryResponse = await callToolHandler({
        params: {
          name: 'summarize_text',
          arguments: {
            content: longContent,
            type: 'test'
          }
        }
      }) as ToolResponse;
      contentId = summaryResponse.content[0].text.match(/ID: ([^)]+)/)?.[1] || '';
    });

    it('should retrieve full content by ID', async () => {
      const response = await callToolHandler({
        params: {
          name: 'get_full_content',
          arguments: { id: contentId }
        }
      }) as ToolResponse;

      expect(response.content[0].text).toBeDefined();
    });

    it('should throw error for invalid ID', async () => {
      await expect(callToolHandler({
        params: {
          name: 'get_full_content',
          arguments: { id: 'invalid-id' }
        }
      })).rejects.toThrow('Content not found or expired');
    });
  });

  describe('error handling', () => {
    it('should handle missing tool name', async () => {
      await expect(callToolHandler({
        params: {
          arguments: {}
        }
      })).rejects.toThrow(new McpError(ErrorCode.InvalidRequest, 'Missing tool name'));
    });

    it('should handle missing arguments', async () => {
      await expect(callToolHandler({
        params: {
          name: 'summarize_text'
        }
      })).rejects.toThrow(new McpError(ErrorCode.InvalidRequest, 'Missing arguments'));
    });

    it('should handle unknown tool', async () => {
      await expect(callToolHandler({
        params: {
          name: 'unknown_tool',
          arguments: {}
        }
      })).rejects.toThrow(new McpError(ErrorCode.MethodNotFound, 'Unknown tool: unknown_tool'));
    });

    it('should handle invalid arguments for summarize_text', async () => {
      await expect(callToolHandler({
        params: {
          name: 'summarize_text',
          arguments: {
            invalid: 'args'
          }
        }
      })).rejects.toThrow(new McpError(ErrorCode.InvalidRequest, 'Invalid arguments for summarize_text'));
    });

    it('should handle invalid arguments for summarize_command', async () => {
      await expect(callToolHandler({
        params: {
          name: 'summarize_command',
          arguments: {
            invalid: 'args'
          }
        }
      })).rejects.toThrow(new McpError(ErrorCode.InvalidRequest, 'Invalid arguments for summarize_command'));
    });

    it('should handle invalid arguments for summarize_files', async () => {
      await expect(callToolHandler({
        params: {
          name: 'summarize_files',
          arguments: {
            invalid: 'args'
          }
        }
      })).rejects.toThrow(new McpError(ErrorCode.InvalidRequest, 'Invalid arguments for summarize_files'));
    });

    it('should handle invalid arguments for summarize_directory', async () => {
      await expect(callToolHandler({
        params: {
          name: 'summarize_directory',
          arguments: {
            invalid: 'args'
          }
        }
      })).rejects.toThrow(new McpError(ErrorCode.InvalidRequest, 'Invalid arguments for summarize_directory'));
    });

    it('should handle invalid arguments for get_full_content', async () => {
      await expect(callToolHandler({
        params: {
          name: 'get_full_content',
          arguments: {
            invalid: 'args'
          }
        }
      })).rejects.toThrow(new McpError(ErrorCode.InvalidRequest, 'Invalid arguments for get_full_content'));
    });
  });
});