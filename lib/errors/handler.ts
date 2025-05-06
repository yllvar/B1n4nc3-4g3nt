/**
 * @file Error Handler
 * Provides a centralized error handling service
 */

import { AppError, type ErrorSeverity } from "./types"

// Import toast conditionally to avoid issues during build
let toast: any
if (typeof window !== "undefined") {
  // This will only run in the browser
  import("@/components/ui/use-toast")
    .then((module) => {
      toast = module.toast
    })
    .catch(() => {
      console.warn("Toast module could not be loaded")
    })
}

export interface ErrorHandlerOptions {
  context?: Record<string, any>
  showToast?: boolean
  severity?: ErrorSeverity
  recoverable?: boolean
  retryAction?: () => Promise<void>
  code?: string
}

export interface ErrorDetails {
  message: string
  code: string
  severity: ErrorSeverity
  timestamp: Date
  context?: Record<string, any>
  recoverable: boolean
  retryAction?: () => Promise<void>
  source?: string
  stack?: string
}

// Circuit breaker state
interface CircuitBreakerState {
  errorCount: number
  firstErrorTime: number
  lastErrorTime: number
  status: "CLOSED" | "OPEN" | "HALF_OPEN"
  nextRetryTime: number
}

export class ErrorHandlingService {
  private static instance: ErrorHandlingService
  private errors: ErrorDetails[] = []
  private maxErrorsToStore = 100
  private errorSubscribers: Set<(errors: ErrorDetails[]) => void> = new Set()
  private isOnline = true
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map()
  private errorListeners: Array<(error: Error, options: ErrorHandlerOptions) => void> = []

