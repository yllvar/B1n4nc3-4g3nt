"use client"

import { useState, useEffect } from "react"
import { errorHandler, type ErrorDetails } from "@/lib/error-handling"

// Simple network check that works in both browser and server environments
const isNetworkOnline = () => {
  // In browser environment, use navigator.onLine
  if (typeof navigator !== "undefined" && navigator && typeof navigator.onLine === "boolean") {
    return navigator.onLine
  }
  // In server environment, assume online
  return true
}

interface UseErrorHandlingOptions {
  filterBySeverity?: ("low" | "medium" | "high" | "critical")[]
  filterByCode?: string[]
  limit?: number
}

export function useErrorHandling(options: UseErrorHandlingOptions = {}) {
  const { filterBySeverity, filterByCode, limit } = options
  const [errors, setErrors] = useState<ErrorDetails[]>([])
  const [hasErrors, setHasErrors] = useState(false)
  const [hasCriticalErrors, setHasCriticalErrors] = useState(false)
  const [isOnline, setIsOnline] = useState(isNetworkOnline())

  useEffect(() => {
    // Subscribe to error updates
    const unsubscribe = errorHandler.subscribe((allErrors) => {
      // Apply filters if specified
      let filteredErrors = [...allErrors]

      if (filterBySeverity && filterBySeverity.length > 0) {
        filteredErrors = filteredErrors.filter((error) => filterBySeverity.includes(error.severity))
      }

      if (filterByCode && filterByCode.length > 0) {
        filteredErrors = filteredErrors.filter((error) => filterByCode.includes(error.code))
      }

      // Apply limit if specified
      if (limit && limit > 0) {
        filteredErrors = filteredErrors.slice(0, limit)
      }

      setErrors(filteredErrors)
      setHasErrors(filteredErrors.length > 0)
      setHasCriticalErrors(filteredErrors.some((e) => e.severity === "critical"))
    })

    // Set up network status listeners
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline)
      window.addEventListener("offline", handleOffline)
    }

    // Cleanup subscription and event listeners
    return () => {
      unsubscribe()
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline)
        window.removeEventListener("offline", handleOffline)
      }
    }
  }, [filterBySeverity, filterByCode, limit])

  const clearErrors = () => {
    errorHandler.clearErrors()
  }

  const retryRecoverableErrors = async () => {
    await errorHandler.retryRecoverableErrors()
  }

  const dismissError = (index: number) => {
    const newErrors = [...errors]
    newErrors.splice(index, 1)
    errorHandler.updateErrors(newErrors)
  }

  return {
    errors,
    hasErrors,
    hasCriticalErrors,
    clearErrors,
    retryRecoverableErrors,
    dismissError,
    isNetworkOnline: isOnline,
  }
}
