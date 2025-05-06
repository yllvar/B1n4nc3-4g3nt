/**
 * Comprehensive error handling module
 * This file re-exports all error handling functionality
 */

// Re-export all error types
export * from "./error-types"

// Re-export error handler
export * from "./error-handler"

// Re-export retry mechanism
export * from "./retry-mechanism"

// Additional utility functions

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
