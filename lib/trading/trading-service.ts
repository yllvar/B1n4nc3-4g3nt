/**
 * Trading Service
 * Handles trade execution and order management with integrated risk management
 */
import { v4 as uuidv4 } from "uuid"
import { ScalpingStrategy } from "./strategies/scalping-strategy"
import { enhancedMarketDataService } from "../market/enhanced-market-data-service"
import { binanceApiService } from "../binance/binance-api-service"
import { riskManager } from "./risk-manager"
import { performanceAnalytics } from "./performance-analytics"
import { marketRegimeDetector } from "../market/market-regime-detector"
import { errorHandler } from "../error-handler"
import type { Kline } from "../market/interfaces"
import type { StrategySignal } from "./strategies/scalping-strategy"
import type { StrategyParameters } from "../types/market-types"
import type { OrderSide, OrderType } from "../binance/binance-api-service"

export interface TradingServiceConfig {
  symbol: string
  timeframe: string
  strategyType: "SCALPING" | "TREND_FOLLOWING" | "MEAN_REVERSION"
  strategyParameters?: Partial<StrategyParameters>
  paperTrading?: boolean
  accountBalance?: number
  maxLeverage?: number
  enableRiskManagement?: boolean
  enableMarketRegimeDetection?: boolean
  enablePerformanceTracking?: boolean
}

export interface TradeExecutionResult {
  success: boolean
  orderId?: string
  error?: string
  price?: number
  quantity?: number
  side?: OrderSide
  type?: OrderType
  clientOrderId?: string
}

export interface TradingServiceState {
  id: string
  symbol: string
  timeframe: string
  strategyType: string
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
    orderId?: string
    clientOrderId?: string
  } | null
  lastSignal: StrategySignal | null
  recentSignals: StrategySignal[]
  strategyParameters: StrategyParameters
  marketRegime: string
  riskProfile: string
  pnl: {
    totalPnl: number
    winCount: number
    lossCount: number
    winRate: number
    averageWin: number
    averageLoss: number
    profitFactor: number
  }
}

export class TradingService {
  private id: string
  private symbol: string
  private timeframe: string
  private strategyType: "SCALPING" | "TREND_FOLLOWING" | "MEAN_REVERSION"
  private strategy: ScalpingStrategy
  private strategyParams: StrategyParameters
  private isActive = false
  private isPaperTrading = true
  private accountBalance = 10000 // Default paper trading balance
  private klineData: Kline[] = []
  private higherTimeframeKlineData: Kline[] = []
  private lastSignal: StrategySignal | null = null
  private recentSignals: StrategySignal[] = []
  private activePosition: {
    entryPrice: number
    entryTime: number
    type: "LONG" | "SHORT"
    quantity: number
    stopLoss: number
    takeProfit: number
    orderId?: string
    clientOrderId?: string
  } | null = null
  private pnl = {
    totalPnl: 0,
    winCount: 0,
    lossCount: 0,
    winRate: 0,
    averageWin: 0,
    averageLoss: 0,
    profitFactor: 0,
  }
  private unsubscribeFunctions: (() => void)[] = []
  private lastTradeTime = 0
  private tradeCount = 0
  private hourlyTradeLimit = 6
  private enableRiskManagement = true
  private enableMarketRegimeDetection = true
  private enablePerformanceTracking = true
  private maxLeverage = 5
  private currentMarketRegime = "UNKNOWN"
  private currentRiskProfile = "MEDIUM"
  private orderMonitorInterval: NodeJS.Timeout | null = null

  constructor(config: TradingServiceConfig) {
    this.id = uuidv4()
    this.symbol = config.symbol || "BTCUSDT"
    this.timeframe = config.timeframe || "5m"
    this.strategyType = config.strategyType || "SCALPING"
    this.isPaperTrading = config.paperTrading !== false
    this.accountBalance = config.accountBalance || 10000
    this.maxLeverage = config.maxLeverage || 5
    this.enableRiskManagement = config.enableRiskManagement !== false
    this.enableMarketRegimeDetection = config.enableMarketRegimeDetection !== false
    this.enablePerformanceTracking = config.enablePerformanceTracking !== false

    // Initialize strategy with parameters
    this.strategy = new ScalpingStrategy({
      symbol: this.symbol,
      interval: this.timeframe,
      ...config.strategyParameters,
    })

    this.strategyParams = this.strategy.getParameters()

    // Set test mode for Binance API if paper trading is enabled
    if (this.isPaperTrading) {
      binanceApiService.setTestMode(true)
    }
  }

