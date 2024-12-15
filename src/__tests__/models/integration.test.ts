import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { config } from 'dotenv';
import nodeFetch from 'node-fetch';
config();

// Import models
import { createAnthropicModel } from '../../models/anthropic.js';
import { OpenAIModel } from '../../models/openai.js';
import { GeminiModel } from '../../models/gemini.js';
import { SummarizationModel, SummarizationOptions } from '../../types/models.js';

// Get API keys from environment
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

describe('Model Integration Tests', () => {
  // Use node-fetch for all integration tests
  beforeEach(() => {
    global.fetch = nodeFetch as unknown as typeof fetch;
  });

  describe('Anthropic Model', () => {
    let model: SummarizationModel;

    beforeEach(async () => {
      model = createAnthropicModel();
      if (ANTHROPIC_API_KEY) {
        await model.initialize({ apiKey: ANTHROPIC_API_KEY });
      }
    });

    (ANTHROPIC_API_KEY ? it : it.skip)('should summarize text content', async () => {
      const content = 'This is a test content that needs to be summarized. It contains multiple sentences and should be processed by the model to create a concise summary.';
      const summary = await model.summarize(content, 'text');
      expect(summary).toBeTruthy();
      expect(typeof summary).toBe('string');
    }, 10000);

    (ANTHROPIC_API_KEY ? it : it.skip)('should summarize code with security analysis', async () => {
      const content = `
        function authenticate(user, password) {
          if (password === 'admin123') {
            return true;
          }
          return false;
        }
      `;
      const options: SummarizationOptions = {
        hint: 'security_analysis',
        output_format: 'json'
      };
      const summary = await model.summarize(content, 'code', options);
      expect(summary).toBeTruthy();
      expect(typeof summary).toBe('string');
      
      // Verify the response contains security-focused analysis
      expect(summary.toLowerCase()).toContain('security');
    }, 10000);
  });

  describe('OpenAI Model', () => {
    let model: SummarizationModel;

    beforeEach(async () => {
      model = new OpenAIModel();
      if (OPENAI_API_KEY) {
        await model.initialize({ 
          apiKey: OPENAI_API_KEY,
          model: 'gpt-3.5-turbo'
        });
      }
    });

    (OPENAI_API_KEY ? it : it.skip)('should summarize text content', async () => {
      const content = 'This is a test content that needs to be summarized. It contains multiple sentences and should be processed by the model to create a concise summary.';
      const summary = await model.summarize(content, 'text');
      expect(summary).toBeTruthy();
      expect(typeof summary).toBe('string');
    }, 10000);

    (OPENAI_API_KEY ? it : it.skip)('should summarize code with type definitions', async () => {
      const content = `
        interface User {
          id: string;
          name: string;
          email: string;
          roles: string[];
        }

        class UserService {
          private users: User[] = [];
          
          addUser(user: User) {
            this.users.push(user);
          }
          
          findUserById(id: string): User | undefined {
            return this.users.find(u => u.id === id);
          }
        }
      `;
      const options: SummarizationOptions = {
        hint: 'type_definitions',
        output_format: 'json'
      };
      const summary = await model.summarize(content, 'code', options);
      expect(summary).toBeTruthy();
      expect(typeof summary).toBe('string');
      
      // Verify the response contains type-related analysis
      const typePhrases = ['interface', 'property', 'properties', 'class'];
						const hasTypeRelatedTerms = typePhrases.some(phrase =>
								summary.toLowerCase().includes(phrase)
						);
						expect(hasTypeRelatedTerms).toBe(true);
    }, 10000);
  });

  describe('Gemini Model', () => {
    let model: SummarizationModel;

    beforeEach(async () => {
      model = new GeminiModel();
      if (GEMINI_API_KEY) {
        await model.initialize({ apiKey: GEMINI_API_KEY });
      }
    });

    (GEMINI_API_KEY ? it : it.skip)('should summarize text content', async () => {
      const content = 'This is a test content that needs to be summarized. It contains multiple sentences and should be processed by the model to create a concise summary.';
      const summary = await model.summarize(content, 'text');
      expect(summary).toBeTruthy();
      expect(typeof summary).toBe('string');
    }, 10000);

    (GEMINI_API_KEY ? it : it.skip)('should summarize code with API surface analysis', async () => {
      const content = `
        export class DataProcessor {
          constructor(private config: ProcessorConfig) {}
          
          async processData(input: RawData): Promise<ProcessedData> {
            // Implementation
          }
          
          validateInput(data: RawData): ValidationResult {
            // Implementation
          }
          
          @Deprecated('Use processData instead')
          async oldProcessMethod(data: any): Promise<any> {
            // Legacy implementation
          }
        }
      `;
      const options: SummarizationOptions = {
        hint: 'api_surface',
        output_format: 'json'
      };
      const summary = await model.summarize(content, 'code', options);
      expect(summary).toBeTruthy();
      expect(typeof summary).toBe('string');
      
      // Clean the response of any markdown/code block syntax before parsing JSON
      const cleanJson = summary
								.replace(/```json\n?/g, '') // Remove ```json
								.replace(/```\n?/g, '')     // Remove closing ```
								.trim();                    // Remove extra whitespace
						
						expect(() => JSON.parse(cleanJson)).not.toThrow();
				}, 10000);
		});
});