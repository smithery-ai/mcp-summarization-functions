import { v4 as uuidv4 } from 'uuid';
import { SummarizationModel, SummarizationConfig } from '../types/models';

interface CacheEntry {
  content: string;
  timestamp: number;
}

export class SummarizationService {
  private model: SummarizationModel;
  private config: SummarizationConfig;
  private contentCache: Map<string, CacheEntry>;
  private charThreshold: number;
  private cacheMaxAge: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    model: SummarizationModel,
    config: SummarizationConfig
  ) {
    this.model = model;
    this.config = config;
    this.contentCache = new Map();
    this.charThreshold = config.charThreshold || 512;
    
    // Validate cache max age
    if (config.cacheMaxAge !== undefined && config.cacheMaxAge <= 0) {
      throw new Error('Cache max age must be a positive number');
    }
    this.cacheMaxAge = config.cacheMaxAge || 1000 * 60 * 60; // 1 hour default

    // Start periodic cache cleanup
    this.cleanupInterval = setInterval(() => this.cleanupCache(), this.cacheMaxAge);
  }

  /**
   * Initialize the service and its model
   */
  async initialize(): Promise<void> {
    await this.model.initialize(this.config.model);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [id, entry] of this.contentCache.entries()) {
      if (now - entry.timestamp > this.cacheMaxAge) {
        this.contentCache.delete(id);
      }
    }
  }

  /**
   * Store content in the cache and return its ID
   */
  private storeContent(content: string): string {
    const id = uuidv4();
    this.contentCache.set(id, {
      content,
      timestamp: Date.now(),
    });
    return id;
  }

  /**
   * Retrieve content from the cache by ID
   */
  getFullContent(id: string): string | null {
    const entry = this.contentCache.get(id);
    if (!entry) {
      return null;
    }
    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.cacheMaxAge) {
      this.contentCache.delete(id);
      return null;
    }
    return entry.content;
  }

  /**
   * Summarize content if it exceeds the threshold
   * @returns The original content if below threshold, or a summary with the original content's ID
   */
  async maybeSummarize(
    content: string,
    type: string,
    options?: {
      hint?: string;
      output_format?: string;
    }
  ): Promise<{
    text: string;
    id?: string;
    isSummarized: boolean;
  }> {
    if (content.length <= this.charThreshold) {
      return { text: content, isSummarized: false };
    }

    const summary = await this.model.summarize(content, type);
    const id = this.storeContent(content);
    return {
      text: summary,
      id,
      isSummarized: true,
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.model.cleanup();
    this.contentCache.clear();
    clearInterval(this.cleanupInterval);
  }
}