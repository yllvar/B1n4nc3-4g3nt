"use client"

import { useState, useEffect } from "react"
import { enhancedMarketDataService } from "@/lib/market/enhanced-market-data-service"
import type { MarketDataResult, OrderBook, Trade, Kline, MarketTicker } from "@/lib/market/interfaces"

interface UseEnhancedMarketDataProps {
  symbol: string
  klineInterval?: string
  subscribeToOrderBook?: boolean
  subscribeToTrades?: boolean
  subscribeToKlines?: boolean
  subscribeTo24hrTicker?: boolean
}

interface UseEnhancedMarketDataResult {
  price: number | null
  priceResult: MarketDataResult<number> | null
  orderBook: OrderBook | null
  orderBookResult: MarketDataResult<OrderBook> | null
  trades: Trade[]
  tradesResult: MarketDataResult<Trade[]> | null
  klines: Kline[]
  klinesResult: MarketDataResult<Kline[]> | null
  ticker: MarketTicker | null
  tickerResult: MarketDataResult<MarketTicker> | null
  connectionStatus: "connected" | "connecting" | "disconnected" | "error"
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export function useEnhancedMarketData({
  symbol,
  klineInterval = "1m",
  subscribeToOrderBook = false,
  subscribeToTrades = false,
  subscribeToKlines = false,
  subscribeTo24hrTicker = false,
}: UseEnhancedMarketDataProps): UseEnhancedMarketDataResult {
  // State for all data types
  const [price, setPrice] = useState<number | null>(null)
  const [priceResult, setPriceResult] = useState<MarketDataResult<number> | null>(null)

  const [orderBook, setOrderBook] = useState<OrderBook | null>(null)
  const [orderBookResult, setOrderBookResult] = useState<MarketDataResult<OrderBook> | null>(null)

  const [trades, setTrades] = useState<Trade[]>([])
  const [tradesResult, setTradesResult] = useState<MarketDataResult<Trade[]> | null>(null)

  const [klines, setKlines] = useState<Kline[]>([])
  const [klinesResult, setKlinesResult] = useState<MarketDataResult<Kline[]> | null>(null)

  const [ticker, setTicker] = useState<MarketTicker | null>(null)
  const [tickerResult, setTickerResult] = useState<MarketDataResult<MarketTicker> | null>(null)

  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "disconnected" | "error">(
    "connecting",
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Function to refresh all data
  const refresh = async (): Promise<void> => {
    if (!symbol) return

    setIsLoading(true)
    setError(null)

    try {
      // Fetch price
      const priceData = await enhancedMarketDataService.getCurrentPrice(symbol)
      setPriceResult(priceData)
      if (priceData.data !== null) {
        setPrice(priceData.data)
      }

      // Fetch order book if needed
      if (subscribeToOrderBook) {
        const orderBookData = await enhancedMarketDataService.getOrderBook(symbol)
        setOrderBookResult(orderBookData)
        if (orderBookData.data !== null) {
          setOrderBook(orderBookData.data)
        }
      }

      // Fetch trades if needed
      if (subscribeToTrades) {
        const tradesData = await enhancedMarketDataService.getRecentTrades(symbol)
        setTradesResult(tradesData)
        if (tradesData.data && tradesData.data.length > 0) {
          setTrades(tradesData.data)
        }
      }

      // Fetch klines if needed
      if (subscribeToKlines && klineInterval) {
        const klinesData = await enhancedMarketDataService.getKlines(symbol, klineInterval)
        setKlinesResult(klinesData)
        if (klinesData.data && klinesData.data.length > 0) {
          setKlines(klinesData.data)
        }
      }

      // Fetch ticker if needed
      if (subscribeTo24hrTicker) {
        const tickerData = await enhancedMarketDataService.get24hrTicker(symbol)
        setTickerResult(tickerData)
        if (tickerData.data !== null) {
          setTicker(tickerData.data)
        }
      }

      // Update connection status
      setConnectionStatus(enhancedMarketDataService.getStatus())
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    if (!symbol) return

    refresh()

    // Subscribe to price updates
    const unsubscribePrice = enhancedMarketDataService.subscribeToPrice(symbol, (result) => {
      setPriceResult(result)
      if (result.data !== null) {
        setPrice(result.data)
      }
    })

    // Subscribe to order book if needed
    let unsubscribeOrderBook: (() => void) | undefined
    if (subscribeToOrderBook) {
      unsubscribeOrderBook = enhancedMarketDataService.subscribeToOrderBook(symbol, (result) => {
        setOrderBookResult(result)
        if (result.data !== null) {
          setOrderBook(result.data)
        }
      })
    }

    // Subscribe to trades if needed
    let unsubscribeTrades: (() => void) | undefined
    if (subscribeToTrades) {
      unsubscribeTrades = enhancedMarketDataService.subscribeToTrades(symbol, (result) => {
        setTradesResult(result)
        if (result.data && result.data.length > 0) {
          setTrades(result.data)
        }
      })
    }

    // Subscribe to klines if needed
    let unsubscribeKlines: (() => void) | undefined
    if (subscribeToKlines && klineInterval) {
      unsubscribeKlines = enhancedMarketDataService.subscribeToKlines(symbol, klineInterval, (result) => {
        setKlinesResult(result)
        if (result.data && result.data.length > 0) {
          setKlines(result.data)
        }
      })
    }

    // Subscribe to ticker if needed
    let unsubscribeTicker: (() => void) | undefined
    if (subscribeTo24hrTicker) {
      unsubscribeTicker = enhancedMarketDataService.subscribeTo24hrTicker(symbol, (result) => {
        setTickerResult(result)
        if (result.data !== null) {
          setTicker(result.data)
        }
      })
    }

    // Cleanup function
    return () => {
      unsubscribePrice()
      if (unsubscribeOrderBook) unsubscribeOrderBook()
      if (unsubscribeTrades) unsubscribeTrades()
      if (unsubscribeKlines) unsubscribeKlines()
      if (unsubscribeTicker) unsubscribeTicker()
    }
  }, [symbol, klineInterval, subscribeToOrderBook, subscribeToTrades, subscribeToKlines, subscribeTo24hrTicker])

  return {
    price,
    priceResult,
    orderBook,
    orderBookResult,
    trades,
    tradesResult,
    klines,
    klinesResult,
    ticker,
    tickerResult,
    connectionStatus,
    isLoading,
    error,
    refresh,
  }
}
