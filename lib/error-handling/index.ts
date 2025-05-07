/**
 * Error Handling Module
 * Provides a centralized error handling system for the application
 */

// Import and re-export from the main error handling file
import {
  AppError,
  ApiError,
  NetworkError,
  ValidationError,
  WebSocketError,
  AuthError,
  ConfigError,
  DataError,
  StrategyError,
  OrderExecutionError,
  errorHandler,
  retry,
  retryFetch,
  retryWithTimeout,
  safeJsonParse,
  makeSafe,
  safeGet,
} from "../error-handling"

export {
  AppError,
  ApiError,
  NetworkError,
  ValidationError,
  WebSocketError,
  AuthError,
  ConfigError,
  DataError,
  StrategyError,
  OrderExecutionError,
  errorHandler,
  retry,
  retryFetch,
  retryWithTimeout,
  safeJsonParse,
  makeSafe,
  safeGet,
}

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

  const message = error instanceof Error ? error.message : String(error)

  errorHandler.handleError(message, {
    context: { source: context },
    severity: severity,
    recoverable: !!retryAction,
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

  const message = error instanceof Error ? error.message : String(error)

  errorHandler.handleError(message, {
    context: { source: context },
    severity: severity,
    recoverable: !!reconnectAction,
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

  const message = error instanceof Error ? error.message : String(error)

  errorHandler.handleError(message, {
    context: { source: context, data },
    severity: severity,
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
