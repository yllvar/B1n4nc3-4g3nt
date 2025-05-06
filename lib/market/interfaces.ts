/**
 * Standardized interfaces for market data services
 */

export interface OrderBookEntry {
  price: number
  quantity: number
}

export interface OrderBook {
  lastUpdateId: number
  bids: OrderBookEntry[]
  asks: OrderBookEntry[]
}

export interface Trade {
  id: number
  price: number
  quantity: number
  time: number
  isBuyerMaker: boolean
}

// Unified Kline interface to be used throughout the application
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
  takerBuyBaseVolume: number
  takerBuyQuoteVolume: number
}

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

export interface SubscriptionOptions {
  reconnect?: boolean
  maxRetries?: number
  retryInterval?: number
}

export interface MarketDataResult<T> {
  data: T | null
  error: Error | null
  source: "websocket" | "rest" | "cache"
  timestamp: number
}

export interface MarketDataService {
  // REST API methods - all should be async and return MarketDataResult
  getCurrentPrice(symbol: string): Promise<MarketDataResult<number>>
  getOrderBook(symbol: string, limit?: number): Promise<MarketDataResult<OrderBook>>
  getRecentTrades(symbol: string, limit?: number): Promise<MarketDataResult<Trade[]>>
  getKlines(symbol: string, interval: string, limit?: number): Promise<MarketDataResult<Kline[]>>
  get24hrTicker(symbol: string): Promise<MarketDataResult<MarketTicker>>

  // WebSocket subscription methods - all should return an unsubscribe function
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

  // Utility methods
  getStatus(): "connected" | "connecting" | "disconnected" | "error"
  getActiveSubscriptions(): string[]
  unsubscribeAll(): void
}

/**
 * Trading strategy interfaces
 */

export interface StrategyParameters {
  shortEmaPeriod: number
  longEmaPeriod: number
  emaThreshold: number
  vwapPeriod: number
  vwapThreshold: number
  takeProfitPercent: number
  stopLossPercent: number
  maxHoldingTimeMinutes: number
  maxTradesPerHour: number
  leverageMultiplier: number
}

export interface StrategySignal {
  action: "BUY" | "SELL" | "CLOSE_LONG" | "CLOSE_SHORT" | "NONE"
  price: number
  timestamp: number
  strength: number
  reason: string
  stopLoss: number | null
  takeProfit: number | null
  indicators: {
    shortEma: number
    longEma: number
    vwap: number
    emaPeriod: number
  }
}

export interface StrategyPosition {
  type: "LONG" | "SHORT"
  entryPrice: number
  entryTime: number
}

export interface StrategyResult {
  signals: StrategySignal[]
  performance: {
    totalTrades: number
    winningTrades: number
    losingTrades: number
    winRate: number
    profitFactor: number
    netProfit: number
  }
}

/**
 * LLM Analysis interfaces
 */

export interface MarketSentiment {
  overall: "bullish" | "bearish" | "neutral"
  strength: number // 0-100
  confidence: number // 0-100
  reasoning: string
}

export interface TradingSignalAnalysis {
  recommendation: "strong_buy" | "buy" | "neutral" | "sell" | "strong_sell"
  confidence: number // 0-100
  timeframe: "short_term" | "medium_term" | "long_term"
  reasoning: string
  riskLevel: "low" | "medium" | "high"
  potentialReward: "low" | "medium" | "high"
  keyFactors: string[]
}

export interface MarketAnalysis {
  timestamp: number
  symbol: string
  sentiment: MarketSentiment
  technicalAnalysis: TradingSignalAnalysis
  supportLevels: number[]
  resistanceLevels: number[]
  volatilityAssessment: string
  marketCondition: "trending" | "ranging" | "choppy"
}

/**
 * Market Interfaces
 * Defines interfaces for market data and trading strategies
 */

// Kline (candlestick) data
export interface Kline {
  openTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  closeTime: number
  quoteAssetVolume: number
  trades: number
  takerBuyBaseAssetVolume: number
  takerBuyQuoteAssetVolume: number
  ignored: number
}

// Strategy parameters
// export interface StrategyParameters {
//   shortEmaPeriod: number
//   longEmaPeriod: number
//   emaThreshold: number
//   vwapPeriod: number
//   vwapThreshold: number
//   takeProfitPercent: number
//   stopLossPercent: number
//   maxHoldingTimeMinutes: number
//   maxTradesPerHour: number
//   leverageMultiplier: number
// }

// Strategy signal
// export interface StrategySignal {
//   action: "BUY" | "SELL" | "CLOSE_LONG" | "CLOSE_SHORT" | "NONE"
//   price: number
//   timestamp: number
//   strength: number
//   reason: string
//   stopLoss: number | null
//   takeProfit: number | null
//   indicators: {
//     shortEma: number
//     longEma: number
//     vwap: number
//     emaPeriod: number
//   }
// }

// Strategy position
// export interface StrategyPosition {
//   type: "LONG" | "SHORT"
//   entryPrice: number
//   entryTime: number
// }

// Market data
export interface MarketData {
  symbol: string
  price: number
  timestamp: number
  volume24h?: number
  priceChange24h?: number
  priceChangePercent24h?: number
  high24h?: number
  low24h?: number
}

// Order types
export type OrderType = "MARKET" | "LIMIT" | "STOP" | "TAKE_PROFIT"

// Order side
export type OrderSide = "BUY" | "SELL"

// Order status
export type OrderStatus = "NEW" | "PARTIALLY_FILLED" | "FILLED" | "CANCELED" | "REJECTED" | "EXPIRED"

// Order
export interface Order {
  id: string
  symbol: string
  side: OrderSide
  type: OrderType
  price: number
  quantity: number
  status: OrderStatus
  createTime: number
  updateTime: number
  stopPrice?: number
  takeProfitPrice?: number
}
