import { ModelConfig, SummarizationModel } from "../types/models.js";
import { AnthropicModel } from "./anthropic.js";
import { OpenAIModel } from "./openai.js";
import { OpenAICompatible } from "./openai-compatible.js";
import { GeminiModel } from "./gemini.js";

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