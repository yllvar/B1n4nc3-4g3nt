"use client"

import type React from "react"

import { createContext, useEffect, useState } from "react"
import { binanceMarketDataService } from "@/lib/websocket/lib/market-data-service"
import type { Ticker24hr } from "@/lib/websocket/lib/market-data-service"

interface MarketData {
  symbol: string
  currentPrice: number
  priceChangePercent: number
  highPrice: number
  lowPrice: number
  volume: number
  isLoading: boolean
  error: Error | null
}

// Create context with default values
export const MarketDataContext = createContext<MarketData>({
  symbol: "SOLUSDT", // Default symbol
  currentPrice: 0,
  priceChangePercent: 0,
  highPrice: 0,
  lowPrice: 0,
  volume: 0,
  isLoading: true,
  error: null,
})

interface MarketDataProviderProps {
  children: React.ReactNode
  symbol?: string
}

export function MarketDataProvider({ children, symbol = "SOLUSDT" }: MarketDataProviderProps) {
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0)
  const [highPrice, setHighPrice] = useState<number>(0)
  const [lowPrice, setLowPrice] = useState<number>(0)
  const [volume, setVolume] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    console.log("MarketDataProvider initialized with symbol:", symbol)

    const initializeDataFetching = async () => {
      try {
        // Fetch initial 24h ticker data
        const ticker: Ticker24hr = await binanceMarketDataService.get24hrTicker(symbol)
        setCurrentPrice(ticker.lastPrice)
        setPriceChangePercent(ticker.priceChangePercent)
        setHighPrice(ticker.highPrice)
        setLowPrice(ticker.lowPrice)
        setVolume(ticker.volume)
        setIsLoading(false)

        // Subscribe to real-time updates
        subscribeToStreams(symbol)
      } catch (err) {
        console.error("Error fetching market data:", err)
        setError(err instanceof Error ? err : new Error("Failed to fetch market data"))
        setIsLoading(false)
      }
    }

    const subscribeToStreams = (symbol: string) => {
      try {
        // Subscribe to price updates
        binanceMarketDataService.subscribeToPrice(symbol, (price: number) => {
          setCurrentPrice(price)
        })

        // Subscribe to 24h mini ticker for stats updates
        binanceMarketDataService.subscribeToMiniTicker(symbol, (data) => {
          setHighPrice(Number.parseFloat(data.h))
          setLowPrice(Number.parseFloat(data.l))
          setVolume(Number.parseFloat(data.v))
          // Calculate price change percent
          if (data.o && data.c) {
            const open = Number.parseFloat(data.o)
            const close = Number.parseFloat(data.c)
            if (open > 0) {
              const changePercent = ((close - open) / open) * 100
              setPriceChangePercent(changePercent)
            }
          }
        })
      } catch (err) {
        console.error("Error subscribing to WebSocket streams:", err)
        setError(err instanceof Error ? err : new Error("Failed to subscribe to WebSocket streams"))
      }
    }

    initializeDataFetching()

    return () => {
      // Cleanup subscriptions
      binanceMarketDataService.unsubscribeAll()
    }
  }, [symbol])

  const value: MarketData = {
    symbol, // Include symbol in the context value
    currentPrice,
    priceChangePercent,
    highPrice,
    lowPrice,
    volume,
    isLoading,
    error,
  }

  return <MarketDataContext.Provider value={value}>{children}</MarketDataContext.Provider>
}
