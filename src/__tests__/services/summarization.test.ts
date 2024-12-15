import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SummarizationService } from '../../services/summarization.js';
import { SummarizationModel, ModelConfig } from '../../types/models.js';

class MockModel implements SummarizationModel {
  private initialized = false;
  private shouldFail: boolean;

  constructor(shouldFail = false) {
    this.shouldFail = shouldFail;
  }

  async initialize(config: ModelConfig): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Mock initialization failed');
    }
    this.initialized = true;
  }

  async summarize(content: string, type: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('Model not initialized');
    }
    if (this.shouldFail) {
      throw new Error('Mock summarization failed');
    }
    return `Summary of ${type}: ${content.substring(0, 50)}...`;
  }

  async cleanup(): Promise<void> {
    this.initialized = false;
  }
}

describe('SummarizationService', () => {
  let service: SummarizationService;
  let model: MockModel;

  beforeEach(() => {
    model = new MockModel();
    service = new SummarizationService(model, {
      model: { apiKey: 'test-key' },
      charThreshold: 100,
      cacheMaxAge: 1000 // 1 second for testing
    });
  });

  afterEach(async () => {
    await service.cleanup();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(service.initialize()).resolves.toBeUndefined();
    });

    it('should handle initialization failure', async () => {
      const failingModel = new MockModel(true);
      const failingService = new SummarizationService(failingModel, {
        model: { apiKey: 'test-key' }
      });

      await expect(failingService.initialize()).rejects.toThrow('Mock initialization failed');
      await failingService.cleanup();
    });
  });

  describe('content summarization', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return original content when below threshold', async () => {
      const content = 'Short content';
      const result = await service.maybeSummarize(content, 'text');
      expect(result).toEqual({
        text: content,
        isSummarized: false
      });
    });

    it('should summarize content when above threshold', async () => {
      const content = 'A'.repeat(150); // Content longer than threshold
      const result = await service.maybeSummarize(content, 'text');
      expect(result.isSummarized).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.text).toMatch(/^Summary of text:/);
    });

    it('should handle summarization failure', async () => {
      const failModel = new MockModel();
      const failService = new SummarizationService(failModel, {
        model: { apiKey: 'test-key' },
        charThreshold: 100
      });

      await failService.initialize();
      
      const mockSummarize = jest.spyOn(failModel, 'summarize')
        .mockRejectedValueOnce(new Error('Mock summarization failed'));

      try {
        const content = 'A'.repeat(150);
        await expect(failService.maybeSummarize(content, 'text'))
          .rejects.toThrow('Mock summarization failed');
      } finally {
        mockSummarize.mockRestore();
        await failService.cleanup();
      }
    });
  });

  describe('content cache', () => {
    beforeEach(async () => {
      jest.useFakeTimers();
      await service.initialize();
    });

    afterEach(async () => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should store and retrieve content', async () => {
      const content = 'A'.repeat(150);
      const result = await service.maybeSummarize(content, 'text');
      expect(result.id).toBeDefined();

      const retrieved = service.getFullContent(result.id!);
      expect(retrieved).toBe(content);
    });

    it('should return null for non-existent content', () => {
      const retrieved = service.getFullContent('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('should clean up expired cache entries', async () => {
      const content = 'A'.repeat(150);
      const result = await service.maybeSummarize(content, 'text');
      
      // Use runAllTimers to handle any pending promises
      await jest.runAllTimersAsync();
      
      // Advance time past cache expiration
      jest.advanceTimersByTime(1100);
      await jest.runAllTimersAsync();
      
      const retrieved = service.getFullContent(result.id!);
      expect(retrieved).toBeNull();
    });

    it('should throw error for invalid cache age configuration', async () => {
      await expect(() => new SummarizationService(model, {
        model: { apiKey: 'test-key' },
        cacheMaxAge: -1
      })).toThrow('Cache max age must be a positive number');

      await expect(() => new SummarizationService(model, {
        model: { apiKey: 'test-key' },
        cacheMaxAge: 0
      })).toThrow('Cache max age must be a positive number');
    });
  });

  describe('cleanup', () => {
    it('should clean up resources', async () => {
      await service.initialize();
      const content = 'A'.repeat(150);
      const result = await service.maybeSummarize(content, 'text');
      
      await service.cleanup();
      
      // Cache should be cleared
      const retrieved = service.getFullContent(result.id!);
      expect(retrieved).toBeNull();
    });
  });
});