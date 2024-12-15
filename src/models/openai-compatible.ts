import { ModelConfig, SummarizationModel, SummarizationOptions } from '../types/models';
import { constructPrompt } from './prompts';

export class OpenAICompatible implements SummarizationModel {
  protected config: ModelConfig | null = null;
  protected baseUrl = 'https://api.openai.com/v1';

  async initialize(config: ModelConfig): Promise<void> {
    if (!config.apiKey) {
      throw new Error('API key is required for OpenAI compatible models');
    }

    const model = config.model;
    const maxTokens = config.maxTokens !== undefined ? config.maxTokens : 1024;

    // Validate model name
    if (typeof model !== 'string' || !model.trim()) {
      throw new Error('Invalid model name');
    }

    // Validate max tokens
    if (typeof maxTokens !== 'number' || maxTokens <= 0) {
      throw new Error('Invalid max tokens value');
    }

    this.config = {
      ...config,
      model,
      maxTokens,
    };
  }

  async summarize(content: string, type: string): Promise<string> {
    if (!this.config) {
      throw new Error('Model not initialized');
    }

    const { apiKey, model, maxTokens } = this.config;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that summarizes ${type} content.`,
          },
          {
            role: 'user',
            content: `Summarize the following ${type} content:\n\n${content}`,
          },
        ],
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    } else {
      throw new Error('No summary was returned from the API');
    }
  }

  async cleanup(): Promise<void> {
    // No cleanup needed for OpenAI compatible models
  }
}