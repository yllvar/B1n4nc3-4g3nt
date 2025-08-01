/**
 * @file Error Utilities
 * Provides utility functions for error handling
 */

import { ValidationError, type ErrorSeverity } from "./types"
import { errorHandler } from "./handler"

/**
 * Utility function for handling API errors
 */
export function handleApiError(
  error: unknown,
  context = "API",
  options: {
    showToast?: boolean
    severity?: ErrorSeverity
    retryAction?: () => Promise<void>
  } = {},
): void {
  const { showToast = true, severity = "medium", retryAction } = options

  const message = error instanceof Error ? error.message : String(error)

  errorHandler.handleError(message, {
    context: { source: context },
    showToast,
    severity,
    recoverable: !!retryAction,
    retryAction,
  })
}

/**
 * Utility function for handling WebSocket errors
 */
export function handleWebSocketError(
  error: unknown,
  context = "WebSocket",
  options: {
    showToast?: boolean
    severity?: ErrorSeverity
    reconnectAction?: () => Promise<void>
  } = {},
): void {
  const { showToast = true, severity = "high", reconnectAction } = options

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

/**
 * Utility function for handling data processing errors
 */
export function handleDataError(
  error: unknown,
  context = "Data Processing",
  options: {
    showToast?: boolean
    severity?: ErrorSeverity
    data?: any
  } = {},
): void {
  const { showToast = false, severity = "medium", data } = options

  const message = error instanceof Error ? error.message : String(error)

  errorHandler.handleError(message, {
    context: { source: context, data },
    showToast,
    severity,
    code: "DATA_PROCESSING_ERROR",
  })
}

/**
 * Validate data against a schema or condition
 */
export function validateData<T>(data: T, condition: (data: T) => boolean, errorMessage: string): T {
  if (!condition(data)) {
    throw new ValidationError(errorMessage, {
      context: { data },
    })
  }
  return data
}

/**
 * Simple schema validation
 */
export function validateSchema<T extends Record<string, any>>(
  data: T,
  schema: Record<string, (value: any) => boolean>,
): T {
  const errors: string[] = []

  for (const [key, validator] of Object.entries(schema)) {
    if (key in data) {
      if (!validator(data[key])) {
        errors.push(`Invalid value for field "${key}"`)
      }
    } else {
      errors.push(`Missing required field "${key}"`)
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(`Validation failed: ${errors.join(", ")}`, {
      context: { data, errors },
    })
  }

  return data
}
