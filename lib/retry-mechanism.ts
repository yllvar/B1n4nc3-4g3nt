/**
 * Retry mechanism for handling transient errors
 */

// Simple network check that works in both browser and server environments
const isNetworkOnline = () => {
  // In browser environment, use navigator.onLine
  if (typeof navigator !== "undefined" && navigator && typeof navigator.onLine === "boolean") {
    return navigator.onLine
  }
  // In server environment, assume online
  return true
}

export interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  factor?: number
  jitter?: boolean
  onRetry?: (error: Error, attempt: number) => void
  retryCondition?: (error: Error) => boolean
  requireNetwork?: boolean
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param options Retry options
 * @returns Promise that resolves with the function result or rejects after max retries
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    jitter = true,
    onRetry,
    retryCondition = () => true,
    requireNetwork = true,
  } = options

  let attempt = 0

  async function attempt_retry(): Promise<T> {
    try {
      // Check network status if required
      if (requireNetwork && !isNetworkOnline()) {
        throw new Error("Network is offline")
      }

      return await fn()
    } catch (error) {
      attempt++

      // If we've reached max retries or the error doesn't meet retry condition, throw
      if (attempt >= maxRetries || !(error instanceof Error) || !retryCondition(error)) {
        throw error
      }

      // Calculate delay with exponential backoff
      let delay = Math.min(initialDelay * Math.pow(factor, attempt - 1), maxDelay)

      // Add jitter if enabled (helps prevent thundering herd problem)
      if (jitter) {
        delay = Math.random() * delay * 0.3 + delay * 0.7
      }

      // Call onRetry callback if provided
      if (onRetry && error instanceof Error) {
        onRetry(error, attempt)
      }

      // Wait and retry
      await new Promise((resolve) => setTimeout(resolve, delay))
      return attempt_retry()
    }
  }

  return attempt_retry()
}

/**
 * Retry a fetch request with exponential backoff
 * @param input Request info
 * @param init Request init
 * @param options Retry options
 * @returns Promise that resolves with the fetch response
 */
export async function retryFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RetryOptions = {},
): Promise<Response> {
  return retry(
    async () => {
      const response = await fetch(input, init)

      // Throw for non-2xx responses
      if (!response.ok) {
        const error = new Error(`HTTP error ${response.status}: ${response.statusText}`)
        // Add response details to the error
        Object.defineProperty(error, "response", {
          value: response,
          enumerable: false,
        })
        throw error
      }

      return response
    },
    {
      // Default retry condition for fetch: retry on network errors and 5xx responses
      retryCondition: (error) => {
        // Retry on network errors
        if (error.message.includes("fetch failed") || error.message.includes("network")) {
          return true
        }

        // Retry on 5xx errors (server errors)
        const response = (error as any).response
        return response && response.status >= 500 && response.status < 600
      },
      ...options,
    },
  )
}

/**
 * Retry a function with a timeout
 * @param fn Function to retry
 * @param timeout Timeout in milliseconds
 * @param retryOptions Retry options
 * @returns Result of the function
 */
export async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  timeout: number,
  retryOptions: RetryOptions = {},
): Promise<T> {
  return retry(() => {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeout}ms`))
        }, timeout)
      }),
    ])
  }, retryOptions)
}

/**
 * Safely parse JSON with error handling
 * @param json JSON string to parse
 * @param fallback Fallback value if parsing fails
 * @returns Parsed JSON or fallback value
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch (error) {
    console.warn("Failed to parse JSON:", error)
    return fallback
  }
}

/**
 * Create a safe version of a function that catches errors
 * @param fn Function to make safe
 * @param fallback Fallback value if function throws
 * @returns Safe function that never throws
 */
export function makeSafe<T, Args extends any[]>(fn: (...args: Args) => T, fallback: T): (...args: Args) => T {
  return (...args: Args): T => {
    try {
      return fn(...args)
    } catch (error) {
      console.error("Error in safe function:", error)
      return fallback
    }
  }
}

/**
 * Safely access a property path in an object
 * @param obj Object to access
 * @param path Property path (e.g., 'user.profile.name')
 * @param fallback Fallback value if path doesn't exist
 * @returns Property value or fallback
 */
export function safeGet<T>(obj: any, path: string, fallback: T): T {
  try {
    const parts = path.split(".")
    let current = obj

    for (const part of parts) {
      if (current === null || current === undefined) {
        return fallback
      }
      current = current[part]
    }

    return current === undefined ? fallback : current
  } catch (error) {
    return fallback
  }
}
