<div align="center">

# Summarization Functions

### Intelligent text summarization for the Model Context Protocol

[Features](#features) •
[Installation](#installation) •
[Usage](#usage) •
[Architecture](#architecture) •
[Roadmap](#roadmap)

</div>

---

## Overview

A powerful MCP server that provides intelligent summarization capabilities through a clean, extensible architecture. Built with modern TypeScript and designed for seamless integration with AI workflows.

## Features

- **Command Output Summarization**  
  Execute commands and get concise summaries of their output

- **File Content Analysis**  
  Summarize single or multiple files while maintaining technical accuracy

- **Directory Structure Understanding**  
  Get clear overviews of complex directory structures

- **Flexible Model Support**  
  Modular design for easy integration of different AI models

## Installation

```bash
npm install
```

## Configuration

The server supports multiple AI providers through environment variables:

### Required Environment Variables

- `PROVIDER`: AI provider to use. Supported values:
		- `ANTHROPIC` - Claude models from Anthropic
		- `OPENAI` - GPT models from OpenAI
		- `OPENAI-COMPATIBLE` - OpenAI-compatible APIs (e.g. Azure)
		- `GOOGLE` - Gemini models from Google
- `API_KEY`: API key for the selected provider

### Optional Environment Variables

- `MODEL_ID`: Specific model to use (defaults to provider's standard model)
- `PROVIDER_BASE_URL`: Custom API endpoint for OpenAI-compatible providers
- `MAX_TOKENS`: Maximum tokens for model responses (default: 1024)
- `SUMMARIZATION_CHAR_THRESHOLD`: Character count threshold for when to summarize (default: 512)
- `SUMMARIZATION_CACHE_MAX_AGE`: Cache duration in milliseconds (default: 3600000 - 1 hour)

### Example Configurations

```bash
# Anthropic Configuration
PROVIDER=ANTHROPIC
API_KEY=your-anthropic-key
MODEL_ID=claude-3-5-sonnet-20241022

# OpenAI Configuration
PROVIDER=OPENAI
API_KEY=your-openai-key
MODEL_ID=gpt-4-turbo-preview

# Azure OpenAI Configuration
PROVIDER=OPENAI-COMPATIBLE
API_KEY=your-azure-key
PROVIDER_BASE_URL=https://your-resource.openai.azure.com
MODEL_ID=your-deployment-name

# Google Configuration
PROVIDER=GOOGLE
API_KEY=your-google-key
MODEL_ID=gemini-2.0-flash-exp
```


## Usage

Add the server to your MCP configuration file:

```json
{
		"mcpServers": {
				"summarization": {
						"command": "node",
						"args": ["path/to/summarization-functions/build/index.js"],
						"env": {
								"PROVIDER": "ANTHROPIC",
								"API_KEY": "your-api-key",
								"MODEL_ID": "claude-3-5-sonnet-20241022"
						}
				}
		}
}
```

The server will be available to use through MCP tools:
- `summarize_command`: Execute and summarize command output
- `summarize_files`: Summarize file contents
- `summarize_directory`: Get directory structure overview
- `summarize_text`: Summarize arbitrary text content

## Architecture

Built with clean architecture principles and modern TypeScript features:

```
src/
├── models      # AI model implementations
├── services    # Core business logic
├── server      # MCP server handling
└── types       # Shared type definitions
```

## Roadmap

### Upcoming Enhancements

- **Context-Aware Processing**
  - Hint-based summarization focus (e.g., security, API surface, dependencies)
  - Format-specific processing
  - Relationship preservation

- **Flexible Output Formats**
  - JSON structured output
  - Markdown with sections
  - Hierarchical outline

- **Enhanced Analysis**
  - Security pattern detection
  - API surface documentation
  - Dependency tracking
  - Error handling analysis

See the [enhancement specification](docs/spec/enhanced-summarization.md) and [implementation roadmap](docs/spec/implementation-roadmap.md) for detailed information.

### Example Future Usage

```typescript
// Security analysis in JSON format
const securityAnalysis = await summarize_files({
  paths: ["src/auth.ts"],
  hint: "security_analysis",
  output_format: "json"
});

// API surface documentation in markdown
const apiDocs = await summarize_files({
  paths: ["src/api/"],
  hint: "api_surface",
  output_format: "markdown"
});
```

## License

MIT
