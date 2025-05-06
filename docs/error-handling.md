# Error Handling System

This document describes the error handling system used in the application.

## Overview

The error handling system provides a centralized way to handle errors throughout the application. It includes:

- Custom error classes for different types of errors
- A retry mechanism for handling transient failures
- A circuit breaker pattern to prevent cascading failures
- Utility functions for common error handling scenarios

## Core Files

- `lib/error-types.ts`: Defines error classes and types
- `lib/error-handler.ts`: Provides the error handling service
- `lib/retry-mechanism.ts`: Implements retry logic and circuit breaker
- `lib/error-handling.ts`: Main entry point that re-exports everything

## Usage Examples

### Basic Error Handling

\`\`\`typescript
import { errorHandler, AppError } from "@/lib/error-handling"

try {
  // Some code that might throw an error
} catch (error) {
  errorHandler.handleError(error, {
    context: { source: "MyComponent" },
    severity: "medium",
    showToast: true,
  })
}
\`\`\`

### Custom Error Classes

\`\`\`typescript
import { ApiError, NetworkError } from "@/lib/error-handling"

// Throw a specific error type
throw new ApiError("API request failed", {
  code: "API_TIMEOUT",
  severity: "high",
  context: { endpoint: "/api/data" },
})
\`\`\`

### Retry Mechanism

\`\`\`typescript
import { retry } from "@/lib/error-handling"

const result = await retry(
  async () => {
    // Some async operation that might fail
    return await fetchData()
  },
  {
    maxRetries: 3,
    delay: 1000,
    backoffFactor: 2,
    onRetry: (error, attempt) => {
      console.log(`Retry attempt ${attempt} after error: ${error.message}`)
    },
  }
)
\`\`\`

### Circuit Breaker

\`\`\`typescript
import { retryWithCircuitBreaker } from "@/lib/error-handling"

const result = await retryWithCircuitBreaker(
  async () => {
    // Some async operation that might fail
    return await fetchData()
  },
  {
    failureThreshold: 5,
    resetTimeout: 60000,
    maxRetries: 3,
  }
)
\`\`\`

### Utility Functions

\`\`\`typescript
import { handleApiError, handleWebSocketError, validateData } from "@/lib/error-handling"

// Handle API errors
try {
  await fetchData()
} catch (error) {
  handleApiError(error, "DataService", {
    severity: "high",
    retryAction: async () => {
      // Action to retry the operation
    },
  })
}

// Validate data
const validatedData = validateData(
  inputData,
  (data) => data.id && data.name,
  "Invalid data: missing required fields"
)
\`\`\`

## Best Practices

1. **Use Specific Error Types**: Use the most specific error class for the situation
2. **Include Context**: Always include relevant context information when throwing errors
3. **Handle Errors at Boundaries**: Handle errors at component or service boundaries
4. **Use Retry for Transient Failures**: Use retry for operations that might succeed on retry
5. **Monitor Error Patterns**: Use the error handling service to monitor error patterns

## Migration Guide

If you're migrating from the old error handling system:

1. Replace imports from `lib/error-handling/error-types` with `lib/error-handling`
2. Replace imports from `lib/error-handling/error-handler` with `lib/error-handling`
3. Replace imports from `lib/error-handling/retry-mechanism` with `lib/error-handling`

## Future Improvements

- Add integration with external error tracking services
- Implement more sophisticated circuit breaker strategies
- Add support for error aggregation and analysis
