"use client"

import { useState, useEffect } from "react"
import { errorHandler } from "@/lib/error-handling"
import { ErrorMessage } from "@/components/error/error-message"

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)

    // Create handlers
    const handleOnline = () => {
      setIsOnline(true)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    // Add event listeners
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Clean up
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (isOnline) {
    return null
  }

  return (
    <div className="fixed bottom-16 left-1/2 z-50 w-96 -translate-x-1/2 transform">
      <ErrorMessage
        variant="warning"
        title="You are offline"
        message="Some features may not work while you are disconnected from the internet."
        retryLabel="Retry Connection"
        onRetry={() => {
          // Try to reconnect by retrying recoverable errors
          errorHandler.retryRecoverableErrors()
          // Here you could also manually trigger your API requests to check connectivity
        }}
      />
    </div>
  )
}
