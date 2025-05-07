/**
 * Error types for the application
 */

export type ErrorSeverity = "low" | "medium" | "high" | "critical"

export interface ErrorOptions {
  code?: string
  severity?: ErrorSeverity
  context?: Record<string, any>
  recoverable?: boolean
  retryAction?: () => Promise<void>
  showToast?: boolean
}

export interface ErrorDetails {
  message: string
  code: string
  severity: ErrorSeverity
  timestamp: Date
  context: Record<string, any>
  recoverable: boolean
  retryAction?: () => Promise<void>
}

export class AppError extends Error {
  public code: string
  public severity: ErrorSeverity
  public timestamp: Date
  public context: Record<string, any>
  public recoverable: boolean
  public retryAction?: () => Promise<void>

  constructor(message: string, options: ErrorOptions = {}) {
    super(message)

    this.name = this.constructor.name
    this.code = options.code || "APP_ERROR"
    this.severity = options.severity || "medium"
    this.timestamp = new Date()
    this.context = options.context || {}
    this.recoverable = options.recoverable || false
    this.retryAction = options.retryAction

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export class ApiError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      code: options.code || "API_ERROR",
      severity: options.severity || "high",
      ...options,
    })

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

export class NetworkError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      code: options.code || "NETWORK_ERROR",
      severity: options.severity || "high",
      ...options,
    })

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, NetworkError.prototype)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      code: options.code || "VALIDATION_ERROR",
      severity: options.severity || "medium",
      ...options,
    })

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

export class WebSocketError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      code: options.code || "WEBSOCKET_ERROR",
      severity: options.severity || "high",
      ...options,
    })

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, WebSocketError.prototype)
  }
}

export class AuthError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      code: options.code || "AUTH_ERROR",
      severity: options.severity || "high",
      ...options,
    })

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AuthError.prototype)
  }
}

export class ConfigError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      code: options.code || "CONFIG_ERROR",
      severity: options.severity || "medium",
      ...options,
    })

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ConfigError.prototype)
  }
}

export class DataError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      code: options.code || "DATA_ERROR",
      severity: options.severity || "medium",
      ...options,
    })

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, DataError.prototype)
  }
}

export class StrategyError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      code: options.code || "STRATEGY_ERROR",
      severity: options.severity || "high",
      ...options,
    })

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, StrategyError.prototype)
  }
}

export class OrderExecutionError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      code: options.code || "ORDER_EXECUTION_ERROR",
      severity: options.severity || "critical",
      ...options,
    })

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, OrderExecutionError.prototype)
  }
}