  private constructor() {
    // Listen for online/offline events if in browser environment
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline)
      window.addEventListener("offline", this.handleOffline)
      this.isOnline = navigator.onLine
    }
  }

  private handleOnline = () => {
    this.isOnline = true
    // Retry all recoverable errors
    this.retryRecoverableErrors()

    // Log the event
    console.info("Network connection restored")
    if (toast) {
      toast({
        title: "Network Connection Restored",
        description: "Your internet connection is back online.",
        variant: "default",
      })
    }
  }

  private handleOffline = () => {
    this.isOnline = false
    this.handleError(
      new AppError("You are currently offline. Some features may be unavailable.", {
        code: "NETWORK_OFFLINE",
        severity: "medium",
        recoverable: true,
      }),
    )
  }

  public static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService()
    }
    return ErrorHandlingService.instance
  }

  public isNetworkOnline(): boolean {
    return this.isOnline
  }

  public async retryRecoverableErrors(): Promise<void> {
    const recoverableErrors = this.errors.filter((e) => e.recoverable && e.retryAction)

    for (const error of recoverableErrors) {
      if (error.retryAction) {
        try {
          await error.retryAction()
          // Remove the error if retry was successful
          this.errors = this.errors.filter((e) => e !== error)
        } catch (retryError) {
          // Update the error with a new timestamp
          error.timestamp = new Date()
        }
      }
    }

    // Notify subscribers of changes
    this.notifySubscribers()
  }

  /**
   * Register an error listener
   * @param listener Function to call when an error is handled
   */
  public registerErrorListener(listener: (error: Error, options: ErrorHandlerOptions) => void): void {
    this.errorListeners.push(listener)
  }

  public handleError(error: Error | AppError | string, options?: ErrorHandlerOptions): void {
    // Create error details object
    const errorDetails: ErrorDetails = this.createErrorDetails(error, options)

    // Check circuit breaker before proceeding
    if (this.shouldBlockError(errorDetails)) {
      return
    }

    // Log to console with appropriate level based on severity
    this.logErrorToConsole(errorDetails)

    // Store error
    this.storeError(errorDetails)

    // Show toast notification if requested
    if (options?.showToast !== false && toast) {
      this.showErrorToast(errorDetails)
    }

    // For critical errors, we might want to do something more
    if (errorDetails.severity === "critical") {
      this.handleCriticalError(errorDetails)
    }

    // Notify subscribers
    this.notifySubscribers()

    const errorObj =
      typeof error === "string"
        ? new AppError(error, {
            code: options?.code,
            severity: options?.severity,
            context: options?.context,
            recoverable: options?.recoverable,
          })
        : error

    // Log the error
    console.error("Error handled:", errorObj, options)

    // Notify all listeners
    this.errorListeners.forEach((listener) => {
      try {
        listener(errorObj, options || {})
      } catch (listenerError) {
        console.error("Error in error listener:", listenerError)
      }
    })
  }

  private createErrorDetails(error: Error | AppError | string, options?: ErrorHandlerOptions): ErrorDetails {
    if (typeof error === "string") {
      return {
        message: error,
        code: options?.code || "UNKNOWN_ERROR",
        severity: options?.severity || "medium",
        timestamp: new Date(),
        context: options?.context,
        recoverable: options?.recoverable !== undefined ? options?.recoverable : true,
        retryAction: options?.retryAction,
        source: "application",
        stack: new Error().stack,
      }
    } else if (error instanceof AppError) {
      return {
        message: error.message,
        code: error.code,
        severity: options?.severity || error.severity,
        timestamp: error.timestamp,
        context: { ...error.context, ...options?.context },
        recoverable: options?.recoverable !== undefined ? options?.recoverable : error.recoverable,
        retryAction: options?.retryAction,
        source: "application",
        stack: error.stack,
      }
    } else {
      return {
        message: error.message || "An unknown error occurred",
        code: options?.code || "UNKNOWN_ERROR",
        severity: options?.severity || "medium",
        timestamp: new Date(),
        context: options?.context,
        recoverable: options?.recoverable !== undefined ? options?.recoverable : true,
        retryAction: options?.retryAction,
        source: "application",
        stack: error.stack,
      }
    }
  }

  private logErrorToConsole(errorDetails: ErrorDetails): void {
    const { severity, code, message, context, stack, source } = errorDetails

    const logPrefix = `[${severity.toUpperCase()}] [${source}] ${code}:`

    switch (severity) {
      case "critical":
        console.error(logPrefix, message, context || "", stack || "")
        break
      case "high":
        console.error(logPrefix, message, context || "")
        break
      case "medium":
        console.warn(logPrefix, message, context || "")
        break
      case "low":
        console.info(logPrefix, message, context || "")
        break
    }
  }

  private storeError(errorDetails: ErrorDetails): void {
    this.errors.unshift(errorDetails)
    if (this.errors.length > this.maxErrorsToStore) {
      this.errors.pop()
    }

    // Update circuit breaker
    this.updateCircuitBreaker(errorDetails)
  }

  private showErrorToast(errorDetails: ErrorDetails): void {
    if (toast) {
      toast({
        title: `Error: ${errorDetails.code}`,
        description: errorDetails.message,
        variant: this.getSeverityVariant(errorDetails.severity),
      })
    } else {
      console.warn(`Error Toast: ${errorDetails.code} - ${errorDetails.message}`)
    }
  }

  private handleCriticalError(errorDetails: ErrorDetails): void {
    // For critical errors, we might want to:
    // 1. Send to an error tracking service
    // 2. Show a modal to the user
    // 3. Redirect to an error page
    // 4. Attempt to recover the application state

    console.error("CRITICAL ERROR:", errorDetails)

    // Example: Show a more prominent notification for critical errors
    if (toast) {
      toast({
        title: "Critical System Error",
        description: `${errorDetails.code}: ${errorDetails.message}. Please contact support.`,
        variant: "destructive",
        duration: 10000, // Show for longer
      })
    }
  }

  public getRecentErrors(): ErrorDetails[] {
    return [...this.errors]
  }

  public clearErrors(): void {
    this.errors = []
    this.notifySubscribers()
  }

  public updateErrors(errors: ErrorDetails[]): void {
    this.errors = errors
    this.notifySubscribers()
  }

  public subscribe(callback: (errors: ErrorDetails[]) => void): () => void {
    this.errorSubscribers.add(callback)
    // Immediately call with current errors
    callback([...this.errors])

    // Return unsubscribe function
    return () => {
      this.errorSubscribers.delete(callback)
    }
  }

  private notifySubscribers(): void {
    const errorsCopy = [...this.errors]
    this.errorSubscribers.forEach((callback) => {
      try {
        callback(errorsCopy)
      } catch (error) {
        console.error("Error in error subscriber:", error)
      }
    })
  }

  private getSeverityVariant(severity: ErrorSeverity): "default" | "destructive" {
    return severity === "high" || severity === "critical" ? "destructive" : "default"
  }

  // Circuit breaker pattern implementation
  private updateCircuitBreaker(errorDetails: ErrorDetails): void {
    const { code, severity } = errorDetails

    // Only track medium, high, and critical errors
    if (severity === "low") return

    // Get or create circuit breaker state
    let state = this.circuitBreakers.get(code)
    if (!state) {
      state = {
        errorCount: 0,
        firstErrorTime: Date.now(),
        lastErrorTime: Date.now(),
        status: "CLOSED",
        nextRetryTime: 0,
      }
      this.circuitBreakers.set(code, state)
    }

    // Update state
    state.errorCount++
    state.lastErrorTime = Date.now()

    // Check if we should open the circuit
    if (state.status === "CLOSED" && this.shouldOpenCircuit(state)) {
      state.status = "OPEN"
      state.nextRetryTime = Date.now() + this.getRetryDelay(state.errorCount)
      console.warn(`Circuit breaker opened for error code: ${code}`)
    }

    // Check if we should try half-open state
    if (state.status === "OPEN" && Date.now() > state.nextRetryTime) {
      state.status = "HALF_OPEN"
      console.info(`Circuit breaker half-open for error code: ${code}`)
    }
  }

  private shouldOpenCircuit(state: CircuitBreakerState): boolean {
    const timeWindow = 60000 // 1 minute
    const errorThreshold = 5 // 5 errors

    // Open circuit if we have X errors in Y time window
    return state.errorCount >= errorThreshold && state.lastErrorTime - state.firstErrorTime <= timeWindow
  }

  private shouldBlockError(errorDetails: ErrorDetails): boolean {
    const state = this.circuitBreakers.get(errorDetails.code)

    // If no circuit breaker or circuit is closed, don't block
    if (!state || state.status === "CLOSED") return false

    // If circuit is open, block the error
    if (state.status === "OPEN") return true

    // If half-open, let one error through to test
    if (state.status === "HALF_OPEN") {
      // This error is a test, change back to closed if it succeeds
      // (This will happen elsewhere when the operation succeeds)
      return false
    }

    return false
  }

  public resetCircuitBreaker(code: string): void {
    const state = this.circuitBreakers.get(code)
    if (state) {
      state.status = "CLOSED"
      state.errorCount = 0
      state.firstErrorTime = Date.now()
      console.info(`Circuit breaker reset for error code: ${code}`)
    }
  }

  private getRetryDelay(errorCount: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000 // 1 second
    const maxDelay = 60000 // 1 minute
    const exponentialDelay = Math.min(maxDelay, baseDelay * Math.pow(2, errorCount - 1))
    const jitter = Math.random() * 0.3 + 0.85 // 0.85-1.15
    return Math.floor(exponentialDelay * jitter)
  }

  // Clean up event listeners
  public cleanup(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline)
      window.removeEventListener("offline", this.handleOffline)
    }
  }

  /**
   * Create a wrapped version of a function that handles errors
   * @param fn Function to wrap
   * @param options Error handling options
   */
  public createErrorHandler<T extends (...args: any[]) => any>(
    fn: T,
    options: ErrorHandlerOptions = {},
  ): (...args: Parameters<T>) => ReturnType<T> {
    return (...args: Parameters<T>): ReturnType<T> => {
      try {
        const result = fn(...args)

        // Handle promises
        if (result instanceof Promise) {
          return result.catch((error) => {
            this.handleError(error, options)
            throw error
          }) as ReturnType<T>
        }

        return result
      } catch (error) {
        this.handleError(error as Error, options)
        throw error
      }
    }
  }
}

// Create and export the singleton instance
export const errorHandler = ErrorHandlingService.getInstance()
