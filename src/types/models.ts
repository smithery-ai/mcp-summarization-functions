/**
 * Options for customizing summarization behavior
 */
export interface SummarizationOptions {
  /**
   * Provides context about what aspects of the content to focus on
   * Examples: "security_analysis", "api_surface", "error_handling", "dependencies", "type_definitions"
   */
		hint?: string;

		/**
   * Specifies the desired format of the summary
   * Examples: "text" (default), "json", "markdown", "outline"
			*/
		output_format?: string;
}

/**
	* Configuration options for summarization models
	*/
export interface ModelConfig {
		apiKey: string;
		maxTokens?: number;
		model?: string;
		baseUrl?: string | null;
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
   * @param options Optional parameters to customize summarization
   * @returns A summary of the content
   */
  summarize(content: string, type: string, options?: SummarizationOptions): Promise<string>;

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