/**
 * Retry mechanism for handling transient errors
 */
import { NetworkError } from "./error-types"
import { errorHandler } from "./error-handler"

export interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffFactor?: number
  retryableStatusCodes?: number[]
  retryableErrors?: string[]
  onRetry?: (error: Error, attempt: number) => void
}

const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  initialDelay: 300,
  maxDelay: 5000,
  backoffFactor: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED"],
  onRetry: undefined,
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
