/**
 * Binance Market Data Service
 * Handles fetching and processing market data from Binance API
 */
import { binanceWebSocketClient } from "@/features/websocket/lib/websocket-client"

export interface OrderBookEntry {
  price: number
  quantity: number
}

export interface Trade {
  id: number
  price: number
  quantity: number
  time: number
  isBuyerMaker: boolean
}

export interface KlineData {
  openTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  closeTime: number
  quoteVolume: number
  trades: number
  takerBuyBaseVolume: number
  takerBuyQuoteVolume: number
}

export interface Ticker24hr {
  symbol: string
  priceChange: number
  priceChangePercent: number
  lastPrice: number
  highPrice: number
  lowPrice: number
  volume: number
}

export interface MiniTickerData {
  e: string // Event type
  E: number // Event time
  s: string // Symbol
  c: string // Close price
  o: string // Open price
  h: string // High price
  l: string // Low price
  v: string // Total traded base asset volume
  q: string // Total traded quote asset volume
}

class BinanceMarketDataService {
  private baseApiUrl = process.env.BINANCE_API_BASE_URL || "https://fapi.binance.com"
  private activeSubscriptions: (() => void)[] = []

  // Get 24hr ticker statistics
  async get24hrTicker(symbol: string): Promise<Ticker24hr> {
    try {
      const response = await fetch(`${this.baseApiUrl}/fapi/v1/ticker/24hr?symbol=${symbol}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch 24hr ticker: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        symbol: data.symbol,
        priceChange: Number.parseFloat(data.priceChange),
        priceChangePercent: Number.parseFloat(data.priceChangePercent),
        lastPrice: Number.parseFloat(data.lastPrice),
        highPrice: Number.parseFloat(data.highPrice),
        lowPrice: Number.parseFloat(data.lowPrice),
        volume: Number.parseFloat(data.volume),
      }
    } catch (error) {
      console.error("Error fetching 24hr ticker:", error)
      throw error
    }
  }

  // Subscribe to price updates via bookTicker stream
  subscribeToPrice(symbol: string, callback: (price: number) => void): () => void {
    try {
      const normalizedSymbol = symbol.toLowerCase()
      const unsubscribe = binanceWebSocketClient.connectToStream(`${normalizedSymbol}@bookTicker`, (data) => {
        // Use best bid price as current price
        const price = Number.parseFloat(data.b)
        callback(price)
      })

      this.activeSubscriptions.push(unsubscribe)
      return unsubscribe
    } catch (error) {
      console.error("Error subscribing to price updates:", error)
      throw error
    }
  }

  // Subscribe to miniTicker updates (24hr rolling window statistics)
  subscribeToMiniTicker(symbol: string, callback: (data: MiniTickerData) => void): () => void {
    try {
      const normalizedSymbol = symbol.toLowerCase()
      const unsubscribe = binanceWebSocketClient.connectToStream(`${normalizedSymbol}@miniTicker`, (data) => {
        callback(data as MiniTickerData)
      })

      this.activeSubscriptions.push(unsubscribe)
      return unsubscribe
    } catch (error) {
      console.error("Error subscribing to miniTicker:", error)
      throw error
    }
  }

  // Get kline data
  async getKlineData(symbol: string, interval = "1m", limit = 30): Promise<KlineData[]> {
    try {
      const response = await fetch(
        `${this.baseApiUrl}/fapi/v1/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`,
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch kline data: ${response.statusText}`)
      }

      const data = await response.json()

      // Format the kline data
      return data.map((item: any) => ({
        openTime: item[0],
        open: Number.parseFloat(item[1]),
        high: Number.parseFloat(item[2]),
        low: Number.parseFloat(item[3]),
        close: Number.parseFloat(item[4]),
        volume: Number.parseFloat(item[5]),
        closeTime: item[6],
        quoteVolume: Number.parseFloat(item[7]),
        trades: item[8],
        takerBuyBaseVolume: Number.parseFloat(item[9]),
        takerBuyQuoteVolume: Number.parseFloat(item[10]),
      }))
    } catch (error) {
      console.error("Error fetching kline data:", error)
      throw error
    }
  }

  // Subscribe to kline updates
  subscribeToKlines(symbol: string, interval: string, callback: (data: any) => void): () => void {
    try {
      const normalizedSymbol = symbol.toLowerCase()
      const unsubscribe = binanceWebSocketClient.connectToStream(`${normalizedSymbol}@kline_${interval}`, callback)
      this.activeSubscriptions.push(unsubscribe)
      return unsubscribe
    } catch (error) {
      console.error("Error subscribing to klines:", error)
      throw error
    }
  }

  // Unsubscribe from all active subscriptions
  unsubscribeAll(): void {
    this.activeSubscriptions.forEach((unsubscribe) => unsubscribe())
    this.activeSubscriptions = []
  }
}

export const binanceMarketDataService = new BinanceMarketDataService()
