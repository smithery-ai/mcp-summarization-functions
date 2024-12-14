# Implementation Roadmap

## Foundation (Week 1-2)
Priority: High

### Core Infrastructure
1. Update type definitions and interfaces
2. Modify MCP server to handle new parameters
3. Enhance SummarizationService with new parameter support
4. Add basic validation for new parameters

### Basic Output Formats
1. Implement text output formatter (baseline)
2. Implement JSON output formatter
3. Implement basic markdown formatter
4. Add format validation and error handling

*Note: The above requires moving prompts for different summarisations to its own file and rewriting them to a good format*

### Better model support

Update the env variables to support specifying:

Provider
- Anthropic
- Google Gemini
- OpenAI
- OpenAI Compatible

API key

Model
