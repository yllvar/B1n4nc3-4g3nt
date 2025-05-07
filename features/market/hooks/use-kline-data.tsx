"use client"

import { useState, useEffect } from "react"
import { useMarketData } from "@/features/market/hooks/use-market-data"
import { binanceMarketDataService } from "@/lib/websocket/lib/market-data-service"
import type { Kline } from "@/lib/market/interfaces"

interface UseKlineDataOptions {
  interval?: string
  limit?: number
}

export function useKlineData({ interval = "1m", limit = 30 }: UseKlineDataOptions = {}) {
  const { symbol } = useMarketData()
  const [klineData, setKlineData] = useState<Kline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Don't fetch if symbol is undefined
    if (!symbol) {
      console.warn("Symbol is undefined in useKlineData hook")
      setIsLoading(false)
      return
    }

    let isMounted = true
    const fetchKlineData = async () => {
      try {
        setIsLoading(true)
        // Check if the method exists before calling it
        if (typeof binanceMarketDataService.getKlines !== "function") {
          // Fallback to the correct method name if available
          if (typeof binanceMarketDataService.fetchKlines === "function") {
            const result = await binanceMarketDataService.fetchKlines(symbol, interval, limit)
            if (isMounted && result && result.data) {
              setKlineData(result.data)
              setIsLoading(false)
              setError(null)
            }
          } else {
            throw new Error("Kline data fetching method not available")
          }
        } else {
          const result = await binanceMarketDataService.getKlines(symbol, interval, limit)
          if (isMounted && result) {
            setKlineData(Array.isArray(result) ? result : result.data || [])
            setIsLoading(false)
            setError(null)
          }
        }
      } catch (err) {
        console.error("Error fetching kline data:", err)
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to fetch kline data"))
          setIsLoading(false)
        }
      }
    }

    fetchKlineData()

    // Set up interval to refresh data
    const refreshInterval = setInterval(fetchKlineData, 60000) // Refresh every minute

    return () => {
      isMounted = false
      clearInterval(refreshInterval)
    }
  }, [symbol, interval, limit])

  return { klineData, isLoading, error }
}
