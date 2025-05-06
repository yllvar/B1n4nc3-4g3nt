/**
 * Trading Service
 * Handles trade execution and order management
 */
import type { Kline, ParsedKline, TradingSignal, StrategyParameters } from "../types/market-types"
import { parseKlineData, standardizeSignalFormat } from "../utils/type-adapters"
import { AppError, StrategyError } from "../error-handling/error-types"
import { calculateScalpingSignal } from "./scalping-strategy"
import { enhancedMarketDataService } from "../market/enhanced-market-data-service"
import type { StrategySignal } from "./scalping-strategy"
import type { Kline as OldKline } from "../market/interfaces"
import { calculateEMA } from "../utils/technical-indicators"

export interface TradingServiceConfig {
  symbol: string
  strategyParameters?: Partial<StrategyParameters>
  paperTrading?: boolean
  accountBalance?: number // For paper trading
}

export interface TradeExecutionResult {
  success: boolean
  orderId?: string
  error?: string
  price?: number
  quantity?: number
  side?: "BUY" | "SELL"
  type?: "MARKET" | "LIMIT"
}

export interface TradingServiceState {
  symbol: string
  isActive: boolean
  isPaperTrading: boolean
  accountBalance: number
  activePosition: {
    entryPrice: number
    entryTime: number
    type: "LONG" | "SHORT"
    quantity: number
    stopLoss: number
    takeProfit: number
  } | null
  lastSignal: StrategySignal | null
  recentSignals: StrategySignal[]
  strategyParameters: StrategyParameters
  pnl: {
    totalPnl: number
    winCount: number
    lossCount: number
    winRate: number
    averageWin: number
    averageLoss: number
  }
}

export class TradingService {
  private symbol: string
  private interval: string
  private strategyParams: StrategyParameters
  private isActive = false
  private isPaperTrading = true
  private accountBalance = 10000 // Default paper trading balance
  private klineData: OldKline[] = []
  private higherTimeframeKlineData: OldKline[] = []
  private lastSignal: StrategySignal | null = null
  private recentSignals: StrategySignal[] = []
  private activePosition: {
    entryPrice: number
    entryTime: number
    type: "LONG" | "SHORT"
    quantity: number
    stopLoss: number
    takeProfit: number
  } | null = null
  private pnl = {
    totalPnl: 0,
    winCount: 0,
    lossCount: 0,
    winRate: 0,
    averageWin: 0,
    averageLoss: 0,
  }
  private unsubscribeFunctions: (() => void)[] = []

  constructor(symbol = "BTCUSDT", interval = "1m", strategyParams: Partial<StrategyParameters> = {}) {
    this.symbol = symbol
    this.interval = interval
    this.strategyParams = {
      symbol,
      interval,
      rsiPeriod: 14,
      rsiOverbought: 70,
      rsiOversold: 30,
      emaPeriod: 20,
      macdFastPeriod: 12,
      macdSlowPeriod: 26,
      macdSignalPeriod: 9,
      ...strategyParams,
    }
  }

  /**
   * Analyzes kline data and generates trading signals
   */
  public analyzeMarketData(klines: Kline[]): TradingSignal {
    try {
      if (!klines || klines.length === 0) {
        throw new StrategyError("No kline data provided for analysis")
      }

      // Parse string values to numbers for calculations
      const parsedKlines: ParsedKline[] = klines.map(parseKlineData)

      // Generate signal using the scalping strategy
      const signal = calculateScalpingSignal(parsedKlines, this.strategyParams)

      // Ensure the signal format is standardized for visualization components
      return standardizeSignalFormat(signal)
    } catch (error) {
      if (error instanceof Error) {
        throw new StrategyError(`Error analyzing market data: ${error.message}`)
      }
      throw new AppError("Unknown error in market data analysis")
    }
  }

  /**
   * Updates strategy parameters
   */
  public updateStrategyParameters(params: Partial<StrategyParameters>): void {
    this.strategyParams = {
      ...this.strategyParams,
      ...params,
    }
  }

  /**
   * Gets current strategy parameters
   */
  public getStrategyParameters(): StrategyParameters {
    return { ...this.strategyParams }
  }

  /**
   * Start the trading service
   */
  public async start(): Promise<boolean> {
    if (this.isActive) {
      return true
    }

    try {
      // Initialize data
      await this.initializeData()

      // Subscribe to real-time data
      this.subscribeToRealtimeData()

      this.isActive = true
      return true
    } catch (error) {
      console.error("Error starting trading service:", error)
      return false
    }
  }

  /**
   * Stop the trading service
   */
  public stop(): void {
    if (!this.isActive) {
      return
    }

    // Unsubscribe from all data streams
    this.unsubscribeFunctions.forEach((unsubscribe) => unsubscribe())
    this.unsubscribeFunctions = []

    this.isActive = false
  }

