import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { McpServer } from '../../server/mcp-server.js';
import { SummarizationService } from '../../services/summarization.js';
import { ErrorCode, McpError, ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { SummarizationModel } from '../../types/models.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import path from 'path';

// Simple mock model for testing
class MockModel implements SummarizationModel {
  async initialize(): Promise<void> {}
  async summarize(content: string, type: string): Promise<string> {
    // For directory listings, return the actual content
    if (type === 'directory listing') {
      return content;
    }
    return `Summarized ${type}`;
  }
  async cleanup(): Promise<void> {}
}

describe('McpServer', () => {
  let server: McpServer;
  let summarizationService: SummarizationService;
  let mockServer: {
    handlers: Map<string, Function>;
    setRequestHandler: (schema: any, handler: Function) => void;
  };

  beforeEach(async () => {
    // Setup mock server
    mockServer = {
      handlers: new Map(),
      setRequestHandler: function(schema: any, handler: Function) {
        const method = schema === ListToolsRequestSchema ? 'list_tools' : 
                      schema === CallToolRequestSchema ? 'call_tool' : 
                      'unknown';
        this.handlers.set(method, handler);
      }
    };

    // Mock Server constructor
    jest.spyOn(Server.prototype, 'setRequestHandler')
      .mockImplementation((schema, handler) => mockServer.setRequestHandler(schema, handler));
    
    jest.spyOn(Server.prototype, 'connect').mockResolvedValue();
    jest.spyOn(Server.prototype, 'close').mockResolvedValue();

    // Create services
    summarizationService = new SummarizationService(new MockModel(), {
      model: { apiKey: 'test-key' },
      charThreshold: 100,
      cacheMaxAge: 1000
    });

    server = new McpServer(summarizationService);
    await server.start(); // This will register the handlers
  });

  afterEach(async () => {
    await server.cleanup();
  });

  const getHandler = (name: string): Function => {
    const handler = mockServer.handlers.get(name);
    if (!handler) {
      throw new Error(`Handler not found: ${name}`);
    }
    return handler;
  };

  describe('Tool Registration', () => {
    it('should register all tools on server initialization', async () => {
      const response = await getHandler('list_tools')({ method: 'list_tools' }, {});

      expect(response.tools).toHaveLength(5);
      expect(response.tools.map((t: { name: string }) => t.name)).toEqual([
        'summarize_command',
        'summarize_files',
        'summarize_directory',
        'summarize_text',
        'get_full_content'
      ]);
    });
  });

  describe('Tool Execution', () => {
    const callTool = async (name: string, args: any) => {
      return getHandler('call_tool')({
        method: 'call_tool',
        params: { name, arguments: args }
      }, {});
    };

    describe('summarize_command', () => {
      it('should execute and return command output', async () => {
        const response = await callTool('summarize_command', { 
          command: 'echo "Hello, World!"'
        });
        
        expect(response.content[0].text).toBe('Hello, World!');
      });

      it('should include stderr in output when present', async () => {
        const response = await callTool('summarize_command', { 
          command: 'echo "output" && echo "error" >&2'
        });
        
        expect(response.content[0].text).toBe('output\nError: error');
      });
    });

    describe('summarize_files', () => {
      const testFilesDir = path.join(process.cwd(), 'src', '__tests__', 'test-files');

      it('should read and return file contents', async () => {
        const response = await callTool('summarize_files', { 
          paths: [path.join(testFilesDir, 'test1.txt')] 
        });
        
        expect(response.content[0].text).toContain('This is test file 1');
      });

      it('should handle multiple files', async () => {
        const response = await callTool('summarize_files', { 
          paths: [
            path.join(testFilesDir, 'test1.txt'),
            path.join(testFilesDir, 'test2.txt')
          ] 
        });
        
        expect(response.content[0].text).toContain('This is test file 1');
        expect(response.content[0].text).toContain('This is test file 2');
      });
    });

    describe('summarize_directory', () => {
      const testFilesDir = path.join(process.cwd(), 'src', '__tests__', 'test-files');

      it('should list directory contents', async () => {
        const response = await callTool('summarize_directory', { 
          path: testFilesDir 
        });
        
        // Check for the presence of both test files in the output
        const text = response.content[0].text;
        expect(text).toContain('test1.txt');
        expect(text).toContain('test2.txt');
        // Verify it's a proper directory listing
        expect(text).toMatch(/Summary \(full content ID: [\w-]+\):/);
      });
    });

    describe('summarize_text', () => {
      it('should summarize long text', async () => {
        const longText = 'a'.repeat(200);
        const response = await callTool('summarize_text', { 
          content: longText, 
          type: 'test' 
        });
        
        expect(response.content[0].text).toContain('Summarized test');
      });

      it('should return original text if short', async () => {
        const shortText = 'short text';
        const response = await callTool('summarize_text', {
          content: shortText,
          type: 'test'
        });
        
        expect(response.content[0].text).toBe(shortText);
      });
    });

    describe('get_full_content', () => {
      it('should throw error for invalid ID', async () => {
        await expect(callTool('get_full_content', { 
          id: 'invalid' 
        })).rejects.toThrow('Content not found or expired');
      });
    });
  });

  describe('Error Handling', () => {
    const callTool = async (name: string, args: any) => {
      return getHandler('call_tool')({
        method: 'call_tool',
        params: { name, arguments: args }
      }, {});
    };

    it('should handle missing tool name', async () => {
      await expect(getHandler('call_tool')({
        method: 'call_tool',
        params: { arguments: {} }
      }, {})).rejects.toThrow('Missing tool name');
    });

    it('should handle missing arguments', async () => {
      await expect(getHandler('call_tool')({
        method: 'call_tool',
        params: { name: 'summarize_text' }
      }, {})).rejects.toThrow('Missing arguments');
    });

    it('should handle unknown tool', async () => {
      await expect(callTool('unknown_tool', {}))
        .rejects.toThrow('Unknown tool: unknown_tool');
    });

    it('should handle invalid arguments', async () => {
      await expect(callTool('summarize_text', { invalid: 'args' }))
        .rejects.toThrow('Invalid arguments for summarize_text');
    });

    it('should handle command execution errors', async () => {
      await expect(callTool('summarize_command', { 
        command: 'nonexistentcommand' 
      })).rejects.toThrow('Error in summarize_command');
    });

    it('should handle file read errors', async () => {
      await expect(callTool('summarize_files', { 
        paths: ['nonexistent.txt'] 
      })).rejects.toThrow('Error in summarize_files');
    });
  });
});