/**
 * Trading Types
 * Types related to trading strategies and execution
 */

// Trading signal types
export type SignalDirection = "BUY" | "SELL" | "NEUTRAL"
export type SignalStrength = "WEAK" | "MODERATE" | "STRONG"
export type SignalTimeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d"

/**
 * Trading signal information
 */
export interface TradingSignal {
  symbol: string
  direction: SignalDirection
  strength: SignalStrength
  entryPrice: number | null
  stopLoss: number | null
  takeProfit: number | null
  timeframe: SignalTimeframe
  timestamp: number
  strategy: string
  indicators: Record<string, any>
  confidence: number
  notes: string
}

/**
 * Strategy configuration parameters
 */
export interface StrategyParameters {
  symbol: string
  timeframe: SignalTimeframe
  riskPercentage: number
  maxPositions: number
  takeProfitMultiplier: number
  stopLossMultiplier: number
  trailingStopEnabled: boolean
  trailingStopActivationPercent: number
  trailingStopDistance: number
  [key: string]: any
}

/**
 * Record of a completed or active trade
 */
export interface TradeRecord {
  id: string
  symbol: string
  side: "BUY" | "SELL"
  entryPrice: number
  exitPrice: number | null
  quantity: number
  entryTime: number
  exitTime: number | null
  pnl: number | null
  pnlPercent: number | null
  fees: number
  stopLoss: number | null
  takeProfit: number | null
  strategy: string
  timeframe: string
  notes: string
  tags: string[]
  status: "OPEN" | "CLOSED" | "CANCELED" | "REJECTED"
}

/**
 * Trading performance metrics
 */
export interface PerformanceSummary {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  breakEvenTrades: number
  winRate: number
  profitFactor: number
  averageWin: number
  averageLoss: number
  largestWin: number
  largestLoss: number
  averageHoldingTime: number
  netProfit: number
  grossProfit: number
  grossLoss: number
  totalFees: number
  sharpeRatio: number | null
  sortinoRatio: number | null
  maxDrawdown: number
  maxDrawdownPercent: number
  expectancy: number
  averageRRR: number
  profitPerDay: number
  tradesPerDay: number
}

/**
 * Risk management parameters
 */
export interface RiskParameters {
  maxRiskPerTrade: number
  maxRiskPerDay: number
  maxDrawdown: number
  maxPositions: number
  maxLeverage: number
  maxPositionSize: number
}

/**
 * Trading service interface
 * Defines methods for executing trades and managing positions
 */
export interface TradingServiceInterface {
  executeStrategy(strategyName: string, parameters: StrategyParameters): Promise<TradingSignal | null>
  executeSignal(signal: TradingSignal): Promise<TradeRecord | null>
  getActivePositions(): Promise<TradeRecord[]>
  closePosition(tradeId: string): Promise<TradeRecord | null>
  getPerformanceSummary(): PerformanceSummary
  getTradeHistory(): TradeRecord[]
  setRiskParameters(params: RiskParameters): void
  getRiskParameters(): RiskParameters
}