  /**
   * Get the current state of the trading service
   */
  public getState(): TradingServiceState {
    return {
      symbol: this.symbol,
      isActive: this.isActive,
      isPaperTrading: this.isPaperTrading,
      accountBalance: this.accountBalance,
      activePosition: this.activePosition,
      lastSignal: this.lastSignal,
      recentSignals: this.recentSignals,
      strategyParameters: this.strategyParams,
      pnl: { ...this.pnl },
    }
  }

  /**
   * Get kline data for visualization
   */
  public getKlineData(): OldKline[] {
    return [...this.klineData]
  }

  /**
   * Toggle paper trading mode
   */
  public togglePaperTrading(enabled: boolean): void {
    this.isPaperTrading = enabled
  }

  /**
   * Set account balance for paper trading
   */
  public setAccountBalance(balance: number): void {
    this.accountBalance = balance
  }

  /**
   * Initialize historical data
   */
  private async initializeData(): Promise<void> {
    try {
      // Fetch 1-minute klines for main strategy
      const klinesResult = await enhancedMarketDataService.getKlines(this.symbol, "1m", 500)
      if (klinesResult.error || !klinesResult.data) {
        throw new Error(`Failed to fetch 1m klines: ${klinesResult.error?.message || "Unknown error"}`)
      }
      this.klineData = klinesResult.data

      // Fetch 15-minute klines for higher timeframe filter
      const higherTimeframeKlinesResult = await enhancedMarketDataService.getKlines(this.symbol, "15m", 100)
      if (higherTimeframeKlinesResult.error || !higherTimeframeKlinesResult.data) {
        throw new Error(`Failed to fetch 15m klines: ${higherTimeframeKlinesResult.error?.message || "Unknown error"}`)
      }
      this.higherTimeframeKlineData = higherTimeframeKlinesResult.data

      // Calculate initial signals
      this.updateSignals()
    } catch (error) {
      console.error("Error initializing data:", error)
      throw error
    }
  }

  /**
   * Subscribe to real-time data
   */
  private subscribeToRealtimeData(): void {
    // Subscribe to 1-minute klines
    const unsubscribe1m = enhancedMarketDataService.subscribeToKlines(this.symbol, "1m", (result) => {
      if (result.error || !result.data || result.data.length === 0) return

      this.klineData = result.data

      // Update signals
      this.updateSignals()

      // Check for trade execution
      this.checkForTradeExecution()
    })
    this.unsubscribeFunctions.push(unsubscribe1m)

    // Subscribe to 15-minute klines
    const unsubscribe15m = enhancedMarketDataService.subscribeToKlines(this.symbol, "15m", (result) => {
      if (result.error || !result.data || result.data.length === 0) return
      this.higherTimeframeKlineData = result.data
    })
    this.unsubscribeFunctions.push(unsubscribe15m)
  }

  /**
   * Update strategy signals
   */
  private updateSignals(): void {
    if (this.klineData.length === 0 || this.higherTimeframeKlineData.length === 0) {
      return
    }

    // Calculate higher timeframe EMA for trend filter
    const higherTimeframeCloses = this.higherTimeframeKlineData.map((k) => k.close)
    const higherTimeframeEma = calculateEMA(higherTimeframeCloses, 20)
    const currentHigherTimeframeEma = higherTimeframeEma[higherTimeframeEma.length - 1]

    // Calculate signals
    // const signals = this.strategy.calculateSignals(this.klineData, currentHigherTimeframeEma)
    const signals = []

    if (signals.length > 0) {
      // Get the latest signal
      const latestSignal = signals[signals.length - 1]

      // Update last signal
      this.lastSignal = latestSignal

      // Add to recent signals if it's an actionable signal
      if (latestSignal.action !== "NONE") {
        this.recentSignals.unshift(latestSignal)

        // Keep only the last 20 signals
        if (this.recentSignals.length > 20) {
          this.recentSignals.pop()
        }
      }
    }
  }

