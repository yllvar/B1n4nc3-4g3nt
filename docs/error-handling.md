# Error Handling System

This document describes the error handling system used in the application.

## Overview

The error handling system provides a centralized way to handle errors throughout the application. It includes:

- Custom error classes for different types of errors
- A retry mechanism for handling transient failures
- A circuit breaker pattern to prevent cascading failures
- Utility functions for common error handling scenarios

## Core Components

### Error Types

The system defines several error types:

- `AppError`: Base error class for all application errors
- `ApiError`: For API-related errors
- `NetworkError`: For network-related errors
- `ValidationError`: For data validation errors
- `WebSocketError`: For WebSocket-related errors
- `AuthError`: For authentication-related errors
- `ConfigError`: For configuration-related errors
- `DataError`: For data-related errors
- `StrategyError`: For trading strategy-related errors

### Error Handler

The `ErrorHandlingService` provides methods for:

- Handling errors with appropriate severity levels
- Storing and retrieving recent errors
- Subscribing to error events
- Implementing circuit breaker pattern
- Retrying recoverable errors

### Retry Mechanism

The retry mechanism includes:

- `retry`: A generic retry function for any async operation
- `retryFetch`: A specialized retry function for fetch operations
- `retryWithCircuitBreaker`: A retry function with circuit breaker pattern

## Usage Examples

### Basic Error Handling

\`\`\`typescript
import { errorHandler } from "@/lib/error-handler"

try {
  // Some operation that might fail
} catch (error) {
  errorHandler.handleError(error, {
    severity: "high",
    context: { operation: "example" },
    showToast: true,
  })
}
\`\`\`

### Using Custom Error Types

\`\`\`typescript
import { ApiError } from "@/lib/error-types"

if (!response.ok) {
  throw new ApiError(`API request failed with status ${response.status}`, {
    code: "API_REQUEST_FAILED",
    context: { url, method, status: response.status },
  })
}
\`\`\`

### Retrying Operations

\`\`\`typescript
import { retry } from "@/lib/retry-mechanism"

const result = await retry(
  async () => {
    // Some operation that might fail transiently
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

### Using Utility Functions

\`\`\`typescript
import { handleApiError, validateData } from "@/lib/error-handling"

try {
  // Validate data
  validateData(userData, (data) => data.email && data.password, "Invalid user data")
  
  // API call that might fail
  const response = await fetch("/api/users", {
    method: "POST",
    body: JSON.stringify(userData),
  })
  
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`)
  }
} catch (error) {
  handleApiError(error, "User API", {
    severity: "high",
    retryAction: async () => {
      // Action to retry when network is restored
    },
  })
}
\`\`\`

## Best Practices

1. **Use appropriate error types** for different kinds of errors
2. **Include context** in error objects to aid debugging
3. **Set appropriate severity levels** based on the impact of the error
4. **Use the retry mechanism** for transient failures
5. **Subscribe to error events** to display errors in the UI
6. **Clean up error subscriptions** when components unmount

## Migration Guide

If you're migrating from an older error handling approach:

1. Replace direct throws with appropriate error types
2. Replace try/catch blocks with errorHandler.handleError
3. Replace custom retry logic with the retry functions
4. Update error displays to subscribe to the error handler

## File Structure

- `lib/error-types.ts`: Error classes and types
- `lib/error-handler.ts`: Error handling service
- `lib/retry-mechanism.ts`: Retry functions
- `lib/error-handling.ts`: Main entry point that re-exports everything
- `lib/error-handling/`: Compatibility layer for backward compatibility
