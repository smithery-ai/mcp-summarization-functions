import { ModelConfig, SummarizationModel, SummarizationOptions } from '../types/models.js';
import { constructPrompt } from './prompts.js';

import { Anthropic, APIError } from '@anthropic-ai/sdk';
import { Message } from '@anthropic-ai/sdk/resources/messages';

export class AnthropicModel implements SummarizationModel {
  private config: ModelConfig | null = null;
  private baseUrl = 'https://api.anthropic.com/v1/messages';
  private anthropic: Anthropic | undefined;

  async initialize(config: ModelConfig): Promise<void> {
    if (!config.apiKey) {
      throw new Error('API key is required for Anthropic model');
    }

    const model = config.model || 'claude-3-5-haiku-20241022';
    const maxTokens = config.maxTokens !== undefined ? config.maxTokens : 1024;

    // Validate model name
    if (typeof model !== 'string' || !model.trim()) {
      throw new Error('Invalid model name');
    }

    // Validate maxTokens - explicitly check for 0 and negative values
    if (!Number.isInteger(maxTokens) || maxTokens <= 0) {
      throw new Error('Invalid max tokens value');
    }

    process.env.ANTHROPIC_API_KEY = config.apiKey;


    this.anthropic = new Anthropic({
      apiKey: config.apiKey
    });


    this.config = {
      model,
      maxTokens,
      apiKey: config.apiKey
    };
  }

  async summarize(content: string, type: string, options?: SummarizationOptions): Promise<string> {
    if (!this.config) {
      throw new Error('Anthropic model not initialized');
    }
    if (!this.anthropic) {
      throw new Error('Anthropic SDK not initialized');
    }

    const result = constructPrompt('anthropic', content, type, options);
    if (result.format !== 'anthropic') {
      throw new Error('Unexpected prompt format returned');
    }
    const prompt = result.prompt;

    try {
      let data: Message;
      try {
        data = await this.anthropic.messages.create({
          model: this.config.model!!,
          max_tokens: this.config.maxTokens!!,
          messages: [{
            role: 'user',
            content: prompt
          }]
        });
      } catch (fetchError: any) {
        if (fetchError instanceof APIError) {
          const error = fetchError as APIError;
          throw new Error(`API error: ${error.message}`);
        } else {
          throw new Error(`Network error: ${fetchError.message}`);
        }
      }

      const msg = data.content[0] as { text: string, type: string };

      if (!Array.isArray(data.content) || !msg.text || msg.type !== 'text') {
        throw new Error('Unexpected response format from Anthropic API');
      }

      return msg.text;
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