  /**
   * Get trading service ID
   */
  public getId(): string {
    return this.id
  }

  /**
   * Updates strategy parameters
   */
  public updateStrategyParameters(params: Partial<StrategyParameters>): void {
    this.strategy.updateParameters(params)
    this.strategyParams = this.strategy.getParameters()
  }

  /**
   * Gets current strategy parameters
   */
  public getStrategyParameters(): StrategyParameters {
    return this.strategy.getParameters()
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

      // Start order monitoring if not in paper trading mode
      if (!this.isPaperTrading) {
        this.startOrderMonitoring()
      }

      this.isActive = true
      return true
    } catch (error) {
      errorHandler.handleError(error, {
        context: {
          action: "startTradingService",
          symbol: this.symbol,
          timeframe: this.timeframe,
        },
        severity: "high",
      })
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

    // Stop order monitoring
    if (this.orderMonitorInterval) {
      clearInterval(this.orderMonitorInterval)
      this.orderMonitorInterval = null
    }

    this.isActive = false
  }

  /**
   * Get the current state of the trading service
   */
  public getState(): TradingServiceState {
    return {
      id: this.id,
      symbol: this.symbol,
      timeframe: this.timeframe,
      strategyType: this.strategyType,
      isActive: this.isActive,
      isPaperTrading: this.isPaperTrading,
      accountBalance: this.accountBalance,
      activePosition: this.activePosition,
      lastSignal: this.lastSignal,
      recentSignals: this.recentSignals,
      strategyParameters: this.strategyParams,
      marketRegime: this.currentMarketRegime,
      riskProfile: this.currentRiskProfile,
      pnl: { ...this.pnl },
    }
  }

  /**
   * Get kline data for visualization
   */
  public getKlineData(): Kline[] {
    return [...this.klineData]
  }

  /**
   * Toggle paper trading mode
   */
  public togglePaperTrading(enabled: boolean): void {
    this.isPaperTrading = enabled
    binanceApiService.setTestMode(enabled)
  }

  /**
   * Set account balance for paper trading
   */
  public setAccountBalance(balance: number): void {
    this.accountBalance = balance

    // Update performance analytics if enabled
    if (this.enablePerformanceTracking) {
      performanceAnalytics.setInitialEquity(balance)
    }
  }

  /**
   * Initialize historical data
   */
  private async initializeData(): Promise<void> {
    try {
      // Fetch klines for main strategy
      const klinesResult = await enhancedMarketDataService.getKlines(this.symbol, this.timeframe, 500)
      if (klinesResult.error || !klinesResult.data) {
        throw new Error(`Failed to fetch ${this.timeframe} klines: ${klinesResult.error?.message || "Unknown error"}`)
      }
      this.klineData = klinesResult.data

      // Fetch higher timeframe klines for trend filter
      const higherTimeframe = this.getHigherTimeframe(this.timeframe)
      const higherTimeframeKlinesResult = await enhancedMarketDataService.getKlines(this.symbol, higherTimeframe, 100)
      if (higherTimeframeKlinesResult.error || !higherTimeframeKlinesResult.data) {
        throw new Error(
          `Failed to fetch ${higherTimeframe} klines: ${higherTimeframeKlinesResult.error?.message || "Unknown error"}`,
        )
      }
      this.higherTimeframeKlineData = higherTimeframeKlinesResult.data

      // Detect market regime if enabled
      if (this.enableMarketRegimeDetection) {
        const marketCondition = marketRegimeDetector.detectRegime(this.symbol, this.klineData, this.timeframe)
        this.currentMarketRegime = marketCondition.regime

        // Adapt strategy parameters to market regime
        this.adaptToMarketRegime()
      }

      // Update risk manager if enabled
      if (this.enableRiskManagement) {
        await riskManager.updatePortfolioStats()
      }

      // Calculate initial signals
      this.updateSignals()
    } catch (error) {
      errorHandler.handleError(error, {
        context: {
          action: "initializeData",
          symbol: this.symbol,
          timeframe: this.timeframe,
        },
        severity: "high",
      })
      throw error
    }
  }

