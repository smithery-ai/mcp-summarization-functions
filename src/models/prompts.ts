import { SummarizationOptions } from '../types/models.js';

/**
 * Formats for different model providers
 */
export type PromptFormat = 'anthropic' | 'openai' | 'gemini';

/**
 * Base interface for all prompt types
 */
interface BasePrompt {
  format: PromptFormat;
}

/**
 * Anthropic-style single string prompt
 */
interface AnthropicPrompt extends BasePrompt {
  format: 'anthropic';
  prompt: string;
}

/**
 * OpenAI-style chat messages
 */
interface OpenAIPrompt extends BasePrompt {
  format: 'openai';
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}

/**
 * Gemini-style chat messages
 */
interface GeminiPrompt extends BasePrompt {
  format: 'gemini';
  messages: Array<{
    role: 'user' | 'model';
    parts: Array<{
      text: string;
    }>;
  }>;
}

export type ModelPrompt = AnthropicPrompt | OpenAIPrompt | GeminiPrompt;

/**
 * Constructs hint-specific instructions based on the hint type
 */
function getHintInstructions(hint?: string): string {
  if (!hint) return '';

  const hintInstructions: Record<string, string> = {
    security_analysis: 'Focus on security-critical aspects including authentication, authorization, crypto operations, data validation, and error handling patterns.',
    api_surface: 'Focus on public API interfaces, documenting parameters/return types, noting deprecation warnings and potential breaking changes.',
    error_handling: 'Focus on error handling patterns, exception flows, and recovery mechanisms.',
    dependencies: 'Focus on import/export relationships, external dependencies, and potential circular dependencies.',
    type_definitions: 'Focus on type structures, relationships, and hierarchies.'
  };

  return hintInstructions[hint] || '';
}

/**
 * Constructs format-specific instructions based on the output format
 */
function getFormatInstructions(output_format?: string): string {
  if (!output_format || output_format === 'text') return '';

  const formatInstructions: Record<string, string> = {
    json: 'Provide the summary in JSON format with a "summary" field and a "metadata" object containing focus_areas, key_components, and relationships.',
    markdown: 'Format the summary in Markdown with clear sections, a table of contents, and preserved code blocks where relevant.',
    outline: 'Present the summary as a hierarchical outline with relationship indicators and importance markers.'
  };

  return formatInstructions[output_format] || '';
}

/**
 * Constructs the base summarization instructions
 */
function getBaseSummarizationInstructions(type: string): string {
  return `Summarize the following ${type} in a clear, concise way that would be useful for an AI agent. Focus on the most important information and maintain technical accuracy.`;
}

/**
 * Combines all instructions into a complete prompt
 */
function constructFullInstructions(type: string, options?: SummarizationOptions): string {
  const baseInstructions = getBaseSummarizationInstructions(type);
  const hintInstructions = getHintInstructions(options?.hint);
  const formatInstructions = getFormatInstructions(options?.output_format);

  return [
    baseInstructions,
    hintInstructions,
    formatInstructions
  ].filter(Boolean).join('\n\n');
}

/**
 * Creates an Anthropic-style prompt
 */
function createAnthropicPrompt(content: string, type: string, options?: SummarizationOptions): AnthropicPrompt {
  const instructions = constructFullInstructions(type, options);
  return {
    format: 'anthropic',
    prompt: `${instructions}\n\n${content}\n\nSummary:`,
  };
}

/**
 * Creates an OpenAI-style prompt
 */
function createOpenAIPrompt(content: string, type: string, options?: SummarizationOptions): OpenAIPrompt {
  const instructions = constructFullInstructions(type, options);
  return {
    format: 'openai',
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant that summarizes ${type} content.${
          options?.hint ? ` You specialize in ${options.hint} analysis.` : ''
        }`,
      },
      {
        role: 'user',
        content: `${instructions}\n\n${content}`,
      },
    ],
  };
}

/**
 * Creates a Gemini-style prompt
 */
function createGeminiPrompt(content: string, type: string, options?: SummarizationOptions): GeminiPrompt {
  const instructions = constructFullInstructions(type, options);
  return {
    format: 'gemini',
    messages: [
      {
        role: 'user',
        parts: [{
          text: `${instructions}\n\n${content}`,
        }],
      },
    ],
  };
}

/**
 * Main function to construct prompts for any model type
 */
export function constructPrompt(
  format: PromptFormat,
  content: string,
  type: string,
  options?: SummarizationOptions
): ModelPrompt {
  switch (format) {
    case 'anthropic':
      return createAnthropicPrompt(content, type, options);
    case 'openai':
      return createOpenAIPrompt(content, type, options);
    case 'gemini':
      return createGeminiPrompt(content, type, options);
    default:
      throw new Error(`Unsupported prompt format: ${format}`);
  }
}