/**
 * Binance Market Data Service
 * Handles fetching and processing market data from Binance API
 */
import { unifiedWebSocketClient } from "@/lib/websocket/unified-websocket-client"
import { errorHandler } from "@/lib/error-handling"
import type { OrderBookEntry, Trade, KlineData, Ticker24hr, MarketDataServiceInterface } from "@/lib/types"

export class BinanceMarketDataService implements MarketDataServiceInterface {
  private baseApiUrl: string
  private apiKey: string | undefined
  private apiSecret: string | undefined
  private activeSubscriptions: Set<string> = new Set()

  constructor() {
    // Get environment variables with fallbacks
    this.baseApiUrl = process.env.BINANCE_API_BASE_URL || "https://fapi.binance.com"
    this.apiKey = process.env.BINANCE_API_KEY
    this.apiSecret = process.env.BINANCE_API_SECRET
  }

  /**
   * Get headers for authenticated requests
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    // Add API key if available
    if (this.apiKey) {
      headers["X-MBX-APIKEY"] = this.apiKey
    }

    return headers
  }

  /**
   * Format symbol to ensure it's in the correct format for Binance API
   */
  private formatSymbol(symbol: string): string {
    // Remove any spaces and convert to uppercase
    return symbol.replace(/\s+/g, "").toUpperCase()
  }

