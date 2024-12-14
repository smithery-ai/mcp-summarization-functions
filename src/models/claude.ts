import Anthropic from '@anthropic-ai/sdk';
import { ModelConfig, SummarizationModel } from '../types/models';

export class ClaudeModel implements SummarizationModel {
  private client: Anthropic | null = null;
  private config: ModelConfig | null = null;

  async initialize(config: ModelConfig): Promise<void> {
    if (!config.apiKey) {
      throw new Error('API key is required for Claude model');
    }

    const model = config.model || 'claude-3-5-sonnet-20241022';
    const maxTokens = config.maxTokens || 1024;

    // Validate model name
    if (typeof model !== 'string' || !model.trim()) {
      throw new Error('Invalid model name');
    }

    // Validate maxTokens
    if (typeof maxTokens !== 'number' || maxTokens < 1) {
      throw new Error('Invalid max tokens value');
    }

    this.config = {
      model,
      maxTokens,
      apiKey: config.apiKey
    };

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
    });
  }

  async summarize(content: string, type: string): Promise<string> {
    if (!this.client || !this.config) {
      throw new Error('Claude model not initialized');
    }

    const prompt = `Summarize the following ${type} in a clear, concise way that would be useful for an AI agent. Focus on the most important information and maintain technical accuracy:

${content}

Summary:`;

    try {
      const message = await this.client.messages.create({
        model: this.config.model!,
        max_tokens: this.config.maxTokens || 1024, // Ensure maxTokens is always defined
        messages: [{ role: 'user', content: prompt }],
      });

      const responseContent = message.content[0];
      if ('text' in responseContent) {
        return responseContent.text;
      }
      throw new Error('Unexpected response format from Claude');
    } catch (error) {
      throw new Error(`Claude summarization failed: ${(error as Error).message}`);
    }
  }

  async cleanup(): Promise<void> {
    // No cleanup needed for Claude
    this.client = null;
    this.config = null;
  }
}

// Factory function to create a new Claude model instance
export function createClaudeModel(): SummarizationModel {
  return new ClaudeModel();
}