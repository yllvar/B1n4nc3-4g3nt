/**
 * Market Data Types
 * Types related to market data and trading instruments
 */

// Market data types
export interface MarketTicker {
  symbol: string
  priceChange: number
  priceChangePercent: number
  weightedAvgPrice: number
  lastPrice: number
  lastQty: number
  openPrice: number
  highPrice: number
  lowPrice: number
  volume: number
  quoteVolume: number
  openTime: number
  closeTime: number
  firstId: number
  lastId: number
  count: number
}

/**
 * Represents a single entry in the order book
 * Contains price and quantity information
 */
export interface OrderBookEntry {
  price: number
  quantity: number
}

/**
 * Represents the complete order book for a symbol
 * Contains arrays of bids and asks, sorted by price
 */
export interface OrderBook {
  lastUpdateId: number
  bids: OrderBookEntry[]
  asks: OrderBookEntry[]
}

/**
 * Represents a single trade
 */
export interface Trade {
  id: number
  price: number
  quantity: number
  time: number
  isBuyerMaker: boolean
  isBestMatch?: boolean
}

/**
 * Represents a candlestick/kline data point
 */
export interface Kline {
  openTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  closeTime: number
  quoteVolume: number
  trades: number
  takerBuyBaseAssetVolume: number
  takerBuyQuoteAssetVolume: number
}

/**
 * Raw kline data as returned from the API
 * All numeric values are represented as strings
 */
export interface RawKline {
  openTime: number
  open: string
  high: string
  low: string
  close: string
  volume: string
  closeTime: number
  quoteAssetVolume: string
  trades: number
  takerBuyBaseAssetVolume: string
  takerBuyQuoteAssetVolume: string
  ignored?: string
}

/**
 * Wrapper for market data responses that includes error handling
 */
export interface MarketDataResult<T> {
  data: T | null
  error: Error | null
  source: "websocket" | "rest" | "cache"
  timestamp: number
}

/**
 * Options for market data subscriptions
 */
export interface SubscriptionOptions {
  reconnect?: boolean
  maxRetries?: number
  retryInterval?: number
  bufferSize?: number
  throttleMs?: number
}

/**
 * Pagination parameters for API requests
 */
export interface PaginationParams {
  limit?: number
  offset?: number
  fromId?: number
  startTime?: number
  endTime?: number
}

/**
 * Market data service interface
 * Defines methods for fetching and subscribing to market data
 */
export interface MarketDataService {
  // One-time data fetching methods
  getCurrentPrice(symbol: string): Promise<MarketDataResult<number>>
  getOrderBook(symbol: string, limit?: number): Promise<MarketDataResult<OrderBook>>
  getRecentTrades(symbol: string, limit?: number): Promise<MarketDataResult<Trade[]>>
  getKlines(symbol: string, interval: string, params?: PaginationParams): Promise<MarketDataResult<Kline[]>>
  get24hrTicker(symbol: string): Promise<MarketDataResult<MarketTicker>>

  // Subscription methods
  subscribeToPrice(
    symbol: string,
    callback: (result: MarketDataResult<number>) => void,
    options?: SubscriptionOptions,
  ): () => void
  subscribeToOrderBook(
    symbol: string,
    callback: (result: MarketDataResult<OrderBook>) => void,
    options?: SubscriptionOptions,
  ): () => void
  subscribeToTrades(
    symbol: string,
    callback: (result: MarketDataResult<Trade[]>) => void,
    options?: SubscriptionOptions,
  ): () => void
  subscribeToKlines(
    symbol: string,
    interval: string,
    callback: (result: MarketDataResult<Kline[]>) => void,
    options?: SubscriptionOptions,
  ): () => void
  subscribeTo24hrTicker(
    symbol: string,
    callback: (result: MarketDataResult<MarketTicker>) => void,
    options?: SubscriptionOptions,
  ): () => void

  // Service status methods
  getStatus(): "connected" | "connecting" | "disconnected" | "error" | "fallback"
  getActiveSubscriptions(): string[]
  unsubscribeAll(): void
}
