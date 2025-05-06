/**
 * Utility function for memoizing expensive calculations
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyFn: (...args: Parameters<T>) => string,
  ttl = 30000, // Default TTL: 30 seconds
): T {
  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>()

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyFn(...args)
    const cached = cache.get(key)
    const now = Date.now()

    if (cached && now - cached.timestamp < ttl) {
      return cached.value
    }

    const result = fn(...args)
    cache.set(key, { value: result, timestamp: now })

    // Clean up expired cache entries periodically
    if (cache.size > 100) {
      for (const [k, v] of cache.entries()) {
        if (now - v.timestamp > ttl) {
          cache.delete(k)
        }
      }
    }

    return result
  }) as T
}
