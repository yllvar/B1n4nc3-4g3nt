/**
 * Error handler for centralized error management
 */
import { AppError, type ErrorDetails, type ErrorOptions } from "./error-types"

export interface ErrorHandlerOptions {
  logToConsole?: boolean
  logToServer?: boolean
  serverLogEndpoint?: string
  captureStackTrace?: boolean
  includeContext?: boolean
}

class ErrorHandler {
  private options: ErrorHandlerOptions
  private errorLog: ErrorDetails[] = []
  private maxLogSize = 100
  private subscribers: Set<(errors: ErrorDetails[]) => void> = new Set()

  constructor(options: ErrorHandlerOptions = {}) {
    this.options = {
      logToConsole: true,
      logToServer: false,
      captureStackTrace: true,
      includeContext: true,
      ...options,
    }
  }

  /**
   * Handle an error with appropriate logging and reporting
   * @param error Error to handle
   * @param options Error options
   * @returns The handled error
   */
  public handleError(error: unknown, options: ErrorOptions = {}): AppError {
    // Convert to AppError if not already
    const appError = this.ensureAppError(error, options)

    // Log the error
    this.logError(appError)

    // Report to server if enabled
    if (this.options.logToServer) {
      this.reportToServer(appError)
    }

    return appError
  }

  /**
   * Log an error without additional processing
   * @param error Error to log
   */
  public logError(error: AppError | Error | unknown): void {
    const appError = this.ensureAppError(error)

    // Add to in-memory log
    this.addToErrorLog(appError)

    // Log to console if enabled
    if (this.options.logToConsole) {
      this.logToConsole(appError)
    }

    // Notify subscribers
    this.notifySubscribers()
  }

  /**
   * Get recent errors from the log
   * @param count Number of errors to retrieve
   * @returns Array of recent errors
   */
  public getRecentErrors(count = 10): ErrorDetails[] {
    return this.errorLog.slice(0, count)
  }

  /**
   * Clear the error log
   */
  public clearErrors(): void {
    this.errorLog = []
    this.notifySubscribers()
  }

  /**
   * Update the errors in the log
   * @param errors New errors array
   */
  public updateErrors(errors: ErrorDetails[]): void {
    this.errorLog = errors
    this.notifySubscribers()
  }

  /**
   * Retry all recoverable errors
   */
  public async retryRecoverableErrors(): Promise<void> {
    const promises: Promise<void>[] = []

    for (const error of this.errorLog) {
      if (error.recoverable && error.retryAction) {
        promises.push(error.retryAction())
      }
    }

    await Promise.allSettled(promises)
  }

  /**
   * Subscribe to error updates
   * @param callback Function to call when errors change
   * @returns Unsubscribe function
   */
  public subscribe(callback: (errors: ErrorDetails[]) => void): () => void {
    this.subscribers.add(callback)

    // Immediately call with current errors
    callback([...this.errorLog])

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback)
    }
  }

  /**
   * Set error handler options
   * @param options New options
   */
  public setOptions(options: Partial<ErrorHandlerOptions>): void {
    this.options = { ...this.options, ...options }
  }

  /**
   * Ensure an error is an AppError
   * @param error Error to convert
   * @param options Error options
   * @returns AppError instance
   */
  private ensureAppError(error: unknown, options: ErrorOptions = {}): AppError {
    if (error instanceof AppError) {
      // Update with any new options
      if (Object.keys(options).length > 0) {
        error.code = options.code || error.code
        error.severity = options.severity || error.severity
        error.context = { ...error.context, ...options.context }
        error.recoverable = options.recoverable !== undefined ? options.recoverable : error.recoverable
      }
      return error
    }

    let message: string
    const errorOptions: ErrorOptions = { ...options }

    if (error instanceof Error) {
      message = error.message
      errorOptions.context = {
        ...errorOptions.context,
        originalError: {
          name: error.name,
          stack: error.stack,
        },
      }
    } else if (typeof error === "string") {
      message = error
    } else {
      message = "Unknown error"
      errorOptions.context = {
        ...errorOptions.context,
        originalError: error,
      }
    }

    return new AppError(message, errorOptions)
  }

  /**
   * Add an error to the in-memory log
   * @param error Error to add
   */
  private addToErrorLog(error: AppError): void {
    const errorDetails: ErrorDetails = {
      message: error.message,
      code: error.code,
      severity: error.severity,
      timestamp: error.timestamp,
      context: error.context,
      recoverable: error.recoverable,
      retryAction: error.retryAction,
    }

    this.errorLog.unshift(errorDetails)

    // Trim log if it exceeds max size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize)
    }
  }

  /**
   * Notify all subscribers of error changes
   */
  private notifySubscribers(): void {
    const errorsCopy = [...this.errorLog]
    this.subscribers.forEach((callback) => {
      try {
        callback(errorsCopy)
      } catch (error) {
        console.error("Error in error subscriber:", error)
      }
    })
  }

  /**
   * Log an error to the console
   * @param error Error to log
   */
  private logToConsole(error: AppError): void {
    const severity = error.severity
    const timestamp = error.timestamp.toISOString()
    const prefix = `[${timestamp}] [${severity.toUpperCase()}] [${error.code}]:`

    if (severity === "critical" || severity === "high") {
      console.error(prefix, error.message)
    } else if (severity === "medium") {
      console.warn(prefix, error.message)
    } else {
      console.info(prefix, error.message)
    }

    // Log context if available and enabled
    if (this.options.includeContext && Object.keys(error.context).length > 0) {
      console.group("Error Context:")
      console.dir(error.context)
      console.groupEnd()
    }

    // Log stack trace if available and enabled
    if (this.options.captureStackTrace && error.stack) {
      console.group("Stack Trace:")
      console.log(error.stack)
      console.groupEnd()
    }
  }

  /**
   * Report an error to the server
   * @param error Error to report
   */
  private async reportToServer(error: AppError): Promise<void> {
    if (!this.options.serverLogEndpoint) {
      console.warn("Server logging enabled but no endpoint specified")
      return
    }

    try {
      const payload = {
        message: error.message,
        code: error.code,
        severity: error.severity,
        timestamp: error.timestamp.toISOString(),
        context: this.options.includeContext ? error.context : undefined,
        stack: this.options.captureStackTrace ? error.stack : undefined,
      }

      const response = await fetch(this.options.serverLogEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        console.warn(`Failed to report error to server: ${response.status} ${response.statusText}`)
      }
    } catch (reportError) {
      console.error("Error reporting to server:", reportError)
    }
  }
}

// Create and export a singleton instance
export const errorHandler = new ErrorHandler()
