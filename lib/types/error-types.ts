/**
 * Error Types
 * Types related to error handling and reporting
 */

// Error severity levels
export type ErrorSeverity = "low" | "medium" | "high" | "critical"

/**
 * Specific error codes for the application
 */
export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",
  WEBSOCKET_ERROR = "WEBSOCKET_ERROR",

  // API errors
  API_ERROR = "API_ERROR",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",

  // Data errors
  INVALID_DATA = "INVALID_DATA",
  MISSING_DATA = "MISSING_DATA",
  DATA_PARSING_ERROR = "DATA_PARSING_ERROR",

  // Business logic errors
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  ORDER_REJECTED = "ORDER_REJECTED",
  POSITION_LIMIT_EXCEEDED = "POSITION_LIMIT_EXCEEDED",

  // Application errors
  INITIALIZATION_ERROR = "INITIALIZATION_ERROR",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",

  // Unknown error
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Detailed error information
 */
export interface ErrorDetails {
  message: string
  code: ErrorCode | string
  severity: ErrorSeverity
  timestamp: Date
  context?: Record<string, any>
  recoverable: boolean
  retryAction?: () => Promise<void>
  source?: string
  stack?: string
}

/**
 * Options for error handling
 */
export interface ErrorHandlerOptions {
  context?: Record<string, any>
  showToast?: boolean
  severity?: ErrorSeverity
  recoverable?: boolean
  retryAction?: () => Promise<void>
  code?: ErrorCode | string
}

/**
 * Circuit breaker state information
 */
export interface CircuitBreakerState {
  errorCount: number
  firstErrorTime: number
  lastErrorTime: number
  status: "CLOSED" | "OPEN" | "HALF_OPEN"
  nextRetryTime: number
}

/**
 * Error handler interface
 * Defines methods for handling and managing errors
 */
export interface ErrorHandlerInterface {
  handleError(error: Error | string, options?: ErrorHandlerOptions): void
  getRecentErrors(): ErrorDetails[]
  clearErrors(): void
  updateErrors(errors: ErrorDetails[]): void
  subscribe(callback: (errors: ErrorDetails[]) => void): () => void
  isNetworkOnline(): boolean
  retryRecoverableErrors(): Promise<void>
  resetCircuitBreaker(code: string): void
  registerErrorListener(listener: (error: Error, options: ErrorHandlerOptions) => void): void
  createErrorHandler<T extends (...args: any[]) => any>(
    fn: T,
    options?: ErrorHandlerOptions,
  ): (...args: Parameters<T>) => ReturnType<T>
}
