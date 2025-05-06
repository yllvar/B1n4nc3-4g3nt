"use client"

import { useState, useEffect } from "react"
import { binanceMarketDataProvider } from "@/lib/market/market-data-provider"
import type { MarketDataResult, OrderBook, Trade, Kline, MarketTicker } from "@/lib/market/interfaces"

interface UseBinanceMarketDataOptions {
  symbol: string
  subscribeToPrice?: boolean
  subscribeToOrderBook?: boolean
  subscribeToTrades?: boolean
  subscribeToKlines?: boolean
  klineInterval?: string
  subscribeTo24hrTicker?: boolean
}

interface MarketData {
  price: MarketDataResult<number> | null
  orderBook: MarketDataResult<OrderBook> | null
  trades: MarketDataResult<Trade[]> | null
  klines: MarketDataResult<Kline[]> | null
  ticker: MarketDataResult<MarketTicker> | null
  connectionStatus: string
  isLoading: boolean
  error: Error | null
}

export function useBinanceMarketData({
  symbol,
  subscribeToPrice = true,
  subscribeToOrderBook = false,
  subscribeToTrades = false,
  subscribeToKlines = false,
  klineInterval = "1m",
  subscribeTo24hrTicker = false,
}: UseBinanceMarketDataOptions): MarketData {
  const [marketData, setMarketData] = useState<MarketData>({
    price: null,
    orderBook: null,
    trades: null,
    klines: null,
    ticker: null,
    connectionStatus: "disconnected",
    isLoading: true,
    error: null,
  })

  // Subscribe to connection status changes
  useEffect(() => {
    const unsubscribe = binanceMarketDataProvider.subscribeToConnectionStatus((status) => {
      setMarketData((prev) => ({
        ...prev,
        connectionStatus: status,
      }))
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Subscribe to price updates
  useEffect(() => {
    if (!subscribeToPrice) return

    const unsubscribe = binanceMarketDataProvider.subscribeToPrice(symbol, (result) => {
      setMarketData((prev) => ({
        ...prev,
        price: result,
        isLoading: false,
      }))
    })

    return () => {
      unsubscribe()
    }
  }, [symbol, subscribeToPrice])

  // Subscribe to order book updates
  useEffect(() => {
    if (!subscribeToOrderBook) return

    const unsubscribe = binanceMarketDataProvider.subscribeToOrderBook(symbol, (result) => {
      setMarketData((prev) => ({
        ...prev,
        orderBook: result,
        isLoading: false,
      }))
    })

    return () => {
      unsubscribe()
    }
  }, [symbol, subscribeToOrderBook])

  // Subscribe to trades updates
  useEffect(() => {
    if (!subscribeToTrades) return

    const unsubscribe = binanceMarketDataProvider.subscribeToTrades(symbol, (result) => {
      setMarketData((prev) => ({
        ...prev,
        trades: result,
        isLoading: false,
      }))
    })

    return () => {
      unsubscribe()
    }
  }, [symbol, subscribeToTrades])

  // Subscribe to klines updates
  useEffect(() => {
    if (!subscribeToKlines) return

    const unsubscribe = binanceMarketDataProvider.subscribeToKlines(symbol, klineInterval, (result) => {
      setMarketData((prev) => ({
        ...prev,
        klines: result,
        isLoading: false,
      }))
    })

    return () => {
      unsubscribe()
    }
  }, [symbol, subscribeToKlines, klineInterval])

  // Subscribe to 24hr ticker updates
  useEffect(() => {
    if (!subscribeTo24hrTicker) return

    const unsubscribe = binanceMarketDataProvider.subscribeTo24hrTicker(symbol, (result) => {
      setMarketData((prev) => ({
        ...prev,
        ticker: result,
        isLoading: false,
      }))
    })

    return () => {
      unsubscribe()
    }
  }, [symbol, subscribeTo24hrTicker])

  // Handle errors
  useEffect(() => {
    const hasError =
      marketData.price?.error ||
      marketData.orderBook?.error ||
      marketData.trades?.error ||
      marketData.klines?.error ||
      marketData.ticker?.error

    if (hasError) {
      setMarketData((prev) => ({
        ...prev,
        error: hasError || null,
      }))
    }
  }, [marketData.price, marketData.orderBook, marketData.trades, marketData.klines, marketData.ticker])

  return marketData
}
