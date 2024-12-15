import { OpenAICompatible } from './openai-compatible.js';
import { SummarizationModel, ModelConfig } from '../types/models.js';

export class OpenAIModel extends OpenAICompatible {
  constructor() {
    super();
  }

  async summarize(content: string, type: string): Promise<string> {
    return super.summarize(content, type);
  }
}