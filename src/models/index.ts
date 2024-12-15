import { ModelConfig, SummarizationModel } from "src/types/models";
import { AnthropicModel } from "./anthropic";
import { OpenAIModel } from "./openai";
import { OpenAICompatible } from "./openai-compatible";
import { GeminiModel } from "./gemini";

export function initializeModel(provider: String, config: ModelConfig): SummarizationModel {
    let model: SummarizationModel;
    switch (provider) {
        case 'ANTHROPIC':
            model = new AnthropicModel();
            break;
        case 'OPENAI':
            model = new OpenAIModel();
            break;
        case 'OPENAI-COMPATIBLE':
            model = new OpenAICompatible();
            break;
        case 'GOOGLE':
            model = new GeminiModel();
            break;
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
    model.initialize(config);

    return model;
}