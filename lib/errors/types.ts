/**
 * @file Error Types
 * Defines custom error classes and types for the application
 */

export type ErrorSeverity = "low" | "medium" | "high" | "critical"

export interface ErrorOptions {
  code?: string
  severity?: ErrorSeverity
  context?: Record<string, any>
  recoverable?: boolean
  timestamp?: Date
}

/**
 * Base application error class
 */
export class AppError extends Error {
  public code: string
  public severity: ErrorSeverity
  public context: Record<string, any>
  public recoverable: boolean
  public timestamp: Date

  constructor(message: string, options: ErrorOptions = {}) {
    super(message)
    this.name = this.constructor.name
    this.code = options.code || "APP_ERROR"
    this.severity = options.severity || "medium"
    this.context = options.context || {}
    this.recoverable = options.recoverable !== undefined ? options.recoverable : true
    this.timestamp = options.timestamp || new Date()

    // Ensures proper stack trace in modern JS engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

/**
 * API error class for handling API-related errors
 */
export class ApiError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      code: "API_ERROR",
      severity: "medium",
      ...options,
    })
  }
}

/**
 * Network error class for handling network-related errors
 */
export class NetworkError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      code: "NETWORK_ERROR",
      severity: "high",
      ...options,
    })
  }
}

/**
 * Validation error class for handling data validation errors
 */
export class ValidationError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      code: "VALIDATION_ERROR",
      severity: "medium",
      ...options,
    })
  }
}

/**
 * WebSocket error class for handling WebSocket-related errors
 */
export class WebSocketError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      code: "WEBSOCKET_ERROR",
      severity: "high",
      ...options,
    })
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
  }
}

/**
 * Re-export error types from the main error-types.ts file
 * This file exists for backward compatibility
 */

export * from "../error-types"
