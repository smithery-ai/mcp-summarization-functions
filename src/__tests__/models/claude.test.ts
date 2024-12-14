import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { config } from 'dotenv';
import nodeFetch from 'node-fetch';
config();

// Mock fetch with proper types
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock successful response
const mockSuccessResponse = {
  content: [{ text: 'Mocked summary response', type: 'text' }],
  model: 'claude-3-sonnet-20240229',
  role: 'assistant'
};

// Import after mocking
import { ClaudeModel, createClaudeModel } from '../../models/claude';
import { ModelConfig } from '../../types/models';

describe('ClaudeModel', () => {
  const MOCK_API_KEY = 'dummy-key';
  const REAL_API_KEY = process.env.ANTHROPIC_API_KEY || '';
  let model: ClaudeModel;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSuccessResponse
    } as Response);
    model = createClaudeModel() as ClaudeModel;
  });

  describe('Unit Tests', () => {
    describe('initialization', () => {
      it('should initialize with default config values', async () => {
        await model.initialize({ apiKey: MOCK_API_KEY });
      });

      it('should initialize with custom config values', async () => {
        const config = {
          apiKey: MOCK_API_KEY,
          model: 'custom-model',
          maxTokens: 2048
        };
        await model.initialize(config);
      });

      it('should throw error if API key is missing', async () => {
        await expect(model.initialize({} as ModelConfig))
          .rejects.toThrow('API key is required for Claude model');
      });

      it('should validate model name', async () => {
        await expect(
          model.initialize({
            apiKey: MOCK_API_KEY,
            model: '   '
          })
        ).rejects.toThrow('Invalid model name');
      });

      it('should validate max tokens', async () => {
        await expect(
          model.initialize({
            apiKey: MOCK_API_KEY,
            maxTokens: 0
          })
        ).rejects.toThrow('Invalid max tokens value');

        await expect(
          model.initialize({
            apiKey: MOCK_API_KEY,
            maxTokens: -1
          })
        ).rejects.toThrow('Invalid max tokens value');

        // Test non-integer values
        await expect(
          model.initialize({
            apiKey: MOCK_API_KEY,
            maxTokens: 1.5
          })
        ).rejects.toThrow('Invalid max tokens value');
      });
    });

    describe('summarization', () => {
      beforeEach(async () => {
        await model.initialize({ apiKey: MOCK_API_KEY });
      });

      it('should summarize content successfully', async () => {
        const content = 'Test content';
        const type = 'text';
        const expectedPrompt = `Summarize the following ${type} in a clear, concise way that would be useful for an AI agent. Focus on the most important information and maintain technical accuracy:

${content}

Summary:`;

        const summary = await model.summarize(content, type);

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.anthropic.com/v1/messages',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01',
              'x-api-key': MOCK_API_KEY
            },
            body: JSON.stringify({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 1024,
              messages: [
                {
                  role: 'user',
                  content: expectedPrompt
                }
              ]
            })
          }
        );
        expect(summary).toBe('Mocked summary response');
      });

      it('should throw error if model is not initialized', async () => {
        const uninitializedModel = createClaudeModel();
        await expect(
          uninitializedModel.summarize('content', 'text')
        ).rejects.toThrow('Claude model not initialized');
      });

      it('should handle API errors', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 400,
          json: async () => ({
            error: { message: 'API error' }
          })
        } as Response);

        await expect(
          model.summarize('content', 'text')
        ).rejects.toThrow('Claude summarization failed: API error');
      });

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        await expect(
          model.summarize('content', 'text')
        ).rejects.toThrow('Claude summarization failed: Network error');
      });

      it('should handle unexpected response format', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ content: [] })
        } as Response);

        await expect(
          model.summarize('content', 'text')
        ).rejects.toThrow('Unexpected response format from Claude');
      });
    });

    describe('cleanup', () => {
      it('should clean up resources', async () => {
        await model.initialize({ apiKey: MOCK_API_KEY });
        await model.cleanup();

        await expect(
          model.summarize('content', 'text')
        ).rejects.toThrow('Claude model not initialized');
      });
    });

    describe('factory function', () => {
      it('should create a new instance', () => {
        const instance = createClaudeModel();
        expect(instance).toBeInstanceOf(ClaudeModel);
      });
    });
  });

  describe('Integration Tests', () => {
    // Only run integration tests if we have a real API key
    (REAL_API_KEY ? describe : describe.skip)('with real API', () => {
      beforeEach(async () => {
        // Use node-fetch for integration tests
        global.fetch = nodeFetch as unknown as typeof fetch;
        model = createClaudeModel() as ClaudeModel;
        await model.initialize({ apiKey: REAL_API_KEY });
      });

      afterEach(() => {
        // Restore mock
        global.fetch = mockFetch as unknown as typeof fetch;
      });

      it('should summarize content with real API', async () => {
        const content = 'This is a test content that needs to be summarized.';
        const summary = await model.summarize(content, 'text');
        expect(summary).toBeTruthy();
        expect(typeof summary).toBe('string');
      }, 10000); // Increase timeout for API call
    });
  });
});