  /**
   * Get higher timeframe for trend filtering
   */
  private getHigherTimeframe(timeframe: string): string {
    const timeframes = ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"]
    const currentIndex = timeframes.indexOf(timeframe)

    if (currentIndex === -1 || currentIndex >= timeframes.length - 1) {
      return "1d" // Default to daily if timeframe not found or already at highest
    }

    return timeframes[currentIndex + 2] || timeframes[timeframes.length - 1]
  }

  /**
   * Subscribe to real-time data
   */
  private subscribeToRealtimeData(): void {
    // Subscribe to main timeframe klines
    const unsubscribe1 = enhancedMarketDataService.subscribeToKlines(this.symbol, this.timeframe, (result) => {
      if (result.error || !result.data || result.data.length === 0) return

      this.klineData = result.data

      // Update signals
      this.updateSignals()

      // Check for trade execution
      this.checkForTradeExecution()
    })
    this.unsubscribeFunctions.push(unsubscribe1)

    // Subscribe to higher timeframe klines
    const higherTimeframe = this.getHigherTimeframe(this.timeframe)
    const unsubscribe2 = enhancedMarketDataService.subscribeToKlines(this.symbol, higherTimeframe, (result) => {
      if (result.error || !result.data || result.data.length === 0) return
      this.higherTimeframeKlineData = result.data

      // Update market regime if enabled
      if (this.enableMarketRegimeDetection) {
        const marketCondition = marketRegimeDetector.detectRegime(this.symbol, this.klineData, this.timeframe)

        // Only update if regime has changed
        if (marketCondition.regime !== this.currentMarketRegime) {
          this.currentMarketRegime = marketCondition.regime
          console.log(`Market regime changed to ${this.currentMarketRegime}`)

          // Adapt strategy parameters to new regime
          this.adaptToMarketRegime()
        }
      }
    })
    this.unsubscribeFunctions.push(unsubscribe2)
  }

  /**
   * Adapt strategy parameters to current market regime
   */
  private adaptToMarketRegime(): void {
    if (!this.enableMarketRegimeDetection) return

    const optimizedParams = marketRegimeDetector.getOptimizedParameters(
      this.symbol,
      this.klineData,
      this.timeframe,
      this.strategyParams,
    )

    console.log(`Adapting strategy parameters to ${this.currentMarketRegime} regime`)
    this.updateStrategyParameters(optimizedParams)
  }

  /**
   * Start monitoring open orders
   */
  private startOrderMonitoring(): void {
    if (this.orderMonitorInterval) {
      clearInterval(this.orderMonitorInterval)
    }

    this.orderMonitorInterval = setInterval(async () => {
      if (!this.activePosition || !this.activePosition.orderId) return

      try {
        // Check order status
        const orderStatus = await binanceApiService.getOrderStatus(this.symbol, {
          orderId: Number.parseInt(this.activePosition.orderId),
        })

        // If order is filled, update position
        if (orderStatus.status === "FILLED") {
          console.log(`Order ${this.activePosition.orderId} filled at ${orderStatus.price}`)

          // Update position with actual fill price
          this.activePosition.entryPrice = Number.parseFloat(orderStatus.price)

          // Place stop loss and take profit orders
          if (!this.isPaperTrading) {
            this.placeStopLossAndTakeProfit()
          }
        }
        // If order is canceled or expired, clear active position
        else if (orderStatus.status === "CANCELED" || orderStatus.status === "EXPIRED") {
          console.log(`Order ${this.activePosition.orderId} ${orderStatus.status.toLowerCase()}`)
          this.activePosition = null
        }
      } catch (error) {
        errorHandler.handleError(error, {
          context: {
            action: "monitorOrder",
            symbol: this.symbol,
            orderId: this.activePosition.orderId,
          },
          severity: "medium",
        })
      }
    }, 5000) // Check every 5 seconds
  }

