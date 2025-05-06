/**
 * Enhanced Market Data Service
 * Provides a unified interface for market data with WebSocket and REST API fallback
 */
import { unifiedWebSocketClient } from "../websocket/unified-websocket-client"
import { restApiService } from "./rest-api-service"
import { errorHandler } from "../error-handling"
import { DataValidator } from "./data-validation"
import type {
  MarketDataService,
  MarketDataResult,
  OrderBook,
  Trade,
  Kline,
  MarketTicker,
  SubscriptionOptions,
} from "./interfaces"

// Simple in-memory cache for data
interface CacheEntry<T> {
  data: T
  timestamp: number
  source: "websocket" | "rest"
}

export class EnhancedMarketDataService implements MarketDataService {
  private static instance: EnhancedMarketDataService
  private activeSubscriptions: Set<string> = new Set()
  private cache: Map<string, CacheEntry<any>> = new Map()
  private cacheTTL = 30000 // 30 seconds default TTL
  private defaultSubscriptionOptions: SubscriptionOptions = {
    reconnect: true,
    maxRetries: 5,
    retryInterval: 2000,
  }

  private constructor() {
    // Initialize WebSocket connection monitoring
    this.monitorWebSocketConnection()
  }

  public static getInstance(): EnhancedMarketDataService {
    if (!EnhancedMarketDataService.instance) {
      EnhancedMarketDataService.instance = new EnhancedMarketDataService()
    }
    return EnhancedMarketDataService.instance
  }

  /**
   * Set cache TTL in milliseconds
   */
  public setCacheTTL(ttl: number): void {
    this.cacheTTL = ttl
  }

