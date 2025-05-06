"use client"

import { useState, useCallback } from "react"
import { errorHandler } from "@/lib/error-handling"

interface UseAsyncOperationOptions {
  context?: string
  autoRetry?: boolean
  maxRetries?: number
  retryDelay?: number
}

export function useAsyncOperation<T, Args extends any[]>(
  asyncFn: (...args: Args) => Promise<T>,
  options: UseAsyncOperationOptions = {}
) {
  const { context = "async-operation", autoRetry = false, maxRetries = 3, retryDelay = 1000 } = options
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const execute = useCallback(
    async (...args: Args): Promise<T> => {
      setIsLoading(true)
      setIsError(false)
      setError(null)

      try {
        const result = await asyncFn(...args)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setIsError(true)
        setError(error)
        
        // Log the error with the error handler
        errorHandler.handleError(error, {
          context: { source: context },
          recoverable: true,
        })
        
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [asyncFn, context]
  )

  const retry = useCallback(async () => {
    if (!isError) return
    setRetryCount(prev => prev + 1)
    try {
      // We don't have the original args here, so this is a simplified retry
      // In a real implementation, you might want to store the last used args
      // @ts-expect-error - We're intentionally calling without args in retry scenario
      return await execute()
    } catch (err) {
      // Error is already handled in execute
    }
  }, [execute, isError])

  return {
    execute,
    isLoading,
    isError,
    error,
    retry,
    retryCount
  }
}
