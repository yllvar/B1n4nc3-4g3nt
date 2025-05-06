/**
 * Data validation utilities for market data
 */
import type { OrderBook, OrderBookEntry, Trade, Kline, MarketTicker } from "./interfaces"
import { errorHandler } from "../error-handling"

export class DataValidator {
  /**
   * Validates an OrderBookEntry
   */
  static validateOrderBookEntry(entry: any): entry is OrderBookEntry {
    if (!entry) return false
    if (typeof entry.price !== "number") return false
    if (typeof entry.quantity !== "number") return false
    if (isNaN(entry.price) || isNaN(entry.quantity)) return false
    return true
  }

  /**
   * Validates an OrderBook
   */
  static validateOrderBook(orderBook: any): orderBook is OrderBook {
    if (!orderBook) return false
    if (typeof orderBook.lastUpdateId !== "number") return false

    if (!Array.isArray(orderBook.bids) || !Array.isArray(orderBook.asks)) return false

    // Check at least some entries if arrays aren't empty
    if (orderBook.bids.length > 0 && !this.validateOrderBookEntry(orderBook.bids[0])) return false
    if (orderBook.asks.length > 0 && !this.validateOrderBookEntry(orderBook.asks[0])) return false

    return true
  }

  /**
   * Validates a Trade
   */
  static validateTrade(trade: any): trade is Trade {
    if (!trade) return false
    if (typeof trade.id !== "number") return false
    if (typeof trade.price !== "number") return false
    if (typeof trade.quantity !== "number") return false
    if (typeof trade.time !== "number") return false
    if (typeof trade.isBuyerMaker !== "boolean") return false

    if (isNaN(trade.price) || isNaN(trade.quantity)) return false

    return true
  }

  /**
   * Validates a Kline
   */
  static validateKline(kline: any): kline is Kline {
    if (!kline) return false

    const requiredNumberFields = [
      "openTime",
      "open",
      "high",
      "low",
      "close",
      "volume",
      "closeTime",
      "quoteVolume",
      "trades",
      "takerBuyBaseVolume",
      "takerBuyQuoteVolume",
    ]

    for (const field of requiredNumberFields) {
      if (typeof kline[field] !== "number" || isNaN(kline[field])) return false
    }

    return true
  }

  /**
   * Validates a MarketTicker
   */
  static validateMarketTicker(ticker: any): ticker is MarketTicker {
    if (!ticker) return false
    if (typeof ticker.symbol !== "string") return false

    const requiredNumberFields = [
      "priceChange",
      "priceChangePercent",
      "weightedAvgPrice",
      "lastPrice",
      "lastQty",
      "openPrice",
      "highPrice",
      "lowPrice",
      "volume",
      "quoteVolume",
      "openTime",
      "closeTime",
      "firstId",
      "lastId",
      "count",
    ]

    for (const field of requiredNumberFields) {
      if (typeof ticker[field] !== "number" || isNaN(ticker[field])) return false
    }

    return true
  }

  /**
   * Safely parse a number from string
   */
  static safeParseFloat(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined) return null

