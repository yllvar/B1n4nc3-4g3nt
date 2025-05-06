"use client"

import { useState, useEffect, useCallback } from "react"
import { useErrorBoundary } from "react-error-boundary"
import { BinanceMarketDataProvider, type MarketDataResult } from "@/lib/market/market-data-provider"
import { errorHandler, retry } from "@/lib/error-handling"
import type { MarketTicker } from "@/lib/market/interfaces"

interface UseMarketDataOptions {
  symbol: string
  autoConnect?: boolean
}

export function useMarketData({ symbol, autoConnect = true }: UseMarketDataOptions) {
  const { showBoundary } = useErrorBoundary()
  const [price, setPrice] = useState<number | null>(null)
  const [ticker, setTicker] = useState<MarketTicker | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<string>("disconnected")

  // Fetch initial price and ticker data
  const fetchInitialData = useCallback(async (): Promise<void> => {
    if (!symbol) return

    const abortController = new AbortController()
    setIsLoading(true)
    setError(null)

    try {
      const createAbortableOperation = <T,>(operation: () => Promise<T>) => {
        return async () => {
          if (abortController.signal.aborted) {
            throw new DOMException('Aborted', 'AbortError')
          }
          return operation()
        }
      }

      const [priceResult, tickerResult] = await Promise.all([
        retry(createAbortableOperation(() => 
          BinanceMarketDataProvider.getInstance().getCurrentPrice(symbol)
        ), {
          maxRetries: 3,
          onRetry: (err, attempt) => {
            console.warn(`Retrying price fetch (${attempt}/3): ${err.message}`)
          },
          retryCondition: (err) => !abortController.signal.aborted && !(err instanceof DOMException && err.name === 'AbortError')
        }),
        retry(createAbortableOperation(() => 
          BinanceMarketDataProvider.getInstance().get24hrTicker(symbol)
        ), {
          maxRetries: 3,
          onRetry: (err: Error, attempt: number) => {
            console.warn(`Retrying ticker fetch (${attempt}/3): ${err.message}`)
          },
          retryCondition: (err: Error) => !abortController.signal.aborted && !(err instanceof DOMException && err.name === 'AbortError')
        }),
      ])

      if (priceResult.data !== null) setPrice(priceResult.data)
      if (tickerResult.data !== null) setTicker(tickerResult.data)
      setError(null)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      showBoundary(error)
      setError(error)

      errorHandler.handleError(error, {
        code: "MARKET_DATA_FETCH_ERROR",
        severity: "medium",
        context: { symbol, action: "fetchInitialData" },
        recoverable: true,
        retryAction: fetchInitialData,
      })
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [symbol, showBoundary])

  // Subscribe to real-time updates
  const subscribeToUpdates = useCallback(() => {
    if (!symbol) return () => {}
    let isActive = true

    const handleError = (error: Error) => {
      if (!isActive) return
      showBoundary(error)
      setError(error)
      BinanceMarketDataProvider.getInstance().startFallbackPolling(symbol, (data: {price?: number, ticker?: MarketTicker}) => {
        if (data.price) setPrice(data.price)
        if (data.ticker) setTicker(data.ticker)
      })
    }

    const unsubscribePrice = BinanceMarketDataProvider.getInstance().subscribeToPrice(symbol, (result: MarketDataResult<number>) => {
      if (!isActive) return
      if (result.error) {
        handleError(result.error)
        return
      }
      if (result.data !== null) setPrice(result.data)
    })

    const unsubscribeTicker = BinanceMarketDataProvider.getInstance().subscribeTo24hrTicker(symbol, (result: MarketDataResult<MarketTicker>) => {
      if (!isActive) return
      if (result.error) {
        handleError(result.error)
        return
      }
      if (result.data !== null) setTicker(result.data)
    })

    return () => {
      isActive = false
      unsubscribePrice()
      unsubscribeTicker()
      BinanceMarketDataProvider.getInstance().stopFallbackPolling(symbol)
    }
  }, [symbol, showBoundary])

  // Monitor connection status
  useEffect(() => {
    const unsubscribe = BinanceMarketDataProvider.getInstance().subscribeToConnectionStatus((status: string) => {
      setConnectionStatus(status)
    })

    return unsubscribe
  }, [])

  // Initialize data and subscriptions
  useEffect(() => {
    if (!autoConnect) return

    const abortController = new AbortController()
    fetchInitialData()
    const unsubscribe = subscribeToUpdates()

    return () => {
      abortController.abort()
      unsubscribe()
    }
  }, [symbol, autoConnect, fetchInitialData, subscribeToUpdates])

  return {
    symbol,
    price,
    ticker,
    isLoading,
    error,
    connectionStatus,
    refreshData: fetchInitialData,
  }
}