  /**
   * Check for trade execution based on latest signal
   */
  private checkForTradeExecution(): void {
    if (!this.lastSignal || this.lastSignal.action === "NONE") {
      return
    }

    const { action, price, stopLoss, takeProfit } = this.lastSignal

    // Handle entry signals
    if (action === "BUY" && !this.activePosition) {
      const quantity = this.calculatePositionSize(price)

      if (this.isPaperTrading) {
        this.executeTradeInPaperMode("BUY", price, quantity, stopLoss, takeProfit)
      } else {
        this.executeTrade("BUY", price, quantity, stopLoss, takeProfit)
      }
    } else if (action === "SELL" && !this.activePosition) {
      const quantity = this.calculatePositionSize(price)

      if (this.isPaperTrading) {
        this.executeTradeInPaperMode("SELL", price, quantity, stopLoss, takeProfit)
      } else {
        this.executeTrade("SELL", price, quantity, stopLoss, takeProfit)
      }
    }
    // Handle exit signals
    else if (action === "CLOSE_LONG" && this.activePosition && this.activePosition.type === "LONG") {
      if (this.isPaperTrading) {
        this.closePositionInPaperMode(price)
      } else {
        this.closePosition(price)
      }
    } else if (action === "CLOSE_SHORT" && this.activePosition && this.activePosition.type === "SHORT") {
      if (this.isPaperTrading) {
        this.closePositionInPaperMode(price)
      } else {
        this.closePosition(price)
      }
    }
  }

  /**
   * Calculate position size based on account balance and risk
   */
  private calculatePositionSize(currentPrice: number): number {
    // return this.strategy.calculatePositionSize(this.accountBalance, currentPrice)
    return 1
  }

  /**
   * Execute trade in paper trading mode
   */
  private executeTradeInPaperMode(
    side: "BUY" | "SELL",
    price: number,
    quantity: number,
    stopLoss: number | null,
    takeProfit: number | null,
  ): void {
    console.log(`[PAPER] Executing ${side} order: ${quantity} ${this.symbol} @ ${price}`)

    // Create active position
    this.activePosition = {
      entryPrice: price,
      entryTime: Date.now(),
      type: side === "BUY" ? "LONG" : "SHORT",
      quantity,
      stopLoss: stopLoss || (side === "BUY" ? price * 0.995 : price * 1.005),
      takeProfit: takeProfit || (side === "BUY" ? price * 1.01 : price * 0.99),
    }
  }

  /**
   * Close position in paper trading mode
   */
  private closePositionInPaperMode(currentPrice: number): void {
    if (!this.activePosition) {
      return
    }

    console.log(
      `[PAPER] Closing ${this.activePosition.type} position: ${this.activePosition.quantity} ${this.symbol} @ ${currentPrice}`,
    )

    // Calculate PnL
    let pnl = 0
    if (this.activePosition.type === "LONG") {
      pnl = (currentPrice - this.activePosition.entryPrice) * this.activePosition.quantity
    } else {
      pnl = (this.activePosition.entryPrice - currentPrice) * this.activePosition.quantity
    }

    // Update account balance
    this.accountBalance += pnl

    // Update PnL statistics
    this.updatePnlStats(pnl)

    // Clear active position
    this.activePosition = null

    // Reset strategy state
    // this.strategy.reset()
  }

  /**
   * Execute real trade (not implemented - would connect to Binance API)
   */
  private async executeTrade(
    side: "BUY" | "SELL",
    price: number,
    quantity: number,
    stopLoss: number | null,
    takeProfit: number | null,
  ): Promise<TradeExecutionResult> {
    // This would be implemented to connect to Binance Futures API
    console.log(`Executing ${side} order: ${quantity} ${this.symbol} @ ${price}`)

    // For now, just simulate paper trading
    this.executeTradeInPaperMode(side, price, quantity, stopLoss, takeProfit)

    return {
      success: true,
      orderId: `mock-${Date.now()}`,
      price,
      quantity,
      side,
      type: "MARKET",
    }
  }

  /**
   * Close real position (not implemented - would connect to Binance API)
   */
  private async closePosition(currentPrice: number): Promise<TradeExecutionResult> {
    // This would be implemented to connect to Binance Futures API
    console.log(`Closing position @ ${currentPrice}`)

    // For now, just simulate paper trading
    this.closePositionInPaperMode(currentPrice)

    return {
      success: true,
      orderId: `mock-close-${Date.now()}`,
      price: currentPrice,
      side: this.activePosition?.type === "LONG" ? "SELL" : "BUY",
      type: "MARKET",
    }
  }

  /**
   * Update PnL statistics
   */
  private updatePnlStats(pnl: number): void {
    this.pnl.totalPnl += pnl

    if (pnl > 0) {
      this.pnl.winCount++
      this.pnl.averageWin = (this.pnl.averageWin * (this.pnl.winCount - 1) + pnl) / this.pnl.winCount
    } else {
      this.pnl.lossCount++
      this.pnl.averageLoss = (this.pnl.averageLoss * (this.pnl.lossCount - 1) + Math.abs(pnl)) / this.pnl.lossCount
    }

    // Calculate win rate
    const totalTrades = this.pnl.winCount + this.pnl.lossCount
    this.pnl.winRate = totalTrades > 0 ? this.pnl.winCount / totalTrades : 0
  }
}

export default TradingService
