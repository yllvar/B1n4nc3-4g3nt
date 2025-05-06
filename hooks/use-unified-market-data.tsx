"use client"

import { useState, useEffect } from "react"
import {
  unifiedMarketDataService,
  type MarketTicker,
  type Trade,
  type OrderBook,
  type Kline,
} from "@/lib/market/unified-market-data-service"
import {
  unifiedWebSocketClient,
  type WebSocketStatus,
  type WebSocketMetrics,
} from "@/lib/websocket/unified-websocket-client"

interface UseUnifiedMarketDataProps {
  symbol: string
  klineInterval?: string
}

interface UseUnifiedMarketDataResult {
  ticker: MarketTicker | null
  trades: Trade[]
  orderBook: OrderBook | null
  klines: Kline[]
  connectionStatus: WebSocketStatus
  metrics: WebSocketMetrics
  isLoading: boolean
  error: Error | null
}

export function useUnifiedMarketData({
  symbol,
  klineInterval = "1m",
}: UseUnifiedMarketDataProps): UseUnifiedMarketDataResult {
  const [ticker, setTicker] = useState<MarketTicker | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null)
  const [klines, setKlines] = useState<Kline[]>([])
  const [connectionStatus, setConnectionStatus] = useState<WebSocketStatus>("disconnected")
  const [metrics, setMetrics] = useState<WebSocketMetrics>({
    latency: 0,
    messageRate: 0,
    uptime: 0,
    reconnects: 0,
    lastMessageTime: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    // Initialize the market data service with the current symbol
    unifiedMarketDataService
      .initialize(symbol)
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        setIsLoading(false)
      })

    // Subscribe to ticker updates
    const unsubscribeTicker = unifiedMarketDataService.subscribeToTicker((newTicker) => {
      setTicker(newTicker)
    })

    // Subscribe to trades updates
    const unsubscribeTrades = unifiedMarketDataService.subscribeToTrades((newTrades) => {
      setTrades((prevTrades) => {
        // Combine new trades with existing ones, keeping only the most recent ones
        const combinedTrades = [...newTrades, ...prevTrades]
        // Sort by time descending and limit to 100 trades
        return combinedTrades.sort((a, b) => b.time - a.time).slice(0, 100)
      })
    })

    // Subscribe to order book updates
    const unsubscribeOrderBook = unifiedMarketDataService.subscribeToOrderBook((newOrderBook) => {
      setOrderBook(newOrderBook)
    })

    // Subscribe to klines updates
    const unsubscribeKlines = unifiedMarketDataService.subscribeToKlines((newKlines) => {
      setKlines(newKlines)
    })

    // Subscribe to WebSocket status updates
    const unsubscribeWebSocketStatus = unifiedWebSocketClient.subscribe((status, wsMetrics) => {
      setConnectionStatus(status)
      setMetrics(wsMetrics)
    })

    // Fetch initial klines data
    unifiedMarketDataService
      .getKlines(symbol, klineInterval)
      .then((initialKlines) => {
        if (initialKlines.length > 0) {
          setKlines(initialKlines)
        }
      })
      .catch((err) => {
        console.error("Failed to fetch initial klines:", err)
      })

    // Cleanup function
    return () => {
      unsubscribeTicker()
      unsubscribeTrades()
      unsubscribeOrderBook()
      unsubscribeKlines()
      unsubscribeWebSocketStatus()
    }
  }, [symbol, klineInterval])

  return {
    ticker,
    trades,
    orderBook,
    klines,
    connectionStatus,
    metrics,
    isLoading,
    error,
  }
}
