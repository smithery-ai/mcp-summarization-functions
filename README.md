# 🤖 AI Agent Summarization Tools

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Claude Integration](https://img.shields.io/badge/Claude-3.5-purple)](https://anthropic.com)
[![MCP Protocol](https://img.shields.io/badge/MCP-0.6.0-orange)](https://modelcontextprotocol.ai)

> 🚀 Supercharge your AI agents with intelligent summarization capabilities

A powerful MCP server designed specifically for AI agents to handle large outputs efficiently and prevent context window overflow. Leveraging Claude's advanced summarization capabilities, this tool ensures your agents can process and understand extensive content without losing critical information.

## ✨ Key Features

- 🔄 **Smart Thresholding**: Automatically summarizes content exceeding 512 characters
- 🧠 **Context-Aware Summaries**: Uses Claude to create intelligent, context-preserving summaries
- 🔍 **Full Content Access**: Retrieve complete content anytime using unique IDs
- 🕒 **Efficient Caching**: 1-hour content caching for quick access to recent summaries
- 🛡️ **Type-Safe**: Built with TypeScript for reliable operation

## 🛠️ Available Tools

### 1. `summarize_command`
Execute and summarize command output:
```typescript
{
  command: "npm run test",  // Command to execute
  cwd?: "/path/to/dir"      // Optional working directory
}
```

### 2. `summarize_files`
Summarize file contents:
```typescript
{
  paths: [                  // Array of file paths
    "./src/index.ts",
    "./README.md"
  ]
}
```

### 3. `summarize_directory`
Get a structured summary of directories:
```typescript
{
  path: "./src",           // Directory path
  recursive?: true         // Optional recursive listing
}
```

### 4. `summarize_text`
Summarize any text content:
```typescript
{
  content: "Your long text here...",
  type: "log output"       // Content type for context
}
```

### 5. `get_full_content`
Retrieve complete content:
```typescript
{
  id: "summary-id-here"    // ID from previous summary
}
```

## 🎯 Use Cases

### 1. Large Output Handling
Perfect for commands that generate extensive logs or output:
```typescript
// Instead of overwhelming context with full test output
const result = await mcp.use("summarize_command", {
  command: "npm run test -- --coverage"
});
// Get: "Test suite passed with 95% coverage. 150 tests executed..."
```

### 2. Codebase Navigation
Help agents understand large codebases efficiently:
```typescript
const overview = await mcp.use("summarize_directory", {
  path: "./src",
  recursive: true
});
// Get: "Project structure: 3 main modules (auth, api, utils)..."
```

### 3. Log Analysis
Process and understand large log files:
```typescript
const summary = await mcp.use("summarize_files", {
  paths: ["./logs/error.log"]
});
// Get: "3 critical errors found in payment processing module..."
```

### 4. API Response Processing
Handle large API responses without overwhelming context:
```typescript
const processed = await mcp.use("summarize_text", {
  content: largeApiResponse,
  type: "API response"
});
// Get: "User data contains 1000 records, primarily from EU region..."
```

## 🚀 Benefits for AI Agents

- **Context Efficiency**: Maintain critical information while staying within token limits
- **Intelligent Processing**: Get smart summaries that preserve key details and relationships
- **Memory Management**: Access full content when needed through the ID system
- **Flexible Integration**: Works with any command output, files, or text content
- **Error Prevention**: Avoid context overflow crashes in long-running operations

## 🔧 Technical Requirements

- Node.js ≥ 22.0.0
- Anthropic API Key
- MCP Protocol Support

## 🔒 Security

- Environment-based API key configuration
- Secure content caching
- Type-safe implementation
- Protected against common vulnerabilities

## 🌟 Example Workflow

```typescript
// Execute a long-running test
const testResult = await mcp.use("summarize_command", {
  command: "npm run integration-tests"
});
// Get summary: "All 250 integration tests passed. Notable: API latency..."

// If details needed, retrieve full content
const fullResults = await mcp.use("get_full_content", {
  id: testResult.id
});
```

## 🤝 Contributing

Contributions are welcome! Please check our [Contributing Guidelines](CONTRIBUTING.md) for details.

## 📝 License

MIT License - feel free to use in your AI agent projects!

---

<p align="center">
  Made with ❤️ for AI Agents
</p>
