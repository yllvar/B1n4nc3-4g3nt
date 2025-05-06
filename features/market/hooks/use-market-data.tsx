"use client"

import { useState, useEffect, useCallback } from "react"
import { binanceMarketDataProvider } from "@/lib/market/market-data-provider"
import { errorHandler, retry } from "@/lib/error-handling"
import type { MarketTicker } from "@/lib/market/interfaces"

interface UseMarketDataOptions {
  initialSymbol?: string
  autoConnect?: boolean
}

export function useMarketData({ initialSymbol = "BTCUSDT", autoConnect = true }: UseMarketDataOptions = {}) {
  const [symbol, setSymbol] = useState(initialSymbol)
  const [price, setPrice] = useState<number | null>(null)
  const [ticker, setTicker] = useState<MarketTicker | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<string>("disconnected")

  // Fetch initial price and ticker data
  const fetchInitialData = useCallback(async () => {
    if (!symbol) return

    setIsLoading(true)
    setError(null)

    try {
      // Use retry mechanism for better reliability
      const [priceResult, tickerResult] = await Promise.all([
        retry(() => binanceMarketDataProvider.getCurrentPrice(symbol), {
          maxRetries: 3,
          onRetry: (err, attempt) => {
            console.warn(`Retrying price fetch (${attempt}/3): ${err.message}`)
          },
        }),
        retry(() => binanceMarketDataProvider.get24hrTicker(symbol), {
          maxRetries: 3,
          onRetry: (err, attempt) => {
            console.warn(`Retrying ticker fetch (${attempt}/3): ${err.message}`)
          },
        }),
      ])

      if (priceResult.data !== null) {
        setPrice(priceResult.data)
      }

      if (tickerResult.data !== null) {
        setTicker(tickerResult.data)
      }

      setError(null)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)

      errorHandler.handleError(error, {
        code: "MARKET_DATA_FETCH_ERROR",
        severity: "medium",
        context: { symbol, action: "fetchInitialData" },
        recoverable: true,
        retryAction: fetchInitialData,
      })
    } finally {
      setIsLoading(false)
    }
  }, [symbol])

  // Subscribe to real-time updates
  const subscribeToUpdates = useCallback(() => {
    if (!symbol) return () => {}

    // Subscribe to price updates
    const unsubscribePrice = binanceMarketDataProvider.subscribeToPrice(symbol, (result) => {
      if (result.error) {
        errorHandler.handleError(result.error, {
          code: "PRICE_SUBSCRIPTION_ERROR",
          severity: "medium",
          context: { symbol },
          showToast: false,
        })
        return
      }

      if (result.data !== null) {
        setPrice(result.data)
      }
    })

    // Subscribe to ticker updates
    const unsubscribeTicker = binanceMarketDataProvider.subscribeTo24hrTicker(symbol, (result) => {
      if (result.error) {
        errorHandler.handleError(result.error, {
          code: "TICKER_SUBSCRIPTION_ERROR",
          severity: "medium",
          context: { symbol },
          showToast: false,
        })
        return
      }

      if (result.data !== null) {
        setTicker(result.data)
      }
    })

    // Return combined unsubscribe function
    return () => {
      unsubscribePrice()
      unsubscribeTicker()
    }
  }, [symbol])

  // Monitor connection status
  useEffect(() => {
    const unsubscribe = binanceMarketDataProvider.subscribeToConnectionStatus((status) => {
      setConnectionStatus(status)
    })

    return unsubscribe
  }, [])

  // Initialize data and subscriptions
  useEffect(() => {
    if (!autoConnect) return

    fetchInitialData()
    const unsubscribe = subscribeToUpdates()

    return unsubscribe
  }, [symbol, autoConnect, fetchInitialData, subscribeToUpdates])

  // Change symbol
  const changeSymbol = useCallback((newSymbol: string) => {
    setSymbol(newSymbol.toUpperCase())
  }, [])

  return {
    symbol,
    price,
    ticker,
    isLoading,
    error,
    connectionStatus,
    changeSymbol,
    refreshData: fetchInitialData,
  }
}
