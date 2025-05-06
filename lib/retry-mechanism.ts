import { NetworkError } from "./error-types"

export interface RetryOptions {
  maxRetries?: number
  delay?: number
  backoffFactor?: number
  maxDelay?: number
  retryCondition?: (error: Error) => boolean
  onRetry?: (error: Error, attempt: number) => void
}

/**
 * Generic retry function for any async operation
 */
export async function retry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    backoffFactor = 2,
    maxDelay = 30000,
    retryCondition = (error) => true,
    onRetry = () => {},
  } = options

  let lastError: Error
  let currentDelay = delay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === maxRetries || !retryCondition(lastError)) {
        throw lastError
      }

      onRetry(lastError, attempt + 1)

      await new Promise((resolve) => setTimeout(resolve, currentDelay))
      currentDelay = Math.min(currentDelay * backoffFactor, maxDelay)
    }
  }

  throw lastError!
}

/**
 * Retry function specifically for fetch operations
 */
export async function retryFetch(url: string, options: RequestInit & RetryOptions = {}): Promise<Response> {
  const { maxRetries, delay, backoffFactor, maxDelay, retryCondition, onRetry, ...fetchOptions } = options

  return retry(() => fetch(url, fetchOptions), {
    maxRetries,
    delay,
    backoffFactor,
    maxDelay,
    retryCondition: (error) => {
      // Default retry condition for network requests
      const shouldRetry = error instanceof NetworkError || (error instanceof Error && error.message.includes("network"))
      return retryCondition ? retryCondition(error) : shouldRetry
    },
    onRetry,
  })
}

/**
 * Circuit breaker pattern implementation with retry
 */
export function retryWithCircuitBreaker<T>(
  operation: () => Promise<T>,
  options: RetryOptions & {
    failureThreshold?: number
    resetTimeout?: number
  } = {},
): Promise<T> {
  const { failureThreshold = 5, resetTimeout = 60000, ...retryOptions } = options

  let failures = 0
  let circuitOpen = false
  let lastFailureTime = 0

  return retry(async () => {
    if (circuitOpen) {
      const now = Date.now()
      if (now - lastFailureTime > resetTimeout) {
        // Half-open the circuit
        circuitOpen = false
      } else {
        throw new Error("Circuit is open")
      }
    }

    try {
      const result = await operation()
      // Reset failures on success
      failures = 0
      return result
    } catch (error) {
      failures++
      if (failures >= failureThreshold) {
        circuitOpen = true
        lastFailureTime = Date.now()
      }
      throw error
    }
  }, retryOptions)
}
