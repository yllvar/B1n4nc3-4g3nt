/**
 * Binance Futures REST API Fallback Service
 * Used when WebSocket connections fail
 */

import type { OrderBookEntry, Trade, MarketTicker, KlineData } from "@/features/websocket/lib/market-data-service"

export class BinanceRestApiFallback {
  private baseApiUrl: string
  private apiKey: string | undefined
  private apiSecret: string | undefined
  private lastServerTimeOffset = 0
  private lastServerTimeCheck = 0

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
   * Test connectivity to the REST API
   */
  public async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseApiUrl}/fapi/v1/ping`, {
        headers: this.getHeaders(),
      })
      return response.ok
    } catch (error) {
      console.error("Error pinging Binance API:", error)
      return false
    }
  }

  /**
   * Get server time and calculate offset with local time
   */
  public async checkServerTime(): Promise<number> {
    try {
      const response = await fetch(`${this.baseApiUrl}/fapi/v1/time`, {
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()
      const serverTime = data.serverTime
      const localTime = Date.now()
      this.lastServerTimeOffset = serverTime - localTime
      this.lastServerTimeCheck = localTime

      return this.lastServerTimeOffset
    } catch (error) {
      console.error("Error checking server time:", error)
      throw error
    }
  }

  /**
   * Get current price for a symbol
   */
  public async getCurrentPrice(symbol: string): Promise<number> {
    try {
      // Ensure symbol is properly formatted
      const formattedSymbol = this.formatSymbol(symbol)

      const response = await fetch(`${this.baseApiUrl}/fapi/v1/ticker/price?symbol=${formattedSymbol}`, {
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()
      return Number.parseFloat(data.price)
    } catch (error) {
      console.error(`Error fetching current price for ${symbol}:`, error)
      throw error
    }
  }

  /**
   * Get order book for a symbol
   */
  public async getOrderBook(symbol: string, limit = 100): Promise<{ bids: OrderBookEntry[]; asks: OrderBookEntry[] }> {
    try {
      // Ensure symbol is properly formatted
      const formattedSymbol = this.formatSymbol(symbol)

      const response = await fetch(`${this.baseApiUrl}/fapi/v1/depth?symbol=${formattedSymbol}&limit=${limit}`, {
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
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
      console.error(`Error fetching order book for ${symbol}:`, error)
      throw error
    }
  }

  /**
   * Get recent trades for a symbol
   */
  public async getRecentTrades(symbol: string, limit = 500): Promise<Trade[]> {
    try {
      // Ensure symbol is properly formatted
      const formattedSymbol = this.formatSymbol(symbol)

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
      console.error(`Error fetching recent trades for ${symbol}:`, error)
      throw error
    }
  }

  /**
   * Get 24hr ticker statistics
   */
  public async get24hrTicker(symbol: string): Promise<MarketTicker> {
    try {
      // Ensure symbol is properly formatted
      const formattedSymbol = this.formatSymbol(symbol)

      const response = await fetch(`${this.baseApiUrl}/fapi/v1/ticker/24hr?symbol=${formattedSymbol}`, {
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
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
      console.error(`Error fetching 24hr ticker for ${symbol}:`, error)
      throw error
    }
  }

  /**
   * Get book ticker (best bid/ask)
   */
  public async getBookTicker(
    symbol: string,
  ): Promise<{ bidPrice: number; bidQty: number; askPrice: number; askQty: number }> {
    try {
      // Ensure symbol is properly formatted
      const formattedSymbol = this.formatSymbol(symbol)

      const response = await fetch(`${this.baseApiUrl}/fapi/v1/ticker/bookTicker?symbol=${formattedSymbol}`, {
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()
      return {
        bidPrice: Number.parseFloat(data.bidPrice),
        bidQty: Number.parseFloat(data.bidQty),
        askPrice: Number.parseFloat(data.askPrice),
        askQty: Number.parseFloat(data.askQty),
      }
    } catch (error) {
      console.error(`Error fetching book ticker for ${symbol}:`, error)
      throw error
    }
  }

  /**
   * Get kline/candlestick data
   */
  public async getKlines(symbol: string, interval: string, limit = 500): Promise<KlineData[]> {
    try {
      // Ensure symbol is properly formatted
      const formattedSymbol = this.formatSymbol(symbol)

      const response = await fetch(
        `${this.baseApiUrl}/fapi/v1/klines?symbol=${formattedSymbol}&interval=${interval}&limit=${limit}`,
        {
          headers: this.getHeaders(),
        },
      )

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
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
      console.error(`Error fetching klines for ${symbol}:`, error)
      throw error
    }
  }

  /**
   * Format symbol to ensure it's in the correct format for Binance API
   * This handles both lowercase and uppercase symbols
   */
  private formatSymbol(symbol: string): string {
    // Remove any spaces and convert to uppercase
    return symbol.replace(/\s+/g, "").toUpperCase()
  }
}

// Create singleton instance
export const binanceRestApiFallback = new BinanceRestApiFallback()
