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

    // Handle network status changes
    const handleOnline = () => {
      console.log("Network connection restored")
    }

    const handleOffline = () => {
      console.log("Network connection lost")
      errorHandler.handleError("Network connection lost", {
        code: "NETWORK_OFFLINE",
        severity: "medium",
        recoverable: true,
      })
    }

    // Register global handlers
    window.addEventListener("unhandledrejection", handleUnhandledRejection)
    window.addEventListener("error", handleError)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Clean up
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
      window.removeEventListener("error", handleError)
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      errorHandler.cleanup?.()
    }
  }, [])

  return null
}
