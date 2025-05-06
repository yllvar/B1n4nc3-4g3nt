"use client"

import type React from "react"
import { createContext, useContext } from "react"
import { useBinanceMarketData } from "@/hooks/use-binance-market-data"
import type { MarketDataResult, OrderBook, Trade, Kline, MarketTicker } from "@/lib/market/interfaces"

interface BinanceMarketDataContextValue {
  price: MarketDataResult<number> | null
  orderBook: MarketDataResult<OrderBook> | null
  trades: MarketDataResult<Trade[]> | null
  klines: MarketDataResult<Kline[]> | null
  ticker: MarketDataResult<MarketTicker> | null
  connectionStatus: string
  isLoading: boolean
  error: Error | null
  symbol: string
}

const BinanceMarketDataContext = createContext<BinanceMarketDataContextValue | undefined>(undefined)

interface BinanceMarketDataProviderProps {
  children: React.ReactNode
  symbol: string
  subscribeToPrice?: boolean
  subscribeToOrderBook?: boolean
  subscribeToTrades?: boolean
  subscribeToKlines?: boolean
  klineInterval?: string
  subscribeTo24hrTicker?: boolean
}

export function BinanceMarketDataProvider({
  children,
  symbol,
  subscribeToPrice = true,
  subscribeToOrderBook = false,
  subscribeToTrades = false,
  subscribeToKlines = false,
  klineInterval = "1m",
  subscribeTo24hrTicker = false,
}: BinanceMarketDataProviderProps) {
  const marketData = useBinanceMarketData({
    symbol,
    subscribeToPrice,
    subscribeToOrderBook,
    subscribeToTrades,
    subscribeToKlines,
    klineInterval,
    subscribeTo24hrTicker,
  })

  const value: BinanceMarketDataContextValue = {
    ...marketData,
    symbol,
  }

  return <BinanceMarketDataContext.Provider value={value}>{children}</BinanceMarketDataContext.Provider>
}

export function useBinanceMarketDataContext() {
  const context = useContext(BinanceMarketDataContext)

  if (context === undefined) {
    throw new Error("useBinanceMarketDataContext must be used within a BinanceMarketDataProvider")
  }

  return context
}
