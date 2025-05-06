import { unifiedWebSocketClient } from "../websocket/unified-websocket-client"
import { restApiService } from "./rest-api-service"
import { errorHandler } from "../error-handling"
import type { MarketDataResult, OrderBook, Trade, Kline, MarketTicker } from "./interfaces"

/**
 * Unified interface for market data providers
 */
export interface MarketDataProvider {
  // Core methods for getting market data
  getCurrentPrice(symbol: string): Promise<MarketDataResult<number>>
  getOrderBook(symbol: string, limit?: number): Promise<MarketDataResult<OrderBook>>
  getRecentTrades(symbol: string, limit?: number): Promise<MarketDataResult<Trade[]>>
  getKlines(symbol: string, interval: string, limit?: number): Promise<MarketDataResult<Kline[]>>
  get24hrTicker(symbol: string): Promise<MarketDataResult<MarketTicker>>

  // Subscription methods
  subscribeToPrice(symbol: string, callback: (result: MarketDataResult<number>) => void): () => void
  subscribeToOrderBook(symbol: string, callback: (result: MarketDataResult<OrderBook>) => void): () => void
  subscribeToTrades(symbol: string, callback: (result: MarketDataResult<Trade[]>) => void): () => void
  subscribeToKlines(symbol: string, interval: string, callback: (result: MarketDataResult<Kline[]>) => void): () => void
  subscribeTo24hrTicker(symbol: string, callback: (result: MarketDataResult<MarketTicker>) => void): () => void

  // Utility methods
  getStatus(): "connected" | "connecting" | "disconnected" | "error" | "fallback"
  getActiveSubscriptions(): string[]
  unsubscribeAll(): void
}

/**
 * Options for the BinanceMarketDataProvider
 */
export interface BinanceMarketDataProviderOptions {
  cacheTTL?: number // Cache time-to-live in milliseconds
  preferWebSocket?: boolean // Whether to prefer WebSocket over REST API
  debug?: boolean // Enable debug logging
}

/**
 * Unified implementation of MarketDataProvider for Binance
 * Handles both WebSocket and REST API with automatic fallback
 */
export class BinanceMarketDataProvider implements MarketDataProvider {
  private static instance: BinanceMarketDataProvider
  private activeSubscriptions: Set<string> = new Set()
  private cache: Map<string, { data: any; timestamp: number; source: string }> = new Map()
  private cacheTTL: number
  private preferWebSocket: boolean
  private debug: boolean
  private connectionStatus: "connected" | "connecting" | "disconnected" | "error" | "fallback" = "disconnected"
  private connectionStatusListeners: Set<(status: string) => void> = new Set()