  /**
   * Place stop loss and take profit orders
   */
  private async placeStopLossAndTakeProfit(): Promise<void> {
    if (!this.activePosition) return

    try {
      const { type, entryPrice, quantity, stopLoss, takeProfit } = this.activePosition
      const side: OrderSide = type === "LONG" ? "SELL" : "BUY"

      // Place stop loss order
      const stopLossOrder = await binanceApiService.placeOrder(this.symbol, side, "STOP_MARKET", quantity, {
        stopPrice: stopLoss,
        reduceOnly: true,
      })

      // Place take profit order
      const takeProfitOrder = await binanceApiService.placeOrder(this.symbol, side, "TAKE_PROFIT_MARKET", quantity, {
        stopPrice: takeProfit,
        reduceOnly: true,
      })

      console.log(`Placed stop loss at ${stopLoss} and take profit at ${takeProfit}`)
    } catch (error) {
      errorHandler.handleError(error, {
        context: {
          action: "placeStopLossAndTakeProfit",
          symbol: this.symbol,
          position: this.activePosition,
        },
        severity: "high",
      })
    }
  }

  /**
   * Update strategy signals
   */
  private updateSignals(): void {
    if (this.klineData.length === 0) {
      return
    }

    // Calculate signals using the strategy
    const signals = this.strategy.calculateSignals(this.klineData)

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
    const now = Date.now()

    // Check trade limits
    if (now - this.lastTradeTime < 3600000) {
      // Within the last hour
      if (this.tradeCount >= this.hourlyTradeLimit) {
        console.log(`Trade limit reached (${this.hourlyTradeLimit} per hour), skipping signal`)
        return
      }
    } else {
      // Reset counter for new hour
      this.tradeCount = 0
      this.lastTradeTime = now
    }

    // Handle entry signals
    if (action === "BUY" && !this.activePosition) {
      // Calculate position size with risk management if enabled
      let quantity: number

      if (this.enableRiskManagement) {
        const positionSizeResult = riskManager.calculatePositionSize(
          this.symbol,
          price,
          stopLoss || price * 0.98,
          this.klineData,
        )

        quantity = positionSizeResult.size

        // Check if risk management allows the trade
        if (quantity <= 0) {
          console.log(`Risk management prevented trade: ${positionSizeResult.limitingFactor}`)
          return
        }

        this.currentRiskProfile =
          positionSizeResult.confidence > 0.7 ? "LOW" : positionSizeResult.confidence > 0.4 ? "MEDIUM" : "HIGH"
      } else {
        // Use basic position sizing
        quantity = this.calculatePositionSize(price)
      }

      if (this.isPaperTrading) {
        this.executeTradeInPaperMode("BUY", price, quantity, stopLoss, takeProfit)
      } else {
        this.executeTrade("BUY", price, quantity, stopLoss, takeProfit)
      }

      this.tradeCount++
      this.lastTradeTime = now
    } else if (action === "SELL" && !this.activePosition) {
      // Calculate position size with risk management if enabled
      let quantity: number

      if (this.enableRiskManagement) {
        const positionSizeResult = riskManager.calculatePositionSize(
          this.symbol,
          price,
          stopLoss || price * 1.02,
          this.klineData,
        )

        quantity = positionSizeResult.size

        // Check if risk management allows the trade
        if (quantity <= 0) {
          console.log(`Risk management prevented trade: ${positionSizeResult.limitingFactor}`)
          return
        }

        this.currentRiskProfile =
          positionSizeResult.confidence > 0.7 ? "LOW" : positionSizeResult.confidence > 0.4 ? "MEDIUM" : "HIGH"
      } else {
        // Use basic position sizing
        quantity = this.calculatePositionSize(price)
      }

      if (this.isPaperTrading) {
        this.executeTradeInPaperMode("SELL", price, quantity, stopLoss, takeProfit)
      } else {
        this.executeTrade("SELL", price, quantity, stopLoss, takeProfit)
      }

      this.tradeCount++
      this.lastTradeTime = now
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
    // Basic position sizing without risk management
    const riskPercentage = 0.02 // 2% risk per trade
    const riskAmount = this.accountBalance * riskPercentage
    const stopLossPercent = 0.01 // 1% stop loss
    const stopLossDistance = currentPrice * stopLossPercent

    // Apply leverage
    const leveragedPositionSize = (riskAmount / stopLossDistance) * this.maxLeverage

    // Ensure position size is reasonable (not too large)
    const maxPositionSize = (this.accountBalance * 0.2 * this.maxLeverage) / currentPrice

    return Math.min(leveragedPositionSize, maxPositionSize)
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
      stopLoss: stopLoss || (side === "BUY" ? price * 0.99 : price * 1.01),
      takeProfit: takeProfit || (side === "BUY" ? price * 1.02 : price * 0.98),
      orderId: `paper_${Date.now()}`,
      clientOrderId: `paper_client_${Date.now()}`,
    }

    // Record trade in performance analytics if enabled
    if (this.enablePerformanceTracking) {
      performanceAnalytics.recordTrade({
        symbol: this.symbol,
        side,
        entryPrice: price,
        exitPrice: null,
        quantity,
        entryTime: Date.now(),
        exitTime: null,
        pnl: null,
        pnlPercent: null,
        fees: 0,
        stopLoss: this.activePosition.stopLoss,
        takeProfit: this.activePosition.takeProfit,
        strategy: this.strategyType,
        timeframe: this.timeframe,
        notes: `Market regime: ${this.currentMarketRegime}, Risk profile: ${this.currentRiskProfile}`,
        tags: [this.currentMarketRegime, this.currentRiskProfile],
      })
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
    let pnlPercent = 0

    if (this.activePosition.type === "LONG") {
      pnl = (currentPrice - this.activePosition.entryPrice) * this.activePosition.quantity
      pnlPercent = (currentPrice - this.activePosition.entryPrice) / this.activePosition.entryPrice
    } else {
      pnl = (this.activePosition.entryPrice - currentPrice) * this.activePosition.quantity
      pnlPercent = (this.activePosition.entryPrice - currentPrice) / this.activePosition.entryPrice
    }

    // Update account balance
    this.accountBalance += pnl

    // Update PnL statistics
    this.updatePnlStats(pnl)

    // Record trade completion in performance analytics if enabled
    if (this.enablePerformanceTracking) {
      const tradeId = this.activePosition.clientOrderId
      if (tradeId) {
        performanceAnalytics.updateTrade(tradeId, {
          exitPrice: currentPrice,
          exitTime: Date.now(),
          pnl,
          pnlPercent,
        })
      }
    }

    // Update risk manager if enabled
    if (this.enableRiskManagement) {
      riskManager.recordTrade(this.symbol, this.activePosition.entryTime, Date.now(), pnl)
    }

    // Clear active position
    this.activePosition = null

    // Reset strategy state
    this.strategy.reset()
  }

  /**
   * Execute real trade
   */
  private async executeTrade(
    side: "BUY" | "SELL",
    price: number,
    quantity: number,
    stopLoss: number | null,
    takeProfit: number | null,
  ): Promise<TradeExecutionResult> {
    try {
      console.log(`Executing ${side} order: ${quantity} ${this.symbol} @ ${price}`)

      // Generate client order ID
      const clientOrderId = `algo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

      // Place market order
      const orderResponse = await binanceApiService.placeOrder(this.symbol, side, "MARKET", quantity, {
        newClientOrderId: clientOrderId,
      })

      // Create active position
      this.activePosition = {
        entryPrice: Number.parseFloat(orderResponse.price) || price,
        entryTime: Date.now(),
        type: side === "BUY" ? "LONG" : "SHORT",
        quantity,
        stopLoss: stopLoss || (side === "BUY" ? price * 0.99 : price * 1.01),
        takeProfit: takeProfit || (side === "BUY" ? price * 1.02 : price * 0.98),
        orderId: orderResponse.orderId.toString(),
        clientOrderId,
      }

      // Place stop loss and take profit orders
      await this.placeStopLossAndTakeProfit()

      // Record trade in performance analytics if enabled
      if (this.enablePerformanceTracking) {
        performanceAnalytics.recordTrade({
          symbol: this.symbol,
          side,
          entryPrice: this.activePosition.entryPrice,
          exitPrice: null,
          quantity,
          entryTime: Date.now(),
          exitTime: null,
          pnl: null,
          pnlPercent: null,
          fees: 0, // We would calculate actual fees here
          stopLoss: this.activePosition.stopLoss,
          takeProfit: this.activePosition.takeProfit,
          strategy: this.strategyType,
          timeframe: this.timeframe,
          notes: `Market regime: ${this.currentMarketRegime}, Risk profile: ${this.currentRiskProfile}`,
          tags: [this.currentMarketRegime, this.currentRiskProfile],
        })
      }

      return {
        success: true,
        orderId: orderResponse.orderId.toString(),
        price: this.activePosition.entryPrice,
        quantity,
        side,
        type: "MARKET",
        clientOrderId,
      }
    } catch (error) {
      errorHandler.handleError(error, {
        context: {
          action: "executeTrade",
          symbol: this.symbol,
          side,
          price,
          quantity,
        },
        severity: "high",
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error executing trade",
      }
    }
  }

  /**
   * Close real position
   */
  private async closePosition(currentPrice: number): Promise<TradeExecutionResult> {
    try {
      if (!this.activePosition) {
        return {
          success: false,
          error: "No active position to close",
        }
      }

      console.log(`Closing position @ ${currentPrice}`)

      // Determine order side (opposite of position type)
      const side: OrderSide = this.activePosition.type === "LONG" ? "SELL" : "BUY"

      // Cancel any existing stop loss or take profit orders
      await binanceApiService.cancelAllOpenOrders(this.symbol)

      // Place market order to close position
      const orderResponse = await binanceApiService.placeOrder(
        this.symbol,
        side,
        "MARKET",
        this.activePosition.quantity,
        {
          reduceOnly: true,
        },
      )

      // Calculate PnL
      let pnl = 0
      let pnlPercent = 0
      const exitPrice = Number.parseFloat(orderResponse.price) || currentPrice

      if (this.activePosition.type === "LONG") {
        pnl = (exitPrice - this.activePosition.entryPrice) * this.activePosition.quantity
        pnlPercent = (exitPrice - this.activePosition.entryPrice) / this.activePosition.entryPrice
      } else {
        pnl = (this.activePosition.entryPrice - exitPrice) * this.activePosition.quantity
        pnlPercent = (this.activePosition.entryPrice - exitPrice) / this.activePosition.entryPrice
      }

      // Update PnL statistics
      this.updatePnlStats(pnl)

      // Record trade completion in performance analytics if enabled
      if (this.enablePerformanceTracking) {
        const tradeId = this.activePosition.clientOrderId
        if (tradeId) {
          performanceAnalytics.updateTrade(tradeId, {
            exitPrice,
            exitTime: Date.now(),
            pnl,
            pnlPercent,
          })
        }
      }

      // Update risk manager if enabled
      if (this.enableRiskManagement) {
        riskManager.recordTrade(this.symbol, this.activePosition.entryTime, Date.now(), pnl)
      }

      // Clear active position
      this.activePosition = null

      // Reset strategy state
      this.strategy.reset()

      return {
        success: true,
        orderId: orderResponse.orderId.toString(),
        price: exitPrice,
        quantity: this.activePosition.quantity,
        side,
        type: "MARKET",
      }
    } catch (error) {
      errorHandler.handleError(error, {
        context: {
          action: "closePosition",
          symbol: this.symbol,
          price: currentPrice,
          positionType: this.activePosition?.type,
        },
        severity: "high",
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error closing position",
      }
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
    } else if (pnl < 0) {
      this.pnl.lossCount++
      this.pnl.averageLoss = (this.pnl.averageLoss * (this.pnl.lossCount - 1) + Math.abs(pnl)) / this.pnl.lossCount
    }

    const totalTrades = this.pnl.winCount + this.pnl.lossCount
    this.pnl.winRate = totalTrades > 0 ? this.pnl.winCount / totalTrades : 0

    // Calculate profit factor (total profit / total loss)
    const totalProfit = this.pnl.winCount * this.pnl.averageWin
    const totalLoss = this.pnl.lossCount * this.pnl.averageLoss
    this.pnl.profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Number.POSITIVE_INFINITY : 0
  }
}

// Create and export a singleton instance
export default TradingService
