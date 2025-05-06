/**
 * Market Data Types
 * Defines standard types for market data across the application
 */

// Base Kline (candlestick) data structure
export interface Kline {
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

// Parsed Kline with numeric values for calculations
export interface ParsedKline {
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
}

// Trading signal type
export interface TradingSignal {
  timestamp: number
  symbol: string
  interval: string
  type: SignalType
  price: number
  confidence: number
  indicators: Record<string, any>
  metadata: Record<string, any>
}

// Signal types
export type SignalType = "BUY" | "SELL" | "STRONG_BUY" | "STRONG_SELL" | "NEUTRAL"

// Strategy parameters
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
  [key: string]: any
}

// Market data service interface
export interface MarketDataService {
  getKlines(symbol: string, interval: string, limit?: number): Promise<Kline[]>
  getTicker(symbol: string): Promise<{ price: string }>
  getOrderBook(symbol: string, limit?: number): Promise<OrderBook>
  getTrades(symbol: string, limit?: number): Promise<Trade[]>
}

// Order book interface
export interface OrderBook {
  lastUpdateId: number
  bids: [string, string][] // [price, quantity]
  asks: [string, string][] // [price, quantity]
}

// Trade interface
export interface Trade {
  id: number
  price: string
  qty: string
  time: number
  isBuyerMaker: boolean
  isBestMatch: boolean
}