  /**
   * Fetch 24hr ticker statistics
   */
  public async get24hrTicker(symbol: string): Promise<Ticker24hr> {
    try {
      const formattedSymbol = this.formatSymbol(symbol)
      console.log(`Fetching 24hr ticker for symbol: ${formattedSymbol}`)

      // Use the unifiedWebSocketClient for fallback if needed
      if (unifiedWebSocketClient.isFallbackMode() || unifiedWebSocketClient.getStatus() !== "connected") {
        return await unifiedWebSocketClient.fetchFallbackData<Ticker24hr>("/fapi/v1/ticker/24hr", {
          symbol: formattedSymbol,
        })
      }

      const response = await fetch(`${this.baseApiUrl}/fapi/v1/ticker/24hr?symbol=${formattedSymbol}`, {
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`HTTP error fetching 24hr ticker! Status: ${response.status}, Response: ${errorText}`)
        throw new Error(`HTTP error! Status: ${response.status}, Response: ${errorText}`)
      }

      const data = await response.json()
      return {
        symbol: data.symbol,
        priceChange: Number.parseFloat(data.priceChange),
        priceChangePercent: Number.parseFloat(data.priceChangePercent),
        weightedAvgPrice: Number.parseFloat(data.weightedAvgPrice),
        lastPrice: Number.parseFloat(data.lastPrice),
        lastQty: Number.parseFloat(data.lastQty),
        openPrice: Number.parseFloat(data.openPrice),
        highPrice: Number.parseFloat(data.highPrice),
        lowPrice: Number.parseFloat(data.lowPrice),
        volume: Number.parseFloat(data.volume),
        quoteVolume: Number.parseFloat(data.quoteVolume),
        openTime: data.openTime,
        closeTime: data.closeTime,
        firstId: data.firstId,
        lastId: data.lastId,
        count: data.count,
      }
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "get24hrTicker", symbol },
        severity: "medium",
      })
      throw error
    }
  }

  /**
   * Fetch kline/candlestick data
   */
  public async getKlines(symbol: string, interval: string, limit = 500): Promise<KlineData[]> {
    try {
      const formattedSymbol = this.formatSymbol(symbol)
      console.log(`Fetching klines for symbol: ${formattedSymbol}, interval: ${interval}, limit: ${limit}`)

      // Use the unifiedWebSocketClient for fallback if needed
      if (unifiedWebSocketClient.isFallbackMode() || unifiedWebSocketClient.getStatus() !== "connected") {
        const data = await unifiedWebSocketClient.fetchFallbackData<any[]>("/fapi/v1/klines", {
          symbol: formattedSymbol,
          interval,
          limit: limit.toString(),
        })

        return data.map((kline: any[]) => ({
          openTime: kline[0],
          open: Number.parseFloat(kline[1]),
          high: Number.parseFloat(kline[2]),
          low: Number.parseFloat(kline[3]),
          close: Number.parseFloat(kline[4]),
          volume: Number.parseFloat(kline[5]),
          closeTime: kline[6],
          quoteVolume: Number.parseFloat(kline[7]),
          trades: kline[8],
          takerBuyBaseVolume: Number.parseFloat(kline[9]),
          takerBuyQuoteVolume: Number.parseFloat(kline[10]),
        }))
      }

      const response = await fetch(
        `${this.baseApiUrl}/fapi/v1/klines?symbol=${formattedSymbol}&interval=${interval}&limit=${limit}`,
        {
          headers: this.getHeaders(),
        },
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`HTTP error fetching klines! Status: ${response.status}, Response: ${errorText}`)
        throw new Error(`HTTP error! Status: ${response.status}, Response: ${errorText}`)
      }

      const data = await response.json()
      return data.map((kline: any[]) => ({
        openTime: kline[0],
        open: Number.parseFloat(kline[1]),
        high: Number.parseFloat(kline[2]),
        low: Number.parseFloat(kline[3]),
        close: Number.parseFloat(kline[4]),
        volume: Number.parseFloat(kline[5]),
        closeTime: kline[6],
        quoteVolume: Number.parseFloat(kline[7]),
        trades: kline[8],
        takerBuyBaseVolume: Number.parseFloat(kline[9]),
        takerBuyQuoteVolume: Number.parseFloat(kline[10]),
      }))
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "getKlines", symbol, interval, limit },
        severity: "medium",
      })
      throw error
    }
  }

  /**
   * Fetch order book
   */
  public async getOrderBook(symbol: string, limit = 100): Promise<{ bids: OrderBookEntry[]; asks: OrderBookEntry[] }> {
    try {
      const formattedSymbol = this.formatSymbol(symbol)
      console.log(`Fetching order book for symbol: ${formattedSymbol}, limit: ${limit}`)

      // Use the unifiedWebSocketClient for fallback if needed
      if (unifiedWebSocketClient.isFallbackMode() || unifiedWebSocketClient.getStatus() !== "connected") {
        const data = await unifiedWebSocketClient.fetchFallbackData<any>("/fapi/v1/depth", {
          symbol: formattedSymbol,
          limit: limit.toString(),
        })

        return {
          bids: data.bids.map((bid: string[]) => ({
            price: Number.parseFloat(bid[0]),
            quantity: Number.parseFloat(bid[1]),
          })),
          asks: data.asks.map((ask: string[]) => ({
            price: Number.parseFloat(ask[0]),
            quantity: Number.parseFloat(ask[1]),
          })),
        }
      }

      const response = await fetch(`${this.baseApiUrl}/fapi/v1/depth?symbol=${formattedSymbol}&limit=${limit}`, {
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`HTTP error fetching order book! Status: ${response.status}, Response: ${errorText}`)
        throw new Error(`HTTP error! Status: ${response.status}, Response: ${errorText}`)
      }

      const data = await response.json()
      return {
        bids: data.bids.map((bid: string[]) => ({
          price: Number.parseFloat(bid[0]),
          quantity: Number.parseFloat(bid[1]),
        })),
        asks: data.asks.map((ask: string[]) => ({
          price: Number.parseFloat(ask[0]),
          quantity: Number.parseFloat(ask[1]),
        })),
      }
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "getOrderBook", symbol, limit },
        severity: "medium",
      })
      throw error
    }
  }

  /**
   * Fetch recent trades
   */
  public async getRecentTrades(symbol: string, limit = 500): Promise<Trade[]> {
    try {
      const formattedSymbol = this.formatSymbol(symbol)
      console.log(`Fetching recent trades for symbol: ${formattedSymbol}, limit: ${limit}`)

      // Use the unifiedWebSocketClient for fallback if needed
      if (unifiedWebSocketClient.isFallbackMode() || unifiedWebSocketClient.getStatus() !== "connected") {
        const data = await unifiedWebSocketClient.fetchFallbackData<any[]>("/fapi/v1/trades", {
          symbol: formattedSymbol,
          limit: limit.toString(),
        })

        return data.map((trade: any) => ({
          id: trade.id,
          price: Number.parseFloat(trade.price),
          quantity: Number.parseFloat(trade.qty),
          time: trade.time,
          isBuyerMaker: trade.isBuyerMaker,
        }))
      }

      const response = await fetch(`${this.baseApiUrl}/fapi/v1/trades?symbol=${formattedSymbol}&limit=${limit}`, {
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`HTTP error fetching trades! Status: ${response.status}, Response: ${errorText}`)
        throw new Error(`HTTP error! Status: ${response.status}, Response: ${errorText}`)
      }

      const data = await response.json()
      return data.map((trade: any) => ({
        id: trade.id,
        price: Number.parseFloat(trade.price),
        quantity: Number.parseFloat(trade.qty),
        time: trade.time,
        isBuyerMaker: trade.isBuyerMaker,
      }))
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "getRecentTrades", symbol, limit },
        severity: "medium",
      })
      throw error
    }
  }

  /**
   * Subscribe to price updates (using bookTicker stream)
   */
  public subscribeToPrice(symbol: string, callback: (price: number) => void): () => void {
    const normalizedSymbol = symbol.replace(/\s+/g, "").toLowerCase()
    console.log(`Subscribing to price updates for: ${normalizedSymbol}`)

    // Track this subscription
    this.activeSubscriptions.add(`${normalizedSymbol}@bookTicker`)

    // Use unifiedWebSocketClient instead of direct WebSocket client
    return unifiedWebSocketClient.subscribeToStream(`${normalizedSymbol}@bookTicker`, (data) => {
      // Extract the best bid price from the bookTicker data
      const price = Number.parseFloat(data.b)
      callback(price)
    })
  }

  /**
   * Subscribe to aggregate trade updates
   */
  public subscribeToAggTrades(symbol: string, callback: (data: any) => void): () => void {
    const normalizedSymbol = symbol.replace(/\s+/g, "").toLowerCase()
    console.log(`Subscribing to aggregate trades for: ${normalizedSymbol}`)

    // Track this subscription
    this.activeSubscriptions.add(`${normalizedSymbol}@aggTrade`)

    // Use unifiedWebSocketClient
    return unifiedWebSocketClient.subscribeToStream(`${normalizedSymbol}@aggTrade`, callback)
  }

  /**
   * Subscribe to mark price updates
   */
  public subscribeToMarkPrice(symbol: string, callback: (data: any) => void, interval: "1s" | "3s" = "3s"): () => void {
    const normalizedSymbol = symbol.replace(/\s+/g, "").toLowerCase()
    console.log(`Subscribing to mark price for: ${normalizedSymbol}, interval: ${interval}`)

    const streamName = `${normalizedSymbol}@markPrice${interval === "1s" ? "@1s" : ""}`

    // Track this subscription
    this.activeSubscriptions.add(streamName)

    // Use unifiedWebSocketClient
    return unifiedWebSocketClient.subscribeToStream(streamName, callback)
  }

  /**
   * Subscribe to kline/candlestick updates
   */
  public subscribeToKlines(symbol: string, interval: string, callback: (data: any) => void): () => void {
    const normalizedSymbol = symbol.replace(/\s+/g, "").toLowerCase()
    console.log(`Subscribing to klines for: ${normalizedSymbol}, interval: ${interval}`)

    const streamName = `${normalizedSymbol}@kline_${interval}`

    // Track this subscription
    this.activeSubscriptions.add(streamName)

    // Use unifiedWebSocketClient
    return unifiedWebSocketClient.subscribeToStream(streamName, callback)
  }

  /**
   * Subscribe to book ticker updates
   */
  public subscribeToBookTicker(symbol: string, callback: (data: any) => void): () => void {
    const normalizedSymbol = symbol.replace(/\s+/g, "").toLowerCase()
    console.log(`Subscribing to book ticker for: ${normalizedSymbol}`)

    const streamName = `${normalizedSymbol}@bookTicker`

    // Track this subscription
    this.activeSubscriptions.add(streamName)

    // Use unifiedWebSocketClient
    return unifiedWebSocketClient.subscribeToStream(streamName, callback)
  }

  /**
   * Subscribe to mini ticker updates (24hr rolling window)
   */
  public subscribeToMiniTicker(symbol: string, callback: (data: any) => void): () => void {
    const normalizedSymbol = symbol.replace(/\s+/g, "").toLowerCase()
    console.log(`Subscribing to mini ticker for: ${normalizedSymbol}`)

    const streamName = `${normalizedSymbol}@miniTicker`

    // Track this subscription
    this.activeSubscriptions.add(streamName)

    // Use unifiedWebSocketClient
    return unifiedWebSocketClient.subscribeToStream(streamName, callback)
  }

  /**
   * Subscribe to multiple streams at once
   */
  public subscribeToMultipleStreams(
    symbol: string,
    streams: ("aggTrade" | "markPrice" | "bookTicker" | "depth" | "miniTicker")[],
    callback: (data: any) => void,
  ): () => void {
    const normalizedSymbol = symbol.replace(/\s+/g, "").toLowerCase()
    console.log(`Subscribing to multiple streams for: ${normalizedSymbol}, streams: ${streams.join(", ")}`)

    const unsubscribers: (() => void)[] = []

    streams.forEach((streamType) => {
      const streamName = `${normalizedSymbol}@${streamType}`
      this.activeSubscriptions.add(streamName)
      const unsubscribe = unifiedWebSocketClient.subscribeToStream(streamName, callback)
      unsubscribers.push(unsubscribe)
    })

    // Return a function that unsubscribes from all streams
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }

  /**
   * Unsubscribe from all active subscriptions
   */
  public unsubscribeAll(): void {
    console.log(`Unsubscribing from all ${this.activeSubscriptions.size} streams`)
    this.activeSubscriptions.clear()
  }

  /**
   * Get all active subscriptions
   */
  public getActiveSubscriptions(): string[] {
    return Array.from(this.activeSubscriptions)
  }
}

// Create singleton instance
export const binanceMarketDataService = new BinanceMarketDataService()
