# Enhanced Summarization Specification

## Overview

This specification proposes enhancements to the summarization functions to better support AI-specific use cases and provide more flexible, context-aware summarization capabilities.

## Proposed Enhancements

### 1. New Parameters

Add two new optional parameters to all summarization functions:

#### `hint` Parameter
- **Purpose**: Provides context about what aspects of the content to focus on
- **Type**: string
- **Examples**:
  - `"security_analysis"` - Focus on security-critical sections
  - `"api_surface"` - Focus on public API interfaces
  - `"error_handling"` - Focus on error handling patterns
  - `"dependencies"` - Focus on import/export relationships
  - `"type_definitions"` - Focus on type structures and relationships

#### `output_format` Parameter
- **Purpose**: Specifies the desired format of the summary
- **Type**: string
- **Examples**:
  - `"text"` (default) - Plain text summary
  - `"json"` - Structured JSON output
  - `"markdown"` - Markdown formatted with sections
  - `"outline"` - Hierarchical outline format

### 2. Enhanced Function Interfaces

```typescript
// Example enhanced interfaces for each function

interface SummarizeCommandArgs {
  command: string;
  cwd?: string;
  hint?: string;
  output_format?: string;
}

interface SummarizeFilesArgs {
  paths: string[];
  hint?: string;
  output_format?: string;
}

interface SummarizeDirectoryArgs {
  path: string;
  recursive?: boolean;
  hint?: string;
  output_format?: string;
}

interface SummarizeTextArgs {
  content: string;
  type: string;
  hint?: string;
  output_format?: string;
}
```

## Implementation Steps

### Phase 1: Core Infrastructure Updates

1. Update Models Interface
```typescript
interface SummarizationModel {
  initialize(config: any): Promise<void>;
  summarize(
    content: string,
    type: string,
    options: {
      hint?: string;
      output_format?: string;
    }
  ): Promise<string>;
  cleanup(): Promise<void>;
}
```

2. Enhance SummarizationService
- Add support for new parameters in maybeSummarize method
- Implement format-specific processing logic
- Add hint processing capabilities

3. Update MCP Server
- Modify tool schemas to include new parameters
- Update request handlers to pass parameters to service

### Phase 2: Format-Specific Handlers

1. Implement JSON Output Handler
```typescript
interface JsonSummaryOutput {
  summary: string;
  metadata: {
    focus_areas: string[];
    key_components: string[];
    relationships: Array<{from: string, to: string, type: string}>;
  };
}
```

2. Implement Markdown Output Handler
- Section-based formatting
- Table of contents generation
- Code block preservation

3. Implement Outline Output Handler
- Hierarchical structure
- Relationship indicators
- Importance markers

### Phase 3: Hint Processing

1. Implement Security Analysis Handler
- Identify authentication/authorization code
- Detect crypto operations
- Flag data validation
- Highlight error handling

2. Implement API Surface Handler
- Extract public methods/functions
- Document parameters/return types
- Note deprecation warnings
- Track breaking changes

3. Implement Dependency Handler
- Map import/export relationships
- Track type dependencies
- Note external dependencies
- Flag circular dependencies

### Phase 4: Testing & Validation

1. Add New Test Cases
- Test each output format
- Validate hint processing
- Check format-specific features
- Verify backward compatibility

2. Update Integration Tests
- Test parameter combinations
- Verify error handling
- Check performance impact
- Validate output consistency

## Example Usage

```typescript
// Example: Security analysis of a code file in JSON format
const result = await summarizationService.maybeSummarize(
  fileContent,
  "typescript",
  {
    hint: "security_analysis",
    output_format: "json"
  }
);

// Example: API surface analysis in markdown format
const result = await summarizationService.maybeSummarize(
  fileContent,
  "typescript",
  {
    hint: "api_surface",
    output_format: "markdown"
  }
);
```

## Backward Compatibility

- All new parameters are optional
- Default behavior remains unchanged
- Existing code continues to work without modification
- New features are opt-in only

## Future Considerations

1. Additional Output Formats
- Consider adding more specialized formats
- Support custom format plugins
- Add format validation

2. Enhanced Hint Processing
- Add machine learning-based hint processing
- Support compound hints
- Add custom hint handlers

3. Performance Optimization
- Implement caching for processed hints
- Add parallel processing for multiple files
- Optimize format conversion

4. Integration Features
- Add IDE integration support
- Support CI/CD pipeline integration
- Add API documentation generation