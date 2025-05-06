"use client"

import { useEffect } from "react"
import { errorHandler } from "@/lib/error-handling"

/**
 * Component to initialize error logging
 * This should be included in the app layout
 */
export function ErrorLoggerInit() {
  useEffect(() => {
    // Set up global error handlers
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      errorHandler.handleError(event.reason || "Unhandled Promise Rejection", {
        code: "UNHANDLED_REJECTION",
        severity: "high",
        context: { event },
      })

      // Prevent the default handler
      event.preventDefault()
    }

    const handleError = (event: ErrorEvent) => {
      errorHandler.handleError(event.error || event.message, {
        code: "UNHANDLED_ERROR",
        severity: "high",
        context: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      })

      // Prevent the default handler
      event.preventDefault()
    }

    // Register global handlers
    window.addEventListener("unhandledrejection", handleUnhandledRejection)
    window.addEventListener("error", handleError)

    // Clean up
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
      window.removeEventListener("error", handleError)
      errorHandler.cleanup()
    }
  }, [])

  return null
}
