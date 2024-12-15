import { OpenAICompatible, SummarizationModel, ModelConfig } from './openai-compatible';

export class OpenAIModel extends OpenAICompatible {
  constructor() {
    super();
  }

  async summarize(content: string, type: string): Promise<string> {
    return super.summarize(content, type);
  }
}