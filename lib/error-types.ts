/**
 * Error types for the application
 */

export type ErrorSeverity = "critical" | "high" | "medium" | "low"

export interface ErrorOptions {
  code?: string
  severity?: ErrorSeverity
  context?: Record<string, any>
  recoverable?: boolean
}

/**
 * Base error class for the application
 */
export class AppError extends Error {
  code: string
  severity: ErrorSeverity
  timestamp: Date
  context: Record<string, any>
  recoverable: boolean

  constructor(message: string, options: ErrorOptions = {}) {
    super(message)
    this.name = this.constructor.name
    this.code = options.code || "UNKNOWN_ERROR"
    this.severity = options.severity || "medium"
    this.timestamp = new Date()
    this.context = options.context || {}
    this.recoverable = options.recoverable !== undefined ? options.recoverable : true

    // Set the prototype explicitly to maintain instanceof behavior
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

/**
 * API error for REST API errors
 */
export class ApiError extends AppError {
  statusCode?: number

  constructor(message: string, statusCode?: number, options: ErrorOptions = {}) {
    super(message, {
      code: options.code || "API_ERROR",
      severity: options.severity || "medium",
      context: {
        statusCode,
        ...options.context,
      },
      recoverable: options.recoverable,
    })
    this.statusCode = statusCode

    // Set the prototype explicitly to maintain instanceof behavior
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

/**
 * Network error for HTTP and WebSocket errors
 */
export class NetworkError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      code: options.code || "NETWORK_ERROR",
      severity: options.severity || "high",
      context: options.context,
      recoverable: options.recoverable !== undefined ? options.recoverable : true,
    })

    // Set the prototype explicitly to maintain instanceof behavior
    Object.setPrototypeOf(this, NetworkError.prototype)
  }
}

/**
 * Validation error for invalid data
 */
export class ValidationError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      code: options.code || "VALIDATION_ERROR",
      severity: options.severity || "medium",
      context: options.context,
      recoverable: options.recoverable !== undefined ? options.recoverable : true,
    })

    // Set the prototype explicitly to maintain instanceof behavior
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

/**
 * WebSocket error for WebSocket-specific errors
 */
export class WebSocketError extends NetworkError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      code: options.code || "WEBSOCKET_ERROR",
      severity: options.severity || "high",
      context: options.context,
      recoverable: options.recoverable !== undefined ? options.recoverable : true,
    })

    // Set the prototype explicitly to maintain instanceof behavior
    Object.setPrototypeOf(this, WebSocketError.prototype)
  }
}

/**
 * Rate limit error for API rate limiting
 */
export class RateLimitError extends ApiError {
  retryAfter?: number

  constructor(message: string, retryAfter?: number, options: ErrorOptions = {}) {
    super(message, 429, {
      code: options.code || "RATE_LIMIT_ERROR",
      severity: options.severity || "medium",
      context: {
        retryAfter,
        ...options.context,
      },
      recoverable: options.recoverable !== undefined ? options.recoverable : true,
    })
    this.retryAfter = retryAfter

    // Set the prototype explicitly to maintain instanceof behavior
    Object.setPrototypeOf(this, RateLimitError.prototype)
  }
}

/**
 * Authentication error for auth failures
 */
export class AuthenticationError extends ApiError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, 401, {
      code: options.code || "AUTHENTICATION_ERROR",
      severity: options.severity || "high",
      context: options.context,
      recoverable: options.recoverable !== undefined ? options.recoverable : false,
    })

    // Set the prototype explicitly to maintain instanceof behavior
    Object.setPrototypeOf(this, AuthenticationError.prototype)
  }
}

/**
 * Order Execution Error for trading operations
 */
export class OrderExecutionError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      code: options.code || "ORDER_EXECUTION_ERROR",
      severity: options.severity || "high",
      context: options.context,
      recoverable: options.recoverable !== undefined ? options.recoverable : false,
    })

    // Set the prototype explicitly to maintain instanceof behavior
    Object.setPrototypeOf(this, OrderExecutionError.prototype)
  }
}

/**
 * Authentication error class for handling authentication-related errors
 */
export class AuthError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      code: "AUTH_ERROR",
      severity: "high",
      ...options,
    })

    // Set the prototype explicitly to maintain instanceof behavior
    Object.setPrototypeOf(this, AuthError.prototype)
  }
}

/**
 * Configuration error class for handling configuration-related errors
 */
export class ConfigError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      code: "CONFIG_ERROR",
      severity: "medium",
      ...options,
    })

    // Set the prototype explicitly to maintain instanceof behavior
    Object.setPrototypeOf(this, ConfigError.prototype)
  }
}

/**
 * Data error class for handling data-related errors
 */
export class DataError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      code: "DATA_ERROR",
      severity: "medium",
      ...options,
    })

    // Set the prototype explicitly to maintain instanceof behavior
    Object.setPrototypeOf(this, DataError.prototype)
  }
}

/**
 * Strategy error class for handling trading strategy-related errors
 */
export class StrategyError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      code: "STRATEGY_ERROR",
      severity: "high",
      ...options,
    })

    // Set the prototype explicitly to maintain instanceof behavior
    Object.setPrototypeOf(this, StrategyError.prototype)
  }
}
