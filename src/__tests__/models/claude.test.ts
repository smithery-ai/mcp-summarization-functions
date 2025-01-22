import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { config } from 'dotenv';
//import nodeFetch from 'node-fetch';
import nodeFetch from 'isomorphic-fetch';
config();

// Mock fetch with proper types
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock successful response
const mockSuccessResponse = {
  content: [{ text: 'Mocked summary response', type: 'text' }],
  model: 'claude-3-5-sonnet-20241022',
  role: 'assistant'
};

// Import after mocking
import { AnthropicModel, createAnthropicModel } from '../../models/anthropic.js';
import { ModelConfig, SummarizationOptions } from '../../types/models.js';
import { constructPrompt, getBaseSummarizationInstructions, getFinalInstructions } from '../../models/prompts.js';

describe('AnthropicModel', () => {
  const MOCK_API_KEY = 'dummy-key';
  const REAL_API_KEY = process.env.ANTHROPIC_API_KEY || '';
  if (!REAL_API_KEY) {
    throw new Error('API key is required for integration tests');
  }
  let model: AnthropicModel;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSuccessResponse
    } as Response);
    model = createAnthropicModel() as AnthropicModel;
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
          .rejects.toThrow('API key is required for Anthropic model');
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
        const expectedPrompt = [
          getBaseSummarizationInstructions(type),
          ...getFinalInstructions(),
          content,
          'Summary:'
        ].join('\n\n');

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
              model: 'claude-3-5-haiku-20241022',
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
        const uninitializedModel = createAnthropicModel();
        await expect(
          uninitializedModel.summarize('content', 'text')
        ).rejects.toThrow('Anthropic model not initialized');
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
        ).rejects.toThrow('Anthropic summarization failed: API error');
      });

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        await expect(
          model.summarize('content', 'text')
        ).rejects.toThrow('Anthropic summarization failed: Network error');
      });

      it('should handle unexpected response format', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ content: [] })
        } as Response);

        await expect(
          model.summarize('content', 'text')
        ).rejects.toThrow('Unexpected response format from Anthropic');
      });
    });

    describe('cleanup', () => {
      it('should clean up resources', async () => {
        await model.initialize({ apiKey: MOCK_API_KEY });
        await model.cleanup();

        await expect(
          model.summarize('content', 'text')
        ).rejects.toThrow('Anthropic model not initialized');
      });
    });

    describe('factory function', () => {
      it('should create a new instance', () => {
        const instance = createAnthropicModel();
        expect(instance).toBeInstanceOf(AnthropicModel);
      });
    });
  });

  describe('Integration Tests', () => {
    // Only run integration tests if we have a real API key
    (REAL_API_KEY ? describe : describe.skip)('with real API', () => {
      beforeEach(async () => {
        // Use node-fetch for integration tests
        global.fetch = nodeFetch as unknown as typeof fetch;
        model = createAnthropicModel() as AnthropicModel;
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

      it('should summarize with hint and output format using real API', async () => {
        const content = `
          function authenticate(user, password) {
            if (password === 'admin123') {
              return true;
            }
            return false;
          }
        `;
        const options: SummarizationOptions = {
          hint: 'security_analysis',
          output_format: 'json'
        };
        const summary = await model.summarize(content, 'code', options);
        expect(summary).toBeTruthy();
        expect(typeof summary).toBe('string');
        // Should be valid JSON since we requested JSON format
        expect(() => JSON.parse(summary)).not.toThrow();
      }, 10000); // Increase timeout for API call
    });
  });
});