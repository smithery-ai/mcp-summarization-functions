import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ClaudeModel, createClaudeModel } from '../../models/claude';
import { ModelConfig } from '../../types/models';
import Anthropic from '@anthropic-ai/sdk';

type MockAnthropicResponse = {
  content: Array<{ text?: string; unexpected?: string }>;
};

// Mock Anthropic SDK
const mockCreate = jest.fn();
const mockAnthropicConstructor = jest.fn(() => ({
  messages: { create: mockCreate }
}));

jest.mock('@anthropic-ai/sdk', () => ({
		__esModule: true,
		default: mockAnthropicConstructor
}));

describe('ClaudeModel', () => {
  let model: ClaudeModel;
  let mockCreate: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Set up mock instance
    mockCreate = jest.fn();
    mockCreate.mockResolvedValue({
      content: [{ text: 'Mocked summary response' }]
    } as MockAnthropicResponse);
    
    // Set up constructor mock

    model = createClaudeModel() as ClaudeModel;
  });

  describe('initialization', () => {
    it('should initialize with default config values', async () => {
      await model.initialize({ apiKey: 'test-key' });
      
      expect(Anthropic).toHaveBeenCalledWith({
        apiKey: 'test-key'
      });
    });

    it('should initialize with custom config values', async () => {
      await model.initialize({
        apiKey: 'test-key',
        model: 'custom-model',
        maxTokens: 2048
      });

      expect(Anthropic).toHaveBeenCalledWith({
        apiKey: 'test-key'
      });
    });

    it('should throw error if API key is missing', async () => {
      // Using Partial<ModelConfig> to create an empty object that matches the type
      await expect(model.initialize({} as Partial<ModelConfig> as ModelConfig))
								.rejects.toThrow('API key is required');
    });

    it('should validate model name', async () => {
      await expect(model.initialize({
        apiKey: 'test-key',
        model: '   ' // Empty string with whitespace
						})).rejects.toThrow('Invalid model name');
    });

    it('should validate max tokens', async () => {
      await expect(model.initialize({
        apiKey: 'test-key',
        maxTokens: 0
      })).rejects.toThrow('Invalid max tokens value');

      await expect(model.initialize({
        apiKey: 'test-key',
        maxTokens: -1
      })).rejects.toThrow('Invalid max tokens value');
    });
  });

  describe('summarization', () => {
    beforeEach(async () => {
      await model.initialize({ apiKey: 'test-key' });
    });

    it('should summarize content successfully', async () => {
      const content = 'Test content';
      const type = 'text';

      const summary = await model.summarize(content, type);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: expect.stringContaining(content)
          }
        ]
      });
      expect(summary).toBe('Mocked summary response');
    });

    it('should throw error if model is not initialized', async () => {
      const uninitializedModel = createClaudeModel();
      await expect(uninitializedModel.summarize('content', 'text'))
        .rejects.toThrow('Claude model not initialized');
    });

    it('should handle API errors', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API error'));

      await expect(model.summarize('content', 'text'))
        .rejects.toThrow('Claude summarization failed: API error');
    });

    it('should handle unexpected response format', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ unexpected: 'format' }]
      } as MockAnthropicResponse);

      await expect(model.summarize('content', 'text'))
        .rejects.toThrow('Unexpected response format from Claude');
    });
  });

  describe('cleanup', () => {
    it('should clean up resources', async () => {
      await model.initialize({ apiKey: 'test-key' });
      await model.cleanup();

      // Should throw after cleanup since model is uninitialized
      await expect(model.summarize('content', 'text'))
        .rejects.toThrow('Claude model not initialized');
    });
  });

  describe('factory function', () => {
    it('should create a new instance', () => {
      const model = createClaudeModel();
      expect(model).toBeInstanceOf(ClaudeModel);
    });
  });
});