    try {
      const num = typeof value === "string" ? Number.parseFloat(value) : value
      return isNaN(num) ? null : num
    } catch (error) {
      return null
    }
  }

  /**
   * Transform raw API data to our standard format with validation
   */
  static transformOrderBook(data: any): OrderBook | null {
    try {
      if (!data || !Array.isArray(data.bids) || !Array.isArray(data.asks)) {
        return null
      }

      const orderBook: OrderBook = {
        lastUpdateId: typeof data.lastUpdateId === "number" ? data.lastUpdateId : 0,
        bids: data.bids.map((bid: any[]) => ({
          price: this.safeParseFloat(bid[0]) ?? 0,
          quantity: this.safeParseFloat(bid[1]) ?? 0,
        })),
        asks: data.asks.map((ask: any[]) => ({
          price: this.safeParseFloat(ask[0]) ?? 0,
          quantity: this.safeParseFloat(ask[1]) ?? 0,
        })),
      }

      // Filter out any entries with zero price or quantity
      orderBook.bids = orderBook.bids.filter((bid) => bid.price > 0 && bid.quantity > 0)
      orderBook.asks = orderBook.asks.filter((ask) => ask.price > 0 && ask.quantity > 0)

      return this.validateOrderBook(orderBook) ? orderBook : null
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "transformOrderBook" },
        severity: "medium",
      })
      return null
    }
  }

  /**
   * Transform raw API trade data to our standard format with validation
   */
  static transformTrades(data: any[]): Trade[] {
    try {
      if (!Array.isArray(data)) return []

      const trades = data.map((item) => ({
        id: typeof item.id === "number" ? item.id : 0,
        price: this.safeParseFloat(item.price) ?? 0,
        quantity: this.safeParseFloat(item.qty) ?? 0,
        time: typeof item.time === "number" ? item.time : Date.now(),
        isBuyerMaker: Boolean(item.isBuyerMaker),
      }))

      // Filter out invalid trades
      return trades.filter((trade) => this.validateTrade(trade))
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "transformTrades" },
        severity: "medium",
      })
      return []
    }
  }

  /**
   * Transform raw API kline data to our standard format with validation
   */
  static transformKlines(data: any[]): Kline[] {
    try {
      if (!Array.isArray(data)) return []

      const klines = data.map((item) => {
        // Handle both array format and object format
        if (Array.isArray(item)) {
          return {
            openTime: typeof item[0] === "number" ? item[0] : 0,
            open: this.safeParseFloat(item[1]) ?? 0,
            high: this.safeParseFloat(item[2]) ?? 0,
            low: this.safeParseFloat(item[3]) ?? 0,
            close: this.safeParseFloat(item[4]) ?? 0,
            volume: this.safeParseFloat(item[5]) ?? 0,
            closeTime: typeof item[6] === "number" ? item[6] : 0,
            quoteVolume: this.safeParseFloat(item[7]) ?? 0,
            trades: typeof item[8] === "number" ? item[8] : 0,
            takerBuyBaseVolume: this.safeParseFloat(item[9]) ?? 0,
            takerBuyQuoteVolume: this.safeParseFloat(item[10]) ?? 0,
          }
        } else {
          // Handle object format (typically from WebSocket)
          const k = item.k || item
          return {
            openTime: typeof k.t === "number" ? k.t : 0,
            open: this.safeParseFloat(k.o) ?? 0,
            high: this.safeParseFloat(k.h) ?? 0,
            low: this.safeParseFloat(k.l) ?? 0,
            close: this.safeParseFloat(k.c) ?? 0,
            volume: this.safeParseFloat(k.v) ?? 0,
            closeTime: typeof k.T === "number" ? k.T : 0,
            quoteVolume: this.safeParseFloat(k.q) ?? 0,
            trades: typeof k.n === "number" ? k.n : 0,
            takerBuyBaseVolume: this.safeParseFloat(k.V) ?? 0,
            takerBuyQuoteVolume: this.safeParseFloat(k.Q) ?? 0,
          }
        }
      })

      // Filter out invalid klines
      return klines.filter((kline) => this.validateKline(kline))
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "transformKlines" },
        severity: "medium",
      })
      return []
    }
  }

  /**
   * Transform raw API ticker data to our standard format with validation
   */
  static transformMarketTicker(data: any): MarketTicker | null {
    try {
      if (!data || typeof data !== "object") return null

      const ticker: MarketTicker = {
        symbol: typeof data.symbol === "string" ? data.symbol : "",
        priceChange: this.safeParseFloat(data.priceChange) ?? 0,
        priceChangePercent: this.safeParseFloat(data.priceChangePercent) ?? 0,
        weightedAvgPrice: this.safeParseFloat(data.weightedAvgPrice) ?? 0,
        lastPrice: this.safeParseFloat(data.lastPrice) ?? 0,
        lastQty: this.safeParseFloat(data.lastQty) ?? 0,
        openPrice: this.safeParseFloat(data.openPrice) ?? 0,
        highPrice: this.safeParseFloat(data.highPrice) ?? 0,
        lowPrice: this.safeParseFloat(data.lowPrice) ?? 0,
        volume: this.safeParseFloat(data.volume) ?? 0,
        quoteVolume: this.safeParseFloat(data.quoteVolume) ?? 0,
        openTime: typeof data.openTime === "number" ? data.openTime : 0,
        closeTime: typeof data.closeTime === "number" ? data.closeTime : 0,
        firstId: typeof data.firstId === "number" ? data.firstId : 0,
        lastId: typeof data.lastId === "number" ? data.lastId : 0,
        count: typeof data.count === "number" ? data.count : 0,
      }

      return this.validateMarketTicker(ticker) ? ticker : null
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "transformMarketTicker" },
        severity: "medium",
      })
      return null
    }
  }
}
