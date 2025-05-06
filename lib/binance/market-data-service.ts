/**
 * Binance Market Data Service
 * Handles fetching and processing market data from Binance API
 */
import { binanceWebSocketClient } from "./websocket-client"
import type { Kline, OrderBookEntry, Trade, MarketTicker } from "../market/interfaces"
import { ApiError, NetworkError, ValidationError } from "../error-handling"

// Re-export types from interfaces for backward compatibility
export type { Kline, OrderBookEntry, Trade, MarketTicker }

export class BinanceMarketDataService {
  private baseApiUrl = "https://fapi.binance.com"

  /**
   * Fetch 24hr ticker statistics
   */
  public async get24hrTicker(symbol: string): Promise<MarketTicker> {
    try {
      const response = await fetch(`${this.baseApiUrl}/fapi/v1/ticker/24hr?symbol=${symbol.toUpperCase()}`)

      if (!response.ok) {
        throw new ApiError(`Failed to fetch 24hr ticker: ${response.statusText}`, {
          statusCode: response.status,
          endpoint: `/fapi/v1/ticker/24hr?symbol=${symbol.toUpperCase()}`,
          context: { symbol },
        })
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
      if (error instanceof ApiError) {
        throw error
      }
      throw new NetworkError(`Error fetching 24hr ticker: ${error instanceof Error ? error.message : String(error)}`, {
        context: { symbol },
        cause: error instanceof Error ? error : undefined,
      })
    }
  }

  /**
   * Fetch kline/candlestick data
   */
  public async getKlines(symbol: string, interval: string, limit = 500): Promise<Kline[]> {
    try {
      const response = await fetch(
        `${this.baseApiUrl}/fapi/v1/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`,
      )

      if (!response.ok) {
        throw new ApiError(`Failed to fetch klines: ${response.statusText}`, {
          statusCode: response.status,
          endpoint: `/fapi/v1/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`,
          context: { symbol, interval, limit },
        })
      }

      const data = await response.json()

      // Validate data structure
      if (!Array.isArray(data)) {
        throw new ValidationError("Invalid kline data: expected array", {
          invalidData: data,
        })
      }

      return data.map((kline: any[]) => {
        if (!Array.isArray(kline) || kline.length < 11) {
          throw new ValidationError("Invalid kline entry format", {
            invalidData: kline,
          })
        }

        return {
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
        }
      })
    } catch (error) {
      if (error instanceof ApiError || error instanceof ValidationError) {
        throw error
      }
      throw new NetworkError(`Error fetching klines: ${error instanceof Error ? error.message : String(error)}`, {
        context: { symbol, interval, limit },
        cause: error instanceof Error ? error : undefined,
      })
    }
  }

  /**
   * Fetch order book
   */
  public async getOrderBook(symbol: string, limit = 100): Promise<{ bids: OrderBookEntry[]; asks: OrderBookEntry[] }> {
    try {
      const response = await fetch(`${this.baseApiUrl}/fapi/v1/depth?symbol=${symbol.toUpperCase()}&limit=${limit}`)

      if (!response.ok) {
        throw new ApiError(`Failed to fetch order book: ${response.statusText}`, {
          statusCode: response.status,
          endpoint: `/fapi/v1/depth?symbol=${symbol.toUpperCase()}&limit=${limit}`,
          context: { symbol, limit },
        })
      }

      const data = await response.json()

      // Validate data structure
      if (!data.bids || !data.asks || !Array.isArray(data.bids) || !Array.isArray(data.asks)) {
        throw new ValidationError("Invalid order book data structure", {
          invalidData: data,
        })
      }

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
      if (error instanceof ApiError || error instanceof ValidationError) {
        throw error
      }
      throw new NetworkError(`Error fetching order book: ${error instanceof Error ? error.message : String(error)}`, {
        context: { symbol, limit },
        cause: error instanceof Error ? error : undefined,
      })
    }
  }

  /**
   * Fetch recent trades
   */
  public async getRecentTrades(symbol: string, limit = 500): Promise<Trade[]> {
    try {
      const response = await fetch(`${this.baseApiUrl}/fapi/v1/trades?symbol=${symbol.toUpperCase()}&limit=${limit}`)

      if (!response.ok) {
        throw new ApiError(`Failed to fetch recent trades: ${response.statusText}`, {
          statusCode: response.status,
          endpoint: `/fapi/v1/trades?symbol=${symbol.toUpperCase()}&limit=${limit}`,
          context: { symbol, limit },
        })
      }

      const data = await response.json()

      // Validate data structure
      if (!Array.isArray(data)) {
        throw new ValidationError("Invalid trades data: expected array", {
          invalidData: data,
        })
      }

      return data.map((trade: any) => {
        if (!trade.id || !trade.price || !trade.qty || !trade.time) {
          throw new ValidationError("Invalid trade entry format", {
            invalidData: trade,
          })
        }

        return {
          id: trade.id,
          price: Number.parseFloat(trade.price),
          quantity: Number.parseFloat(trade.qty),
          time: trade.time,
          isBuyerMaker: trade.isBuyerMaker,
        }
      })
    } catch (error) {
      if (error instanceof ApiError || error instanceof ValidationError) {
        throw error
      }
      throw new NetworkError(
        `Error fetching recent trades: ${error instanceof Error ? error.message : String(error)}`,
        {
          context: { symbol, limit },
          cause: error instanceof Error ? error : undefined,
        },
      )
    }
  }

  /**
   * Subscribe to aggregate trade updates
   */
  public subscribeToAggTrades(symbol: string, callback: (data: any) => void): () => void {
    return binanceWebSocketClient.connectToStream(`${symbol.toLowerCase()}@aggTrade`, callback)
  }

  /**
   * Subscribe to mark price updates
   */
  public subscribeToMarkPrice(symbol: string, callback: (data: any) => void, interval: "1s" | "3s" = "3s"): () => void {
    return binanceWebSocketClient.connectToStream(
      `${symbol.toLowerCase()}@markPrice${interval === "1s" ? "@1s" : ""}`,
      callback,
    )
  }

  /**
   * Subscribe to kline/candlestick updates
   */
  public subscribeToKlines(symbol: string, interval: string, callback: (data: any) => void): () => void {
    return binanceWebSocketClient.connectToStream(`${symbol.toLowerCase()}@kline_${interval}`, callback)
  }

  /**
   * Subscribe to book ticker updates
   */
  public subscribeToBookTicker(symbol: string, callback: (data: any) => void): () => void {
    return binanceWebSocketClient.connectToStream(`${symbol.toLowerCase()}@bookTicker`, callback)
  }

  /**
   * Subscribe to multiple streams at once
   */
  public subscribeToMultipleStreams(
    symbol: string,
    streams: ("aggTrade" | "markPrice" | "bookTicker" | "depth")[],
    callback: (data: any) => void,
  ): () => void {
    const streamNames = streams.map((stream) => `${symbol.toLowerCase()}@${stream}`)
    return binanceWebSocketClient.connectToStreams(streamNames, callback)
  }
}

// Create singleton instance
export const binanceMarketDataService = new BinanceMarketDataService()
