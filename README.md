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

## Usage

```bash
# Start the server
npm start

# Required environment variable
ANTHROPIC_API_KEY=your-api-key
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
