"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface CacheEntry<T> {
  data: T
  timestamp: number
  stale: boolean
}

interface UseCacheOptions {
  ttl?: number // Time to live in milliseconds
  staleWhileRevalidate?: boolean // Whether to return stale data while fetching fresh data
}

/**
 * Custom hook for caching API responses and expensive calculations
 * @param key Cache key
 * @param fetchFn Function to fetch data
 * @param options Cache options
 * @returns Cached data, loading state, error, and refetch function
 */
export function useDataCache<T>(key: string, fetchFn: () => Promise<T>, options: UseCacheOptions = {}) {
  const {
    ttl = 60000, // Default TTL: 1 minute
    staleWhileRevalidate = true,
  } = options

  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Use ref for cache to persist across renders
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map())

  const fetchData = useCallback(
    async (force = false) => {
      const cache = cacheRef.current
      const cachedEntry = cache.get(key)
      const now = Date.now()

      // Return cached data if it's fresh
      if (!force && cachedEntry && now - cachedEntry.timestamp < ttl) {
        setData(cachedEntry.data)
        setIsLoading(false)
        return
      }

      // Return stale data immediately if available and staleWhileRevalidate is enabled
      if (staleWhileRevalidate && cachedEntry) {
        setData(cachedEntry.data)
        cache.set(key, { ...cachedEntry, stale: true })
      }

      // Fetch fresh data
      setIsLoading(true)

      try {
        const freshData = await fetchFn()
        cache.set(key, {
          data: freshData,
          timestamp: Date.now(),
          stale: false,
        })

        setData(freshData)
        setError(null)
      } catch (err) {
        console.error(`Error fetching data for key ${key}:`, err)
        setError(err instanceof Error ? err : new Error(String(err)))

        // Keep stale data if available
        if (cachedEntry) {
          setData(cachedEntry.data)
        }
      } finally {
        setIsLoading(false)
      }
    },
    [key, fetchFn, ttl, staleWhileRevalidate],
  )

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchData()

    // Clean up stale entries when component unmounts
    return () => {
      const cache = cacheRef.current
      const now = Date.now()

      for (const [k, entry] of cache.entries()) {
        if (now - entry.timestamp > ttl) {
          cache.delete(k)
        }
      }
    }
  }, [fetchData, ttl])

  // Function to manually refetch data
  const refetch = useCallback(() => fetchData(true), [fetchData])

  return { data, isLoading, error, refetch }
}
