import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { McpServer } from '../../server/mcp-server';
import { SummarizationService } from '../../services/summarization';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { execa } from 'execa';
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
const mockExeca = jest.fn();
jest.mock('execa', () => ({
		__esModule: true,
		default: mockExeca
}));
jest.mock('fs/promises', () => ({
		readFile: jest.fn(),
		readdir: jest.fn()
}));
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');

// Type the mocked functions
const mockedReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
const mockedReaddir = fs.readdir as jest.MockedFunction<typeof fs.readdir>;

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
    mockExeca.mockImplementation(() => ({
      stdout: '',
      stderr: ''
    }));

    mockedReadFile.mockResolvedValue('');
    mockedReaddir.mockResolvedValue([]);
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
      (execa as jest.Mock).mockImplementation(() => ({
        stdout: 'command output',
        stderr: ''
      }));
    });

    it('should execute and summarize command output', async () => {
      const response = await callToolHandler({
        params: {
          name: 'summarize_command',
          arguments: {
            command: 'test command',
            cwd: '/test/path'
          }
        }
      }) as ToolResponse;

      expect(execa).toHaveBeenCalledWith('test command', {
        shell: true,
        cwd: '/test/path'
      });
      expect(response.content[0].text).toContain('command output');
    });

    it('should include stderr in output if present', async () => {
      (execa as jest.Mock).mockImplementation(() => ({
        stdout: 'stdout',
        stderr: 'error occurred'
      }));

      const response = await callToolHandler({
        params: {
          name: 'summarize_command',
          arguments: { command: 'test' }
        }
      }) as ToolResponse;

      expect(response.content[0].text).toContain('Error: error occurred');
    });
  });

  describe('summarize_files', () => {
    beforeEach(() => {
      mockedReadFile.mockResolvedValue('file content');
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

      expect(fs.readFile).toHaveBeenCalledWith('test.txt', 'utf-8');
      expect(response.content[0].text).toContain('test.txt');
    });
  });

  describe('summarize_directory', () => {
    beforeEach(() => {
      mockedReaddir.mockResolvedValue([
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

      expect(fs.readdir).toHaveBeenCalled();
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
      })).rejects.toThrow('Missing tool name');
    });

    it('should handle missing arguments', async () => {
      await expect(callToolHandler({
        params: {
          name: 'summarize_text'
        }
      })).rejects.toThrow('Missing arguments');
    });

    it('should handle unknown tool', async () => {
      await expect(callToolHandler({
        params: {
          name: 'unknown_tool',
          arguments: {}
        }
      })).rejects.toThrow('Unknown tool');
    });

    it('should handle invalid arguments', async () => {
      await expect(callToolHandler({
        params: {
          name: 'summarize_text',
          arguments: {
            invalid: 'args'
          }
        }
      })).rejects.toThrow('Invalid arguments');
    });
  });
});