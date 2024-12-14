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

## License

MIT