  /**
   * Monitor WebSocket connection and handle reconnection
   */
  private monitorWebSocketConnection(): void {
    unifiedWebSocketClient.subscribe((status, metrics) => {
      if (status === "disconnected" || status === "error") {
        console.log(`WebSocket ${status}, metrics:`, metrics)

        // Log the event
        errorHandler.handleError(`WebSocket ${status}`, {
          context: { metrics },
          severity: status === "error" ? "high" : "medium",
          showToast: false,
        })
      }
    })
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
  private storeInCache<T>(key: string, data: T, source: "websocket" | "rest"): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      source,
    })
  }

  /**
   * Get current WebSocket connection status
   */
  public getStatus(): "connected" | "connecting" | "disconnected" | "error" {
    return unifiedWebSocketClient.getStatus()
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
    unifiedWebSocketClient.unsubscribeAll()
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
      // Use WebSocket client if connected, otherwise fall back to REST
      if (unifiedWebSocketClient.getStatus() === "connected") {
        // For immediate price, we'll use the REST API even if WebSocket is connected
        // because WebSocket is push-based and we need an immediate value
        const result = await restApiService.getCurrentPrice(formattedSymbol)

        if (result.data !== null) {
          this.storeInCache(cacheKey, result.data, "rest")
        }

        return result
      } else {
        const result = await restApiService.getCurrentPrice(formattedSymbol)

        if (result.data !== null) {
          this.storeInCache(cacheKey, result.data, "rest")
        }

        return result
      }
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
      // Use WebSocket client if connected, otherwise fall back to REST
      if (unifiedWebSocketClient.getStatus() === "connected") {
        // For order book, we'll use the REST API for immediate data
        const result = await restApiService.getOrderBook(formattedSymbol, limit)

        if (result.data !== null) {
          this.storeInCache(cacheKey, result.data, "rest")
        }

        return result
      } else {
        const result = await restApiService.getOrderBook(formattedSymbol, limit)

        if (result.data !== null) {
          this.storeInCache(cacheKey, result.data, "rest")
        }

        return result
      }
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
  public subscribeToPrice(
    symbol: string,
    callback: (result: MarketDataResult<number>) => void,
    options?: SubscriptionOptions,
  ): () => void {
    const formattedSymbol = this.formatSymbol(symbol)
    const streamName = `${formattedSymbol.toLowerCase()}@bookTicker`
    const mergedOptions = { ...this.defaultSubscriptionOptions, ...options }

    // Track this subscription
    this.activeSubscriptions.add(streamName)

    // Use the unified WebSocket client
    const unsubscribe = unifiedWebSocketClient.subscribeToStream(streamName, (data) => {
      try {
        // Extract the best bid price from the bookTicker data
        const price = DataValidator.safeParseFloat(data.b)

        if (price !== null) {
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
        if (mergedOptions.reconnect) {
          this.getCurrentPrice(formattedSymbol)
            .then((result) => {
              if (result.data !== null) {
                callback(result)
              }
            })
            .catch((err) => console.error("Failed to get price via REST:", err))
        }
      }
    })

    return () => {
      unsubscribe()
      this.activeSubscriptions.delete(streamName)
    }
  }

  /**
   * Subscribe to order book updates
   */
  public subscribeToOrderBook(
    symbol: string,
    callback: (result: MarketDataResult<OrderBook>) => void,
    options?: SubscriptionOptions,
  ): () => void {
    const formattedSymbol = this.formatSymbol(symbol)
    const streamName = `${formattedSymbol.toLowerCase()}@depth`
    const mergedOptions = { ...this.defaultSubscriptionOptions, ...options }

    // Track this subscription
    this.activeSubscriptions.add(streamName)

    // Use the unified WebSocket client
    const unsubscribe = unifiedWebSocketClient.subscribeToStream(streamName, (data) => {
      try {
        const orderBook = DataValidator.transformOrderBook(data)

        if (orderBook) {
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
        }
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
        if (mergedOptions.reconnect) {
          this.getOrderBook(formattedSymbol)
            .then((result) => {
              if (result.data !== null) {
                callback(result)
              }
            })
            .catch((err) => console.error("Failed to get order book via REST:", err))
        }
      }
    })

    return () => {
      unsubscribe()
      this.activeSubscriptions.delete(streamName)
    }
  }

  /**
   * Subscribe to trades updates
   */
  public subscribeToTrades(
    symbol: string,
    callback: (result: MarketDataResult<Trade[]>) => void,
    options?: SubscriptionOptions,
  ): () => void {
    const formattedSymbol = this.formatSymbol(symbol)
    const streamName = `${formattedSymbol.toLowerCase()}@aggTrade`
    const mergedOptions = { ...this.defaultSubscriptionOptions, ...options }

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
          price: DataValidator.safeParseFloat(data.p) || 0,
          quantity: DataValidator.safeParseFloat(data.q) || 0,
          time: data.T || Date.now(),
          isBuyerMaker: data.m || false,
        }

        if (DataValidator.validateTrade(trade)) {
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
        }
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
        if (mergedOptions.reconnect) {
          this.getRecentTrades(formattedSymbol)
            .then((result) => {
              if (result.data && result.data.length > 0) {
                callback(result)
              }
            })
            .catch((err) => console.error("Failed to get trades via REST:", err))
        }
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
    options?: SubscriptionOptions,
  ): () => void {
    const formattedSymbol = this.formatSymbol(symbol)
    const streamName = `${formattedSymbol.toLowerCase()}@kline_${interval}`
    const mergedOptions = { ...this.defaultSubscriptionOptions, ...options }

    // Track this subscription
    this.activeSubscriptions.add(streamName)

    // Keep a local buffer of klines
    let klineBuffer: Kline[] = []

    // Use the unified WebSocket client
    const unsubscribe = unifiedWebSocketClient.subscribeToStream(streamName, (data) => {
      try {
        // For kline data, we need to update the existing buffer
        // Find the kline with the same openTime and update it
        const kline = DataValidator.transformKlines([data])[0]

        if (kline) {
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
        if (mergedOptions.reconnect) {
          this.getKlines(formattedSymbol, interval)
            .then((result) => {
              if (result.data && result.data.length > 0) {
                callback(result)
              }
            })
            .catch((err) => console.error("Failed to get klines via REST:", err))
        }
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
  public subscribeTo24hrTicker(
    symbol: string,
    callback: (result: MarketDataResult<MarketTicker>) => void,
    options?: SubscriptionOptions,
  ): () => void {
    const formattedSymbol = this.formatSymbol(symbol)
    const streamName = `${formattedSymbol.toLowerCase()}@ticker`
    const mergedOptions = { ...this.defaultSubscriptionOptions, ...options }

    // Track this subscription
    this.activeSubscriptions.add(streamName)

    // Use the unified WebSocket client
    const unsubscribe = unifiedWebSocketClient.subscribeToStream(streamName, (data) => {
      try {
        const ticker = DataValidator.transformMarketTicker(data)

        if (ticker) {
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
        }
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
        if (mergedOptions.reconnect) {
          this.get24hrTicker(formattedSymbol)
            .then((result) => {
              if (result.data !== null) {
                callback(result)
              }
            })
            .catch((err) => console.error("Failed to get ticker via REST:", err))
        }
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

// Create singleton instance
export const enhancedMarketDataService = EnhancedMarketDataService.getInstance()
