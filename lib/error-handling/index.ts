/**
 * Error Handling Module
 * Provides a centralized error handling system for the application
 */

// Re-export all error types
export * from "./error-types"

// Re-export error handler
export * from "./error-handler"

// Re-export retry mechanism
export * from "./retry-mechanism"

// Utility function for handling API errors
export function handleApiError(
  error: unknown,
  context = "API",
  options: {
    showToast?: boolean
    severity?: "low" | "medium" | "high" | "critical"
    retryAction?: () => Promise<void>
  } = {},
): void {
  const { showToast = true, severity = "medium", retryAction } = options
  const { errorHandler } = require("./error-handler")

  const message = error instanceof Error ? error.message : String(error)

  errorHandler.handleError(message, {
    context: { source: context },
    showToast,
    severity,
    recoverable: !!retryAction,
    retryAction,
  })
}

// Utility function for handling WebSocket errors
export function handleWebSocketError(
  error: unknown,
  context = "WebSocket",
  options: {
    showToast?: boolean
    severity?: "low" | "medium" | "high" | "critical"
    reconnectAction?: () => Promise<void>
  } = {},
): void {
  const { showToast = true, severity = "high", reconnectAction } = options
  const { errorHandler } = require("./error-handler")

  const message = error instanceof Error ? error.message : String(error)

  errorHandler.handleError(message, {
    context: { source: context },
    showToast,
    severity,
    recoverable: !!reconnectAction,
    retryAction: reconnectAction,
    code: "WEBSOCKET_ERROR",
  })
}

// Utility function for handling data processing errors
export function handleDataError(
  error: unknown,
  context = "Data Processing",
  options: {
    showToast?: boolean
    severity?: "low" | "medium" | "high" | "critical"
    data?: any
  } = {},
): void {
  const { showToast = false, severity = "medium", data } = options
  const { errorHandler } = require("./error-handler")

  const message = error instanceof Error ? error.message : String(error)

  errorHandler.handleError(message, {
    context: { source: context, data },
    showToast,
    severity,
    code: "DATA_PROCESSING_ERROR",
  })
}

// Create a wrapped version of a function that handles errors
export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    context?: string
    showToast?: boolean
    severity?: "low" | "medium" | "high" | "critical"
    recoverable?: boolean
  } = {},
): (...args: Parameters<T>) => ReturnType<T> {
  const { errorHandler } = require("./error-handler")

  return (...args: Parameters<T>): ReturnType<T> => {
    try {
      const result = fn(...args)

      // Handle promises
      if (result instanceof Promise) {
        return result.catch((error) => {
          errorHandler.handleError(error, options)
          throw error
        }) as ReturnType<T>
      }

      return result
    } catch (error) {
      errorHandler.handleError(error, options)
      throw error
    }
  }
}
