import { ModelConfig, SummarizationModel } from '../types/models';

interface AnthropicResponse {
  content: Array<{
    text: string;
    type: 'text';
  }>;
}

export class AnthropicModel implements SummarizationModel {
  private config: ModelConfig | null = null;
  private baseUrl = 'https://api.anthropic.com/v1/messages';

  async initialize(config: ModelConfig): Promise<void> {
    if (!config.apiKey) {
      throw new Error('API key is required for Anthropic model');
    }

    const model = config.model || 'claude-3-5-sonnet-20241022';
    const maxTokens = config.maxTokens !== undefined ? config.maxTokens : 1024;

    // Validate model name
    if (typeof model !== 'string' || !model.trim()) {
      throw new Error('Invalid model name');
    }

    // Validate maxTokens - explicitly check for 0 and negative values
    if (!Number.isInteger(maxTokens) || maxTokens <= 0) {
      throw new Error('Invalid max tokens value');
    }

    this.config = {
      model,
      maxTokens,
      apiKey: config.apiKey
    };
  }

  async summarize(content: string, type: string): Promise<string> {
    if (!this.config) {
      throw new Error('Anthropic model not initialized');
    }

    const prompt = `Summarize the following ${type} in a clear, concise way that would be useful for an AI agent. Focus on the most important information and maintain technical accuracy:

${content}

Summary:`;

    try {
      let response: Response;
      try {
        response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify({
            model: this.config.model,
            max_tokens: this.config.maxTokens,
            messages: [{
              role: 'user',
              content: prompt
            }]
          })
        });
      } catch (fetchError) {
        throw new Error(`Network error: ${(fetchError as Error).message}`);
      }

      if (!response.ok) {
        let errorMessage: string;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || `HTTP error ${response.status}`;
        } catch {
          errorMessage = `HTTP error ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      let data: AnthropicResponse;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${(parseError as Error).message}`);
      }

      if (!Array.isArray(data.content) || !data.content[0]?.text) {
        throw new Error('Unexpected response format from Anthropic API');
      }

      return data.content[0].text;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Anthropic summarization failed: ${error.message}`);
      }
      throw new Error('Anthropic summarization failed: Unknown error');
    }
  }

  async cleanup(): Promise<void> {
    this.config = null;
  }
}

// Factory function to create a new Anthropic model instance
export function createAnthropicModel(): SummarizationModel {
  return new AnthropicModel();
}