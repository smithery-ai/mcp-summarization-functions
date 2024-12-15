<div align="center">

# Summarization Functions

### Intelligent text summarization for the Model Context Protocol

[Features](#features) •
[Installation](#installation) •
[Usage](#usage) •
[Architecture](#architecture)

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
  Use models from different providers

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

### Available Functions

The server provides the following summarization tools:

#### `summarize_command`
Execute and summarize command output.
```typescript
{
  // Required
  command: string,    // Command to execute
  
  // Optional
  cwd?: string,       // Working directory for command execution
  hint?: string,      // Focus area: "security_analysis" | "api_surface" | "error_handling" | "dependencies" | "type_definitions"
  output_format?: string  // Format: "text" | "json" | "markdown" | "outline" (default: "text")
}
```

#### `summarize_files`
Summarize file contents.
```typescript
{
  // Required
  paths: string[],    // Array of file paths to summarize
  
  // Optional
  hint?: string,      // Focus area: "security_analysis" | "api_surface" | "error_handling" | "dependencies" | "type_definitions"
  output_format?: string  // Format: "text" | "json" | "markdown" | "outline" (default: "text")
}
```

#### `summarize_directory`
Get directory structure overview.
```typescript
{
  // Required
  path: string,       // Directory path to summarize
  
  // Optional
  recursive?: boolean,  // Whether to include subdirectories
  hint?: string,       // Focus area: "security_analysis" | "api_surface" | "error_handling" | "dependencies" | "type_definitions"
  output_format?: string   // Format: "text" | "json" | "markdown" | "outline" (default: "text")
}
```

#### `summarize_text`
Summarize arbitrary text content.
```typescript
{
  // Required
  content: string,    // Text content to summarize
  type: string,       // Type of content (e.g., "log output", "API response")
  
  // Optional
  hint?: string,      // Focus area: "security_analysis" | "api_surface" | "error_handling" | "dependencies" | "type_definitions"
  output_format?: string  // Format: "text" | "json" | "markdown" | "outline" (default: "text")
}
```

#### `get_full_content`
Retrieve the full content for a given summary ID.
```typescript
{
  // Required
  id: string         // ID of the stored content
}
```

## Architecture

Built with clean architecture principles and modern TypeScript features:

```
src/
├── models      # AI model implementations
├── services    # Core business logic
├── server      # MCP server handling
└── types       # Shared type definitions
```

## License

MIT
