/**
 * Enhanced REST API service with comprehensive error handling and data validation
 */
import { errorHandler } from "../error-handling"
import { DataValidator } from "./data-validation"
import type { MarketDataResult, OrderBook, Trade, Kline, MarketTicker } from "./interfaces"

export class RestApiService {
  private baseApiUrl: string
  private apiKey: string | undefined
  private apiSecret: string | undefined
  private requestTimeoutMs = 10000 // 10 seconds default timeout
  private serverTimeOffset = 0
  private lastServerTimeCheck = 0
  private serverTimeCheckInterval: number = 1000 * 60 * 5 // 5 minutes

  constructor() {
    this.baseApiUrl = process.env.BINANCE_API_BASE_URL || "https://fapi.binance.com"
    this.apiKey = process.env.BINANCE_API_KEY
    this.apiSecret = process.env.BINANCE_API_SECRET
  }

  /**
   * Set request timeout in milliseconds
   */
  public setRequestTimeout(timeoutMs: number): void {
    this.requestTimeoutMs = timeoutMs
  }

  /**
   * Get headers for authenticated requests
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    if (this.apiKey) {
      headers["X-MBX-APIKEY"] = this.apiKey
    }

    return headers
  }

  /**
   * Format symbol to ensure it's in the correct format
   */
  private formatSymbol(symbol: string): string {
    return symbol.replace(/\s+/g, "").toUpperCase()
  }

  /**
   * Make a fetch request with timeout and error handling
   */
  private async fetchWithTimeout<T>(url: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! Status: ${response.status}, Response: ${errorText}`)
      }

      const data = await response.json()
      return data as T
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        throw new Error(`Request timeout after ${this.requestTimeoutMs}ms: ${url}`)
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Check server time and calculate offset
   */
  public async checkServerTime(): Promise<number> {
    try {
      const now = Date.now()

      // Only check server time if it's been more than the check interval
      if (now - this.lastServerTimeCheck < this.serverTimeCheckInterval) {
        return this.serverTimeOffset
      }

      const data = await this.fetchWithTimeout<{ serverTime: number }>(`${this.baseApiUrl}/fapi/v1/time`, {
        headers: this.getHeaders(),
      })

      this.serverTimeOffset = data.serverTime - now
      this.lastServerTimeCheck = now

      return this.serverTimeOffset
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "checkServerTime" },
        severity: "medium",
      })
      return this.serverTimeOffset
    }
  }

  /**
   * Get current price for a symbol
   */
  public async getCurrentPrice(symbol: string): Promise<MarketDataResult<number>> {
    try {
      const formattedSymbol = this.formatSymbol(symbol)

      const data = await this.fetchWithTimeout<{ symbol: string; price: string }>(
        `${this.baseApiUrl}/fapi/v1/ticker/price?symbol=${formattedSymbol}`,
        { headers: this.getHeaders() },
      )

      const price = DataValidator.safeParseFloat(data.price)

      if (price === null) {
        throw new Error(`Invalid price data received for ${symbol}`)
      }

      return {
        data: price,
        error: null,
        source: "rest",
        timestamp: Date.now(),
      }
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "getCurrentPrice", symbol },
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
    try {
      const formattedSymbol = this.formatSymbol(symbol)

      const data = await this.fetchWithTimeout<any>(
        `${this.baseApiUrl}/fapi/v1/depth?symbol=${formattedSymbol}&limit=${limit}`,
        { headers: this.getHeaders() },
      )

      const orderBook = DataValidator.transformOrderBook(data)

      if (!orderBook) {
        throw new Error(`Invalid order book data received for ${symbol}`)
      }

      return {
        data: orderBook,
        error: null,
        source: "rest",
        timestamp: Date.now(),
      }
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "getOrderBook", symbol, limit },
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
    try {
      const formattedSymbol = this.formatSymbol(symbol)

      const data = await this.fetchWithTimeout<any[]>(
        `${this.baseApiUrl}/fapi/v1/trades?symbol=${formattedSymbol}&limit=${limit}`,
        { headers: this.getHeaders() },
      )

      const trades = DataValidator.transformTrades(data)

      return {
        data: trades,
        error: null,
        source: "rest",
        timestamp: Date.now(),
      }
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "getRecentTrades", symbol, limit },
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
    try {
      const formattedSymbol = this.formatSymbol(symbol)

      const data = await this.fetchWithTimeout<any[]>(
        `${this.baseApiUrl}/fapi/v1/klines?symbol=${formattedSymbol}&interval=${interval}&limit=${limit}`,
        { headers: this.getHeaders() },
      )

      const klines = DataValidator.transformKlines(data)

      return {
        data: klines,
        error: null,
        source: "rest",
        timestamp: Date.now(),
      }
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "getKlines", symbol, interval, limit },
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
    try {
      const formattedSymbol = this.formatSymbol(symbol)

      const data = await this.fetchWithTimeout<any>(
        `${this.baseApiUrl}/fapi/v1/ticker/24hr?symbol=${formattedSymbol}`,
        { headers: this.getHeaders() },
      )

      const ticker = DataValidator.transformMarketTicker(data)

      if (!ticker) {
        throw new Error(`Invalid ticker data received for ${symbol}`)
      }

      return {
        data: ticker,
        error: null,
        source: "rest",
        timestamp: Date.now(),
      }
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "get24hrTicker", symbol },
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
}

// Create singleton instance
export const restApiService = new RestApiService()
