import { errorHandler, type ErrorDetails } from "@/lib/error-handling"

// This service handles sending errors to external monitoring services
// and provides methods for persisting errors locally for debugging
export class ErrorLogger {
  private static instance: ErrorLogger
  private sentErrors = new Set<string>() // Keep track of errors we've already sent

  private constructor() {
    // Subscribe to errors from the error handler
    errorHandler.subscribe(this.processErrors)
  }

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger()
    }
    return ErrorLogger.instance
  }

  private processErrors = (errors: ErrorDetails[]) => {
    // Process new errors that haven't been sent yet
    errors.forEach((error) => {
      const errorKey = this.getErrorKey(error)

      if (!this.sentErrors.has(errorKey)) {
        this.logError(error)
        this.sentErrors.add(errorKey)
      }
    })
  }

  private getErrorKey(error: ErrorDetails): string {
    // Create a unique key for each error to avoid duplicate sending
    return `${error.code}-${error.message}-${JSON.stringify(error.context)}`
  }

  private logError(error: ErrorDetails): void {
    // Log to console for development
    if (process.env.NODE_ENV === "development") {
      console.group(`[Error Logger] ${error.code} (${error.severity})`)
      console.error(error.message)
      console.info("Context:", error.context || "No context")
      console.info("Time:", error.timestamp.toISOString())
      console.groupEnd()
    }

    // Send to external service (e.g., Sentry, LogRocket, etc.)
    // This is where you would integrate with your preferred error monitoring service
    this.sendToExternalService(error)

    // Store in local storage for debugging if needed
    this.storeLocally(error)
  }

  private sendToExternalService(error: ErrorDetails): void {
    // Example integration with an external service
    // This is a placeholder - replace with your actual implementation

    // If we're in production, you might want to send to a real service
    if (process.env.NODE_ENV === "production") {
      try {
        // Example format for an error tracking service
        const payload = {
          level: error.severity,
          message: error.message,
          code: error.code,
          timestamp: error.timestamp.toISOString(),
          context: error.context,
          environment: process.env.NODE_ENV,
          user: this.getUserInfo(),
        }

        // This would be replaced with your actual error tracking code
        // e.g., Sentry.captureException(new Error(error.message), { extra: payload })

        // Placeholder for sending the error
        console.log("[ErrorLogger] Would send to external service:", payload)
      } catch (err) {
        // Don't let the error logger throw errors
        console.error("Failed to send error to external service:", err)
      }
    }
  }

  private storeLocally(error: ErrorDetails): void {
    // Store last 50 errors in localStorage for debugging
    if (typeof window !== "undefined") {
      try {
        // Get existing errors
        const storedErrors = JSON.parse(localStorage.getItem("debug_errors") || "[]")

        // Add new error with timestamp
        storedErrors.unshift({
          message: error.message,
          code: error.code,
          severity: error.severity,
          timestamp: error.timestamp.toISOString(),
          context: error.context,
        })

        // Keep only the last 50
        const trimmedErrors = storedErrors.slice(0, 50)

        // Save back to localStorage
        localStorage.setItem("debug_errors", JSON.stringify(trimmedErrors))
      } catch (e) {
        // Fail silently - this is just for debugging
        console.error("Failed to store error locally:", e)
      }
    }
  }

  private getUserInfo(): object {
    // This would be replaced with actual user information if available
    // Could come from your auth system or user preferences
    return {
      // Example user info
      // id: 'anonymous',
      // sessionId: '123-456-789'
    }
  }

  // Clear the sent errors tracking set
  public resetTracking(): void {
    this.sentErrors.clear()
  }

  // Clear locally stored errors
  public clearLocalErrors(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("debug_errors")
    }
  }
}

// Create singleton instance
export const errorLogger = ErrorLogger.getInstance()
