/**
 * Configuration options for summarization models
 */
export interface ModelConfig {
  apiKey: string;
  maxTokens?: number;
  model?: string;
}

/**
 * Interface that all summarization models must implement
 */
export interface SummarizationModel {
  /**
   * Initialize the model with configuration
   */
  initialize(config: ModelConfig): Promise<void>;

  /**
   * Summarize the given content
   * @param content The text content to summarize
   * @param type The type of content being summarized (e.g., "command output", "code")
   * @returns A summary of the content
   */
  summarize(content: string, type: string): Promise<string>;

  /**
   * Clean up any resources used by the model
   */
  cleanup(): Promise<void>;
}

/**
 * Base configuration for the summarization service
 */
export interface SummarizationConfig {
  model: ModelConfig;
  charThreshold?: number;
  cacheMaxAge?: number;
}