import { errorHandler } from "../../error-handling"
import type { OrderBookEntry, Trade, Ticker24hr } from "./market-data-service"

class BinanceRestApiFallback {
  private baseUrl: string
  private apiKey: string | null
  private apiSecret: string | null
  private serverTimeOffset = 0

  constructor() {
    this.baseUrl = process.env.BINANCE_API_BASE_URL || "https://fapi.binance.com"
    this.apiKey = process.env.BINANCE_API_KEY || null
    this.apiSecret = process.env.BINANCE_API_SECRET || null
  }

  /**
   * Test connectivity to the REST API
   */
  public async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/fapi/v1/ping`)
      return response.ok
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "ping" },
        severity: "low",
      })
      return false
    }
  }

  /**
   * Check server time and calculate offset
   */
  public async checkServerTime(): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/fapi/v1/time`)

      if (!response.ok) {
        throw new Error(`Failed to fetch server time: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const serverTime = data.serverTime
      const localTime = Date.now()

      this.serverTimeOffset = serverTime - localTime
      return this.serverTimeOffset
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "checkServerTime" },
        severity: "medium",
      })
      throw error
    }
  }

  /**
   * Get current price for a symbol
   */
  public async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const formattedSymbol = this.formatSymbol(symbol)
      const response = await fetch(`${this.baseUrl}/fapi/v1/ticker/price?symbol=${formattedSymbol}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch price: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return Number.parseFloat(data.price)
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "getCurrentPrice", symbol },
        severity: "medium",
      })
      throw error
    }
  }

  /**
   * Get order book for a symbol
   */
  public async getOrderBook(symbol: string, limit = 10): Promise<{ bids: OrderBookEntry[]; asks: OrderBookEntry[] }> {
    try {
      const formattedSymbol = this.formatSymbol(symbol)
      const response = await fetch(`${this.baseUrl}/fapi/v1/depth?symbol=${formattedSymbol}&limit=${limit}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch order book: ${response.status} ${response.statusText}`)
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
   * Get recent trades for a symbol
   */
  public async getRecentTrades(symbol: string, limit = 20): Promise<Trade[]> {
    try {
      const formattedSymbol = this.formatSymbol(symbol)
      const response = await fetch(`${this.baseUrl}/fapi/v1/trades?symbol=${formattedSymbol}&limit=${limit}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch recent trades: ${response.status} ${response.statusText}`)
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
   * Get 24hr ticker for a symbol
   */
  public async get24hrTicker(symbol: string): Promise<Ticker24hr> {
    try {
      const formattedSymbol = this.formatSymbol(symbol)
      const response = await fetch(`${this.baseUrl}/fapi/v1/ticker/24hr?symbol=${formattedSymbol}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch 24hr ticker: ${response.status} ${response.statusText}`)
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
      errorHandler.handleError(error as Error, {
        context: { action: "get24hrTicker", symbol },
        severity: "medium",
      })
      throw error
    }
  }

  /**
   * Fetch data from any endpoint
   */
  public async fetchData<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    try {
      let url = `${this.baseUrl}${endpoint}`

      if (params) {
        const queryParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          queryParams.append(key, value)
        })
        url += `?${queryParams.toString()}`
      }

      const headers: HeadersInit = {}
      if (this.apiKey) {
        headers["X-MBX-APIKEY"] = this.apiKey
      }

      const response = await fetch(url, { headers })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      return await response.json()
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "fetchData", endpoint, params },
        severity: "high",
      })
      throw error
    }
  }

  /**
   * Format symbol for API requests
   */
  private formatSymbol(symbol: string): string {
    return symbol.replace(/\s+/g, "").toUpperCase()
  }
}

export const binanceRestApiFallback = new BinanceRestApiFallback()
