/**
 * Comprehensive Error Handling Module
 * This file contains all error handling functionality in one place to avoid import issues
 */

// Re-export everything from the individual modules
export * from "./error-types"
export * from "./error-handler"
export * from "./retry-mechanism"

// Additional utility functions

/**
 * Utility function for handling API errors
 */
export function handleApiError(
  error: unknown,
  context = "API",
  options: {
    showToast?: boolean
    severity?: import("./error-types").ErrorSeverity
    retryAction?: () => Promise<void>
  } = {},
): void {
  const { showToast = true, severity = "medium", retryAction } = options

  const message = error instanceof Error ? error.message : String(error)

  import("./error-handler").then(({ errorHandler }) => {
    errorHandler.handleError(message, {
      context: { source: context },
      showToast,
      severity,
      recoverable: !!retryAction,
      retryAction,
    })
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
    severity?: import("./error-types").ErrorSeverity
    reconnectAction?: () => Promise<void>
  } = {},
): void {
  const { showToast = true, severity = "high", reconnectAction } = options

  const message = error instanceof Error ? error.message : String(error)

  import("./error-handler").then(({ errorHandler }) => {
    errorHandler.handleError(message, {
      context: { source: context },
      showToast,
      severity,
      recoverable: !!reconnectAction,
      retryAction: reconnectAction,
      code: "WEBSOCKET_ERROR",
    })
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
    severity?: import("./error-types").ErrorSeverity
    data?: any
  } = {},
): void {
  const { showToast = false, severity = "medium", data } = options

  const message = error instanceof Error ? error.message : String(error)

  import("./error-handler").then(({ errorHandler }) => {
    errorHandler.handleError(message, {
      context: { source: context, data },
      showToast,
      severity,
      code: "DATA_PROCESSING_ERROR",
    })
  })
}

/**
 * Validate data against a schema or condition
 */
export function validateData<T>(data: T, condition: (data: T) => boolean, errorMessage: string): T {
  if (!condition(data)) {
    const { ValidationError } = require("./error-types")
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
    const { ValidationError } = require("./error-types")
    throw new ValidationError(`Validation failed: ${errors.join(", ")}`, {
      context: { data, errors },
    })
  }

  return data
}
