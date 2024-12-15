# Implementation Roadmap

## Current State

- **Anthropic**: Implemented and tested with Claude 3 Sonnet model. Uses new Bearer token authentication.
- **OpenAI**: Implemented and tested.

## Future Enhancements

- **Support for Various Models**: Extend the `OpenAICompatible` class to support different models like:
  - **Gemini**: Add support for Google's Gemini model.

## Tasks

- [x] Implement Anthropic model support in `src/models/anthropic.ts`.
- [ ] Implement Gemini model support in `src/models/gemini.ts`.
- [ ] Update tests in `src/__tests__/models/` to cover new models.
- [ ] Update documentation in `docs/spec/enhanced-summarization.md` to reflect new model support.

## Notes

- Ensure that each model implementation follows the `SummarizationModel` interface.
- Consider performance implications and API rate limits for each model.
- Update the `ModelConfig` interface to accommodate model-specific configurations.
- Authentication methods vary by provider:
  - Anthropic: Uses Bearer token authentication (`Authorization: Bearer <key>`)
  - OpenAI: Uses API key header (`Authorization: Bearer <key>`)
