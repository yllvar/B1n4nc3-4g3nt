/**
 * Retry mechanism for handling transient errors
 */
import { NetworkError } from "./error-types"
import { errorHandler } from "./error-handler"
import { isNetworkOnline } from "./utils/network"

export interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffFactor?: number
  retryableStatusCodes?: number[]
  retryableErrors?: string[]
  onRetry?: (error: Error, attempt: number) => void
  requireNetwork?: boolean
}

const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  initialDelay: 300,
  maxDelay: 5000,
  backoffFactor: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED"],
  onRetry: undefined,
  requireNetwork: true,
}

/**
 * Generic retry function for any async operation
 * @param operation Function to retry
 * @param options Retry options
 * @returns Result of the operation
 */
export async function retry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...defaultRetryOptions, ...options }
  let lastError: Error | null = null
  let attempt = 0

  while (attempt <= opts.maxRetries!) {
    try {
      // Check network status if required
      if (opts.requireNetwork && !isNetworkOnline()) {
        throw new NetworkError("Network is offline", {
          code: "NETWORK_OFFLINE",
          recoverable: true,
        })
      }

      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if we should retry based on the error
      const shouldRetry =
        attempt < opts.maxRetries! &&
        // For HTTP errors
        ((lastError instanceof NetworkError &&
          lastError.context.status &&
          opts.retryableStatusCodes!.includes(lastError.context.status)) ||
          // For network errors
          opts.retryableErrors!.some((code) => lastError!.message.includes(code)))

      if (!shouldRetry) {
        throw lastError
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(opts.initialDelay! * Math.pow(opts.backoffFactor!, attempt), opts.maxDelay!)

      // Call onRetry callback if provided
      if (opts.onRetry) {
        opts.onRetry(lastError, attempt + 1)
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))
      attempt++
    }
  }

  // If we get here, we've exhausted all retries
  throw lastError
}

/**
 * Retry fetch with exponential backoff
 * @param url URL to fetch
 * @param options Fetch options
 * @param retryOptions Retry options
 * @returns Fetch response
 */
export async function retryFetch(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {},
): Promise<Response> {
  return retry(async () => {
    try {
      const response = await fetch(url, options)

      // Check if response is ok
      if (!response.ok) {
        const error = new NetworkError(`HTTP error ${response.status}: ${response.statusText}`, {
          context: {
            url,
            status: response.status,
            statusText: response.statusText,
            method: options.method || "GET",
          },
          recoverable: retryOptions.retryableStatusCodes?.includes(response.status) ?? false,
        })

        // Log the error but don't throw if we're going to retry
        if (retryOptions.retryableStatusCodes?.includes(response.status)) {
          errorHandler.logError(error)
        } else {
          throw error
        }
      }

      return response
    } catch (error) {
      // Convert fetch errors to NetworkError
      if (!(error instanceof NetworkError)) {
        throw new NetworkError(error instanceof Error ? error.message : String(error), {
          context: {
            url,
            method: options.method || "GET",
            originalError: error,
          },
        })
      }
      throw error
    }
  }, retryOptions)
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
          reject(
            new NetworkError(`Operation timed out after ${timeout}ms`, {
              context: { timeout },
              recoverable: true,
            }),
          )
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