  private constructor(options: BinanceMarketDataProviderOptions = {}) {
    this.cacheTTL = options.cacheTTL || 30000 // Default 30 seconds
    this.preferWebSocket = options.preferWebSocket !== false // Default true
    this.debug = options.debug || false

    // Monitor WebSocket connection status
    this.monitorConnectionStatus()
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(options?: BinanceMarketDataProviderOptions): BinanceMarketDataProvider {
    if (!BinanceMarketDataProvider.instance) {
      BinanceMarketDataProvider.instance = new BinanceMarketDataProvider(options)
    }
    return BinanceMarketDataProvider.instance
  }

  /**
   * Monitor WebSocket connection status
   */
  private monitorConnectionStatus(): void {
    unifiedWebSocketClient.subscribe((status) => {
      this.connectionStatus = status
      this.notifyConnectionStatusListeners()
    })
  }

  /**
   * Notify connection status listeners
   */
  private notifyConnectionStatusListeners(): void {
    this.connectionStatusListeners.forEach((listener) => {
      try {
        listener(this.connectionStatus)
      } catch (error) {
        console.error("Error in connection status listener:", error)
      }
    })
  }

  /**
   * Subscribe to connection status changes
   */
  public subscribeToConnectionStatus(callback: (status: string) => void): () => void {
    this.connectionStatusListeners.add(callback)

    // Call immediately with current status
    callback(this.connectionStatus)

    return () => {
      this.connectionStatusListeners.delete(callback)
    }
  }

  /**
   * Format symbol for consistency
   */
  private formatSymbol(symbol: string): string {
    return symbol.replace(/\s+/g, "").toUpperCase()
  }

  /**
   * Get cache key for a specific data type
   */
  private getCacheKey(type: string, symbol: string, params?: Record<string, string>): string {
    const formattedSymbol = this.formatSymbol(symbol)
    let key = `${type}:${formattedSymbol}`

    if (params) {
      const paramString = Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join("&")
      key += `:${paramString}`
    }

    return key
  }

  /**
   * Get data from cache if valid
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) return null

    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > this.cacheTTL) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Store data in cache
   */
  private storeInCache<T>(key: string, data: T, source: string): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      source,
    })
  }

  /**
   * Log debug messages
   */
  private log(...args: any[]): void {
    if (this.debug) {
      console.log("[BinanceMarketDataProvider]", ...args)
    }
  }

  /**
   * Check if WebSocket is available and preferred
   */
  private shouldUseWebSocket(): boolean {
    if (!this.preferWebSocket) return false

    const status = unifiedWebSocketClient.getStatus()
    return status === "connected"
  }

  /**
   * Get current WebSocket connection status
   */
  public getStatus(): "connected" | "connecting" | "disconnected" | "error" | "fallback" {
    return this.connectionStatus
  }

  /**
   * Get all active subscriptions
   */
  public getActiveSubscriptions(): string[] {
    return Array.from(this.activeSubscriptions)
  }

  /**
   * Unsubscribe from all active subscriptions
   */
  public unsubscribeAll(): void {
    unifiedWebSocketClient.disconnectAll()
    this.activeSubscriptions.clear()
  }

  /**
   * Get current price for a symbol
   */
  public async getCurrentPrice(symbol: string): Promise<MarketDataResult<number>> {
    const formattedSymbol = this.formatSymbol(symbol)
    const cacheKey = this.getCacheKey("price", formattedSymbol)

    // Try to get from cache first
    const cachedData = this.getFromCache<number>(cacheKey)
    if (cachedData !== null) {
      return {
        data: cachedData,
        error: null,
        source: "cache",
        timestamp: Date.now(),
      }
    }

    try {
      // Use REST API for immediate data
      const result = await restApiService.getCurrentPrice(formattedSymbol)

      if (result.data !== null) {
        this.storeInCache(cacheKey, result.data, "rest")
      }

      return result
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "getCurrentPrice", symbol: formattedSymbol },
        severity: "medium",
      })

      return {
        data: null,
        error: error as Error,
        source: "rest",
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Get order book for a symbol
   */
  public async getOrderBook(symbol: string, limit = 100): Promise<MarketDataResult<OrderBook>> {
    const formattedSymbol = this.formatSymbol(symbol)
    const cacheKey = this.getCacheKey("orderbook", formattedSymbol, { limit: limit.toString() })

    // Try to get from cache first
    const cachedData = this.getFromCache<OrderBook>(cacheKey)
    if (cachedData !== null) {
      return {
        data: cachedData,
        error: null,
        source: "cache",
        timestamp: Date.now(),
      }
    }

    try {
      // Use REST API for immediate data
      const result = await restApiService.getOrderBook(formattedSymbol, limit)

      if (result.data !== null) {
        this.storeInCache(cacheKey, result.data, "rest")
      }

      return result
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "getOrderBook", symbol: formattedSymbol, limit },
        severity: "medium",
      })

      return {
        data: null,
        error: error as Error,
        source: "rest",
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Get recent trades for a symbol
   */
  public async getRecentTrades(symbol: string, limit = 500): Promise<MarketDataResult<Trade[]>> {
    const formattedSymbol = this.formatSymbol(symbol)
    const cacheKey = this.getCacheKey("trades", formattedSymbol, { limit: limit.toString() })

    // Try to get from cache first
    const cachedData = this.getFromCache<Trade[]>(cacheKey)
    if (cachedData !== null) {
      return {
        data: cachedData,
        error: null,
        source: "cache",
        timestamp: Date.now(),
      }
    }

    try {
      // Use REST API for immediate data
      const result = await restApiService.getRecentTrades(formattedSymbol, limit)

      if (result.data && result.data.length > 0) {
        this.storeInCache(cacheKey, result.data, "rest")
      }

      return result
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "getRecentTrades", symbol: formattedSymbol, limit },
        severity: "medium",
      })

      return {
        data: [],
        error: error as Error,
        source: "rest",
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Get kline/candlestick data
   */
  public async getKlines(symbol: string, interval: string, limit = 500): Promise<MarketDataResult<Kline[]>> {
    const formattedSymbol = this.formatSymbol(symbol)
    const cacheKey = this.getCacheKey("klines", formattedSymbol, { interval, limit: limit.toString() })

    // Try to get from cache first
    const cachedData = this.getFromCache<Kline[]>(cacheKey)
    if (cachedData !== null) {
      return {
        data: cachedData,
        error: null,
        source: "cache",
        timestamp: Date.now(),
      }
    }

    try {
      // Use REST API for immediate data
      const result = await restApiService.getKlines(formattedSymbol, interval, limit)

      if (result.data && result.data.length > 0) {
        this.storeInCache(cacheKey, result.data, "rest")
      }

      return result
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "getKlines", symbol: formattedSymbol, interval, limit },
        severity: "medium",
      })

      return {
        data: [],
        error: error as Error,
        source: "rest",
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Get 24hr ticker statistics
   */
  public async get24hrTicker(symbol: string): Promise<MarketDataResult<MarketTicker>> {
    const formattedSymbol = this.formatSymbol(symbol)
    const cacheKey = this.getCacheKey("ticker", formattedSymbol)

    // Try to get from cache first
    const cachedData = this.getFromCache<MarketTicker>(cacheKey)
    if (cachedData !== null) {
      return {
        data: cachedData,
        error: null,
        source: "cache",
        timestamp: Date.now(),
      }
    }

    try {
      // Use REST API for immediate data
      const result = await restApiService.get24hrTicker(formattedSymbol)

      if (result.data !== null) {
        this.storeInCache(cacheKey, result.data, "rest")
      }

      return result
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "get24hrTicker", symbol: formattedSymbol },
        severity: "medium",
      })

      return {
        data: null,
        error: error as Error,
        source: "rest",
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Subscribe to price updates
   */
  public subscribeToPrice(symbol: string, callback: (result: MarketDataResult<number>) => void): () => void {
    const formattedSymbol = this.formatSymbol(symbol)
    const streamName = `${formattedSymbol.toLowerCase()}@bookTicker`

    // Track this subscription
    this.activeSubscriptions.add(streamName)

    // Use the unified WebSocket client
    const unsubscribe = unifiedWebSocketClient.subscribeToStream(streamName, (data) => {
      try {
        // Extract the best bid price from the bookTicker data
        const price = Number.parseFloat(data.b)

        if (!isNaN(price)) {
          // Store in cache
          const cacheKey = this.getCacheKey("price", formattedSymbol)
          this.storeInCache(cacheKey, price, "websocket")

          // Notify callback
          callback({
            data: price,
            error: null,
            source: "websocket",
            timestamp: Date.now(),
          })
        }
      } catch (error) {
        errorHandler.handleError(error as Error, {
          context: { action: "subscribeToPrice", symbol: formattedSymbol, data },
          severity: "medium",
        })

        callback({
          data: null,
          error: error as Error,
          source: "websocket",
          timestamp: Date.now(),
        })

        // If WebSocket fails, try to get data from REST API
        this.getCurrentPrice(formattedSymbol)
          .then((result) => {
            if (result.data !== null) {
              callback(result)
            }
          })
          .catch((err) => console.error("Failed to get price via REST:", err))
      }
    })

    // Initialize with REST API data
    this.getCurrentPrice(formattedSymbol)
      .then((result) => {
        if (result.data !== null) {
          callback(result)
        }
      })
      .catch((err) => console.error("Failed to get initial price:", err))

    return () => {
      unsubscribe()
      this.activeSubscriptions.delete(streamName)
    }
  }

  /**
   * Subscribe to order book updates
   */
  public subscribeToOrderBook(symbol: string, callback: (result: MarketDataResult<OrderBook>) => void): () => void {
    const formattedSymbol = this.formatSymbol(symbol)
    const streamName = `${formattedSymbol.toLowerCase()}@depth`

    // Track this subscription
    this.activeSubscriptions.add(streamName)

    // Use the unified WebSocket client
    const unsubscribe = unifiedWebSocketClient.subscribeToStream(streamName, (data) => {
      try {
        // Transform the data to OrderBook format
        const orderBook: OrderBook = {
          lastUpdateId: data.lastUpdateId,
          bids: data.bids.map((bid: string[]) => ({
            price: Number.parseFloat(bid[0]),
            quantity: Number.parseFloat(bid[1]),
          })),
          asks: data.asks.map((ask: string[]) => ({
            price: Number.parseFloat(ask[0]),
            quantity: Number.parseFloat(ask[1]),
          })),
        }

        // Store in cache
        const cacheKey = this.getCacheKey("orderbook", formattedSymbol)
        this.storeInCache(cacheKey, orderBook, "websocket")

        // Notify callback
        callback({
          data: orderBook,
          error: null,
          source: "websocket",
          timestamp: Date.now(),
        })
      } catch (error) {
        errorHandler.handleError(error as Error, {
          context: { action: "subscribeToOrderBook", symbol: formattedSymbol, data },
          severity: "medium",
        })

        callback({
          data: null,
          error: error as Error,
          source: "websocket",
          timestamp: Date.now(),
        })

        // If WebSocket fails, try to get data from REST API
        this.getOrderBook(formattedSymbol)
          .then((result) => {
            if (result.data !== null) {
              callback(result)
            }
          })
          .catch((err) => console.error("Failed to get order book via REST:", err))
      }
    })

    // Initialize with REST API data
    this.getOrderBook(formattedSymbol)
      .then((result) => {
        if (result.data !== null) {
          callback(result)
        }
      })
      .catch((err) => console.error("Failed to get initial order book:", err))

    return () => {
      unsubscribe()
      this.activeSubscriptions.delete(streamName)
    }
  }

  /**
   * Subscribe to trades updates
   */
  public subscribeToTrades(symbol: string, callback: (result: MarketDataResult<Trade[]>) => void): () => void {
    const formattedSymbol = this.formatSymbol(symbol)
    const streamName = `${formattedSymbol.toLowerCase()}@aggTrade`

    // Track this subscription
    this.activeSubscriptions.add(streamName)

    // Keep a local buffer of recent trades
    const tradeBuffer: Trade[] = []
    const maxBufferSize = 100

    // Use the unified WebSocket client
    const unsubscribe = unifiedWebSocketClient.subscribeToStream(streamName, (data) => {
      try {
        // Transform the trade data
        const trade: Trade = {
          id: data.a || 0,
          price: Number.parseFloat(data.p) || 0,
          quantity: Number.parseFloat(data.q) || 0,
          time: data.T || Date.now(),
          isBuyerMaker: data.m || false,
        }

        // Add to buffer
        tradeBuffer.unshift(trade)

        // Keep buffer size limited
        if (tradeBuffer.length > maxBufferSize) {
          tradeBuffer.pop()
        }

        // Store in cache
        const cacheKey = this.getCacheKey("trades", formattedSymbol)
        this.storeInCache(cacheKey, [...tradeBuffer], "websocket")

        // Notify callback
        callback({
          data: [...tradeBuffer],
          error: null,
          source: "websocket",
          timestamp: Date.now(),
        })
      } catch (error) {
        errorHandler.handleError(error as Error, {
          context: { action: "subscribeToTrades", symbol: formattedSymbol, data },
          severity: "medium",
        })

        callback({
          data: [],
          error: error as Error,
          source: "websocket",
          timestamp: Date.now(),
        })

        // If WebSocket fails, try to get data from REST API
        this.getRecentTrades(formattedSymbol)
          .then((result) => {
            if (result.data && result.data.length > 0) {
              callback(result)
            }
          })
          .catch((err) => console.error("Failed to get trades via REST:", err))
      }
    })

    // Initialize with REST API data
    this.getRecentTrades(formattedSymbol)
      .then((result) => {
        if (result.data && result.data.length > 0) {
          // Update buffer with initial data
          tradeBuffer.push(...result.data)
          while (tradeBuffer.length > maxBufferSize) {
            tradeBuffer.pop()
          }

          callback(result)
        }
      })
      .catch((err) => console.error("Failed to get initial trades:", err))

    return () => {
      unsubscribe()
      this.activeSubscriptions.delete(streamName)
    }
  }

  /**
   * Subscribe to kline/candlestick updates
   */
  public subscribeToKlines(
    symbol: string,
    interval: string,
    callback: (result: MarketDataResult<Kline[]>) => void,
  ): () => void {
    const formattedSymbol = this.formatSymbol(symbol)
    const streamName = `${formattedSymbol.toLowerCase()}@kline_${interval}`

    // Track this subscription
    this.activeSubscriptions.add(streamName)

    // Keep a local buffer of klines
    let klineBuffer: Kline[] = []

    // Use the unified WebSocket client
    const unsubscribe = unifiedWebSocketClient.subscribeToStream(streamName, (data) => {
      try {
        if (data.k) {
          // Transform the kline data
          const kline: Kline = {
            openTime: data.k.t,
            open: Number.parseFloat(data.k.o),
            high: Number.parseFloat(data.k.h),
            low: Number.parseFloat(data.k.l),
            close: Number.parseFloat(data.k.c),
            volume: Number.parseFloat(data.k.v),
            closeTime: data.k.T,
            quoteVolume: Number.parseFloat(data.k.q),
            trades: data.k.n,
            takerBuyBaseVolume: Number.parseFloat(data.k.V),
            takerBuyQuoteVolume: Number.parseFloat(data.k.Q),
          }

          // Find if we already have this kline in the buffer
          const existingIndex = klineBuffer.findIndex((k) => k.openTime === kline.openTime)

          if (existingIndex >= 0) {
            // Update existing kline
            klineBuffer[existingIndex] = kline
          } else {
            // Add new kline
            klineBuffer.push(kline)
            // Sort by openTime
            klineBuffer.sort((a, b) => a.openTime - b.openTime)
          }

          // Store in cache
          const cacheKey = this.getCacheKey("klines", formattedSymbol, { interval })
          this.storeInCache(cacheKey, [...klineBuffer], "websocket")

          // Notify callback
          callback({
            data: [...klineBuffer],
            error: null,
            source: "websocket",
            timestamp: Date.now(),
          })
        }
      } catch (error) {
        errorHandler.handleError(error as Error, {
          context: { action: "subscribeToKlines", symbol: formattedSymbol, interval, data },
          severity: "medium",
        })

        callback({
          data: [],
          error: error as Error,
          source: "websocket",
          timestamp: Date.now(),
        })

        // If WebSocket fails, try to get data from REST API
        this.getKlines(formattedSymbol, interval)
          .then((result) => {
            if (result.data && result.data.length > 0) {
              callback(result)
            }
          })
          .catch((err) => console.error("Failed to get klines via REST:", err))
      }
    })

    // Initialize with REST API data
    this.getKlines(formattedSymbol, interval)
      .then((result) => {
        if (result.data && result.data.length > 0) {
          // Update buffer with initial data
          klineBuffer = result.data
          callback(result)
        }
      })
      .catch((err) => console.error("Failed to get initial klines:", err))

    return () => {
      unsubscribe()
      this.activeSubscriptions.delete(streamName)
    }
  }

  /**
   * Subscribe to 24hr ticker updates
   */
  public subscribeTo24hrTicker(symbol: string, callback: (result: MarketDataResult<MarketTicker>) => void): () => void {
    const formattedSymbol = this.formatSymbol(symbol)
    const streamName = `${formattedSymbol.toLowerCase()}@ticker`

    // Track this subscription
    this.activeSubscriptions.add(streamName)

    // Use the unified WebSocket client
    const unsubscribe = unifiedWebSocketClient.subscribeToStream(streamName, (data) => {
      try {
        // Transform the ticker data
        const ticker: MarketTicker = {
          symbol: data.s,
          priceChange: Number.parseFloat(data.p),
          priceChangePercent: Number.parseFloat(data.P),
          weightedAvgPrice: Number.parseFloat(data.w),
          lastPrice: Number.parseFloat(data.c),
          lastQty: Number.parseFloat(data.Q),
          openPrice: Number.parseFloat(data.o),
          highPrice: Number.parseFloat(data.h),
          lowPrice: Number.parseFloat(data.l),
          volume: Number.parseFloat(data.v),
          quoteVolume: Number.parseFloat(data.q),
          openTime: data.O,
          closeTime: data.C,
          firstId: data.F,
          lastId: data.L,
          count: data.n,
        }

        // Store in cache
        const cacheKey = this.getCacheKey("ticker", formattedSymbol)
        this.storeInCache(cacheKey, ticker, "websocket")

        // Notify callback
        callback({
          data: ticker,
          error: null,
          source: "websocket",
          timestamp: Date.now(),
        })
      } catch (error) {
        errorHandler.handleError(error as Error, {
          context: { action: "subscribeTo24hrTicker", symbol: formattedSymbol, data },
          severity: "medium",
        })

        callback({
          data: null,
          error: error as Error,
          source: "websocket",
          timestamp: Date.now(),
        })

        // If WebSocket fails, try to get data from REST API
        this.get24hrTicker(formattedSymbol)
          .then((result) => {
            if (result.data !== null) {
              callback(result)
            }
          })
          .catch((err) => console.error("Failed to get ticker via REST:", err))
      }
    })

    // Initialize with REST API data
    this.get24hrTicker(formattedSymbol)
      .then((result) => {
        if (result.data !== null) {
          callback(result)
        }
      })
      .catch((err) => console.error("Failed to get initial ticker:", err))

    return () => {
      unsubscribe()
      this.activeSubscriptions.delete(streamName)
    }
  }
}

// Create and export singleton instance
export const binanceMarketDataProvider = BinanceMarketDataProvider.getInstance()
