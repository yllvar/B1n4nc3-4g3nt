/**
 * Risk Manager
 * Provides comprehensive risk management for trading strategies
 */
import { errorHandler } from "../error-handling"
import { binanceApiService } from "../binance/binance-api-service"
import { calculateATR } from "../utils/technical-indicators"
import type { Kline } from "../market/interfaces"

export interface RiskParameters {
  // Account risk parameters
  maxAccountRiskPerTrade: number // Maximum percentage of account to risk per trade (0.01 = 1%)
  maxDailyDrawdown: number // Maximum daily drawdown before stopping trading (0.05 = 5%)
  maxPositionSize: number // Maximum position size as percentage of account (0.2 = 20%)

  // Position risk parameters
  defaultStopLossPercent: number // Default stop loss percentage (0.01 = 1%)
  defaultTakeProfitPercent: number // Default take profit percentage (0.02 = 2%)
  trailingStopEnabled: boolean // Whether to use trailing stops
  trailingStopActivationPercent: number // Percentage of profit to activate trailing stop (0.01 = 1%)
  trailingStopDistance: number // Distance to maintain for trailing stop (0.005 = 0.5%)

  // Market risk parameters
  maxVolatilityMultiplier: number // Maximum volatility multiplier for position sizing
  volatilityLookbackPeriod: number // Period for volatility calculation

  // Portfolio risk parameters
  maxOpenPositions: number // Maximum number of open positions
  correlationThreshold: number // Correlation threshold for position sizing (0.7 = 70%)
  sectorExposureLimit: number // Maximum exposure to a single sector (0.3 = 30%)

  // Time-based risk parameters
  maxHoldingTimeMinutes: number // Maximum holding time in minutes
  restrictedTradingHours: boolean // Whether to restrict trading to specific hours
  tradingStartHour: number // Hour to start trading (0-23)
  tradingEndHour: number // Hour to end trading (0-23)
}

export interface PositionSizeResult {
  size: number // Position size in base currency units
  maxSize: number // Maximum allowed position size
  limitingFactor: string // What factor limited the position size
  riskAmount: number // Amount of account equity at risk
  stopDistance: number // Distance to stop loss in price units
  confidence: number // Confidence score (0-1) based on risk factors
}

export interface RiskAssessment {
  overallRisk: "LOW" | "MEDIUM" | "HIGH" | "EXTREME"
  marketRisk: "LOW" | "MEDIUM" | "HIGH" | "EXTREME"
  positionRisk: "LOW" | "MEDIUM" | "HIGH" | "EXTREME"
  portfolioRisk: "LOW" | "MEDIUM" | "HIGH" | "EXTREME"
  riskFactors: {
    factor: string
    risk: "LOW" | "MEDIUM" | "HIGH" | "EXTREME"
    value: number
    threshold: number
    description: string
  }[]
  recommendations: string[]
}

export interface PortfolioStats {
  totalEquity: number
  availableEquity: number
  allocatedEquity: number
  openPositions: number
  dailyPnL: number
  dailyDrawdown: number
  highestDailyEquity: number
}

export class RiskManager {
  private static instance: RiskManager
  private parameters: RiskParameters
  private portfolioStats: PortfolioStats
  private positionCorrelations: Map<string, Map<string, number>> = new Map()
  private sectorExposures: Map<string, number> = new Map()
  private symbolSectors: Map<string, string> = new Map()
  private dailyTrades: { symbol: string; entryTime: number; exitTime: number | null; pnl: number }[] = []
  private volatilityCache: Map<string, { atr: number; timestamp: number }> = new Map()

  private constructor() {
    // Default risk parameters
    this.parameters = {
      maxAccountRiskPerTrade: 0.01, // 1% max risk per trade
      maxDailyDrawdown: 0.05, // 5% max daily drawdown
      maxPositionSize: 0.2, // 20% max position size

      defaultStopLossPercent: 0.01, // 1% default stop loss
      defaultTakeProfitPercent: 0.02, // 2% default take profit
      trailingStopEnabled: true,
      trailingStopActivationPercent: 0.01, // 1% profit to activate trailing stop
      trailingStopDistance: 0.005, // 0.5% trailing stop distance

      maxVolatilityMultiplier: 2.0, // Max volatility multiplier
      volatilityLookbackPeriod: 14, // 14 periods for volatility

      maxOpenPositions: 5, // Max 5 open positions
      correlationThreshold: 0.7, // 70% correlation threshold
      sectorExposureLimit: 0.3, // 30% max sector exposure

      maxHoldingTimeMinutes: 1440, // 24 hours max holding time
      restrictedTradingHours: false,
      tradingStartHour: 0,
      tradingEndHour: 23,
    }

    // Initialize portfolio stats
    this.portfolioStats = {
      totalEquity: 0,
      availableEquity: 0,
      allocatedEquity: 0,
      openPositions: 0,
      dailyPnL: 0,
      dailyDrawdown: 0,
      highestDailyEquity: 0,
    }

    // Initialize symbol sectors (example mapping)
    this.symbolSectors.set("BTCUSDT", "CRYPTO_MAJOR")
    this.symbolSectors.set("ETHUSDT", "CRYPTO_MAJOR")
    this.symbolSectors.set("BNBUSDT", "CRYPTO_EXCHANGE")
    this.symbolSectors.set("ADAUSDT", "CRYPTO_ALTCOIN")
    this.symbolSectors.set("DOGEUSDT", "CRYPTO_MEME")

    // Start daily reset timer
    this.setupDailyReset()
  }

  public static getInstance(): RiskManager {
    if (!RiskManager.instance) {
      RiskManager.instance = new RiskManager()
    }
    return RiskManager.instance
  }

  /**
   * Set up daily reset for statistics
   */
  private setupDailyReset(): void {
    const resetDaily = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)

      const timeUntilReset = tomorrow.getTime() - now.getTime()

      setTimeout(() => {
        this.resetDailyStats()
        resetDaily() // Set up next day's reset
      }, timeUntilReset)
    }

    resetDaily()
  }

  /**
   * Reset daily statistics
   */
  private resetDailyStats(): void {
    this.dailyTrades = []
    this.portfolioStats.dailyPnL = 0
    this.portfolioStats.dailyDrawdown = 0
    this.portfolioStats.highestDailyEquity = this.portfolioStats.totalEquity

    console.log("Daily risk statistics reset")
  }

  /**
   * Update risk parameters
   */
  public updateParameters(params: Partial<RiskParameters>): void {
    this.parameters = { ...this.parameters, ...params }
  }

  /**
   * Get current risk parameters
   */
  public getParameters(): RiskParameters {
    return { ...this.parameters }
  }

  /**
   * Update portfolio statistics
   */
  public async updatePortfolioStats(): Promise<void> {
    try {
      // Get account information
      const accountInfo = await binanceApiService.getAccountInfo()
      const positions = await binanceApiService.getPositionRisk()

      // Calculate total equity
      let totalEquity = 0
      let allocatedEquity = 0

      // Sum up all balances
      accountInfo.balances.forEach((balance) => {
        if (balance.asset === "USDT") {
          totalEquity += Number.parseFloat(balance.free) + Number.parseFloat(balance.locked)
        }
      })

      // Count open positions
      let openPositions = 0
      positions.forEach((position) => {
        const positionAmt = Number.parseFloat(position.positionAmt)
        if (positionAmt !== 0) {
          openPositions++
          const positionValue = Math.abs(positionAmt * Number.parseFloat(position.entryPrice))
          allocatedEquity += positionValue
        }
      })

      // Update portfolio stats
      this.portfolioStats.totalEquity = totalEquity
      this.portfolioStats.allocatedEquity = allocatedEquity
      this.portfolioStats.availableEquity = totalEquity - allocatedEquity
      this.portfolioStats.openPositions = openPositions

      // Update highest daily equity if needed
      if (totalEquity > this.portfolioStats.highestDailyEquity) {
        this.portfolioStats.highestDailyEquity = totalEquity
      }

      // Calculate daily drawdown
      const currentDrawdown = 1 - totalEquity / this.portfolioStats.highestDailyEquity
      this.portfolioStats.dailyDrawdown = Math.max(this.portfolioStats.dailyDrawdown, currentDrawdown)
    } catch (error) {
      errorHandler.handleError(error, {
        context: { action: "updatePortfolioStats" },
        severity: "medium",
      })
    }
  }

  /**
   * Get current portfolio statistics
   */
  public getPortfolioStats(): PortfolioStats {
    return { ...this.portfolioStats }
  }

  /**
   * Calculate position size based on risk parameters
   */
  public calculatePositionSize(
    symbol: string,
    entryPrice: number,
    stopLossPrice: number | null,
    klines: Kline[],
  ): PositionSizeResult {
    try {
      // Update volatility cache if needed
      this.updateVolatilityCache(symbol, klines)

      // Calculate stop distance
      const stopDistance = stopLossPrice
        ? Math.abs(entryPrice - stopLossPrice)
        : entryPrice * this.parameters.defaultStopLossPercent

      // Get account equity
      const accountEquity = this.portfolioStats.totalEquity

      // Calculate risk amount
      const riskAmount = accountEquity * this.parameters.maxAccountRiskPerTrade

      // Calculate base position size
      let positionSize = riskAmount / stopDistance
      let limitingFactor = "account_risk"

      // Apply volatility adjustment
      const volatilityAdjustment = this.calculateVolatilityAdjustment(symbol)
      positionSize = positionSize * volatilityAdjustment

      // Check maximum position size
      const maxPositionSize = (accountEquity * this.parameters.maxPositionSize) / entryPrice
      if (positionSize > maxPositionSize) {
        positionSize = maxPositionSize
        limitingFactor = "max_position_size"
      }

      // Check portfolio constraints
      const portfolioAdjustment = this.calculatePortfolioAdjustment(symbol)
      if (portfolioAdjustment < 1) {
        positionSize = positionSize * portfolioAdjustment
        limitingFactor = "portfolio_constraints"
      }

      // Check if we're in allowed trading hours
      if (this.parameters.restrictedTradingHours) {
        const currentHour = new Date().getHours()
        if (currentHour < this.parameters.tradingStartHour || currentHour >= this.parameters.tradingEndHour) {
          positionSize = 0
          limitingFactor = "trading_hours"
        }
      }

      // Check daily drawdown limit
      if (this.portfolioStats.dailyDrawdown >= this.parameters.maxDailyDrawdown) {
        positionSize = 0
        limitingFactor = "daily_drawdown"
      }

      // Calculate confidence score
      const confidence = this.calculateConfidenceScore(symbol, volatilityAdjustment, portfolioAdjustment)

      return {
        size: positionSize,
        maxSize: maxPositionSize,
        limitingFactor,
        riskAmount,
        stopDistance,
        confidence,
      }
    } catch (error) {
      errorHandler.handleError(error, {
        context: { action: "calculatePositionSize", symbol, entryPrice, stopLossPrice },
        severity: "medium",
      })

      // Return safe default values
      return {
        size: 0,
        maxSize: 0,
        limitingFactor: "error",
        riskAmount: 0,
        stopDistance: 0,
        confidence: 0,
      }
    }
  }

  /**
   * Update volatility cache for a symbol
   */
  private updateVolatilityCache(symbol: string, klines: Kline[]): void {
    const cachedVolatility = this.volatilityCache.get(symbol)
    const now = Date.now()

    // If cache is valid (less than 1 hour old), use it
    if (cachedVolatility && now - cachedVolatility.timestamp < 3600000) {
      return
    }

    // Calculate new ATR
    if (klines.length >= this.parameters.volatilityLookbackPeriod) {
      const highs = klines.map((k) => (typeof k.high === "number" ? k.high : Number.parseFloat(k.high as string)))
      const lows = klines.map((k) => (typeof k.low === "number" ? k.low : Number.parseFloat(k.low as string)))
      const closes = klines.map((k) => (typeof k.close === "number" ? k.close : Number.parseFloat(k.close as string)))

      const atr = calculateATR(highs, lows, closes, this.parameters.volatilityLookbackPeriod)
      const latestAtr = atr[atr.length - 1]

      // Update cache
      this.volatilityCache.set(symbol, {
        atr: latestAtr,
        timestamp: now,
      })
    }
  }

  /**
   * Calculate volatility adjustment factor
   */
  private calculateVolatilityAdjustment(symbol: string): number {
    const cachedVolatility = this.volatilityCache.get(symbol)

    if (!cachedVolatility) {
      return 1.0 // Default if no volatility data
    }

    // Get the latest price
    const latestPrice = 1000 // This should be fetched from market data service

    // Calculate normalized ATR (ATR as percentage of price)
    const normalizedAtr = cachedVolatility.atr / latestPrice

    // Inverse relationship: higher volatility = smaller position
    const volatilityFactor = 0.01 / normalizedAtr // 0.01 is the baseline volatility

    // Clamp the factor between 0.5 and maxVolatilityMultiplier
    return Math.min(Math.max(volatilityFactor, 0.5), this.parameters.maxVolatilityMultiplier)
  }

  /**
   * Calculate portfolio adjustment factor
   */
  private calculatePortfolioAdjustment(symbol: string): number {
    // Check number of open positions
    if (this.portfolioStats.openPositions >= this.parameters.maxOpenPositions) {
      return 0 // No more positions allowed
    }

    // Check sector exposure
    const sector = this.symbolSectors.get(symbol) || "UNKNOWN"
    const currentSectorExposure = this.sectorExposures.get(sector) || 0

    if (currentSectorExposure >= this.parameters.sectorExposureLimit) {
      return 0 // Sector exposure limit reached
    }

    // Calculate correlation adjustment
    let correlationAdjustment = 1.0

    // If we have correlation data for this symbol
    const symbolCorrelations = this.positionCorrelations.get(symbol)
    if (symbolCorrelations) {
      // Check correlation with existing positions
      let highestCorrelation = 0

      symbolCorrelations.forEach((correlation, otherSymbol) => {
        // Check if we have an open position in the correlated symbol
        // This would require tracking open positions by symbol
        const hasOpenPosition = false // Placeholder

        if (hasOpenPosition && correlation > highestCorrelation) {
          highestCorrelation = correlation
        }
      })

      // Adjust based on highest correlation
      if (highestCorrelation > this.parameters.correlationThreshold) {
        correlationAdjustment =
          1.0 -
          (highestCorrelation - this.parameters.correlationThreshold) / (1.0 - this.parameters.correlationThreshold)
      }
    }

    return correlationAdjustment
  }

  /**
   * Calculate confidence score for a trade
   */
  private calculateConfidenceScore(symbol: string, volatilityAdjustment: number, portfolioAdjustment: number): number {
    // Combine various factors into a confidence score (0-1)
    let confidence = 1.0

    // Adjust for volatility (higher volatility = lower confidence)
    confidence *= volatilityAdjustment / this.parameters.maxVolatilityMultiplier

    // Adjust for portfolio constraints
    confidence *= portfolioAdjustment

    // Adjust for time of day if restricted trading hours
    if (this.parameters.restrictedTradingHours) {
      const currentHour = new Date().getHours()
      const hoursFromEdge = Math.min(
        Math.abs(currentHour - this.parameters.tradingStartHour),
        Math.abs(currentHour - this.parameters.tradingEndHour),
      )

      // Lower confidence near the edges of trading hours
      if (hoursFromEdge < 2) {
        confidence *= hoursFromEdge / 2
      }
    }

    // Adjust for daily drawdown
    if (this.portfolioStats.dailyDrawdown > 0) {
      confidence *= 1 - this.portfolioStats.dailyDrawdown / this.parameters.maxDailyDrawdown
    }

    return Math.max(0, Math.min(1, confidence))
  }

  /**
   * Record a trade for risk tracking
   */
  public recordTrade(symbol: string, entryTime: number, exitTime: number | null, pnl: number): void {
    this.dailyTrades.push({
      symbol,
      entryTime,
      exitTime,
      pnl,
    })

    // Update daily PnL
    this.portfolioStats.dailyPnL += pnl

    // Update sector exposure if trade is closed
    if (exitTime) {
      const sector = this.symbolSectors.get(symbol) || "UNKNOWN"
      const currentExposure = this.sectorExposures.get(sector) || 0

      // Reduce exposure (this is simplified, should be based on position size)
      this.sectorExposures.set(sector, Math.max(0, currentExposure - 0.1))
    }
  }

  /**
   * Perform a comprehensive risk assessment
   */
  public assessRisk(symbol: string, klines: Kline[]): RiskAssessment {
    // Update volatility cache
    this.updateVolatilityCache(symbol, klines)

    const riskFactors: {
      factor: string
      risk: "LOW" | "MEDIUM" | "HIGH" | "EXTREME"
      value: number
      threshold: number
      description: string
    }[] = []

    // Assess market risk (volatility)
    const volatility = this.volatilityCache.get(symbol)?.atr || 0
    const normalizedVolatility = volatility / 1000 // Normalize to price

    let marketRisk: "LOW" | "MEDIUM" | "HIGH" | "EXTREME" = "LOW"
    if (normalizedVolatility > 0.03) {
      marketRisk = "EXTREME"
    } else if (normalizedVolatility > 0.02) {
      marketRisk = "HIGH"
    } else if (normalizedVolatility > 0.01) {
      marketRisk = "MEDIUM"
    }

    riskFactors.push({
      factor: "Market Volatility",
      risk: marketRisk,
      value: normalizedVolatility,
      threshold: 0.01,
      description: `Current volatility is ${(normalizedVolatility * 100).toFixed(2)}% of price`,
    })

    // Assess position risk
    const positionRisk = this.assessPositionRisk()

    // Assess portfolio risk
    const portfolioRisk = this.assessPortfolioRisk()

    // Determine overall risk (highest of the three)
    const riskLevels = {
      LOW: 0,
      MEDIUM: 1,
      HIGH: 2,
      EXTREME: 3,
    }

    const maxRiskLevel = Math.max(riskLevels[marketRisk], riskLevels[positionRisk.risk], riskLevels[portfolioRisk.risk])

    const overallRisk = Object.keys(riskLevels).find(
      (key) => riskLevels[key as keyof typeof riskLevels] === maxRiskLevel,
    ) as "LOW" | "MEDIUM" | "HIGH" | "EXTREME"

    // Add position risk factors
    riskFactors.push(...positionRisk.factors)

    // Add portfolio risk factors
    riskFactors.push(...portfolioRisk.factors)

    // Generate recommendations
    const recommendations = this.generateRiskRecommendations(overallRisk, riskFactors)

    return {
      overallRisk,
      marketRisk,
      positionRisk: positionRisk.risk,
      portfolioRisk: portfolioRisk.risk,
      riskFactors,
      recommendations,
    }
  }

  /**
   * Assess position risk
   */
  private assessPositionRisk(): {
    risk: "LOW" | "MEDIUM" | "HIGH" | "EXTREME"
    factors: {
      factor: string
      risk: "LOW" | "MEDIUM" | "HIGH" | "EXTREME"
      value: number
      threshold: number
      description: string
    }[]
  } {
    const factors: {
      factor: string
      risk: "LOW" | "MEDIUM" | "HIGH" | "EXTREME"
      value: number
      threshold: number
      description: string
    }[] = []

    // Assess stop loss distance
    const stopLossRisk =
      this.parameters.defaultStopLossPercent < 0.005
        ? "HIGH"
        : this.parameters.defaultStopLossPercent < 0.01
          ? "MEDIUM"
          : "LOW"

    factors.push({
      factor: "Stop Loss Distance",
      risk: stopLossRisk,
      value: this.parameters.defaultStopLossPercent,
      threshold: 0.01,
      description: `Stop loss is set at ${(this.parameters.defaultStopLossPercent * 100).toFixed(2)}% from entry`,
    })

    // Assess risk-reward ratio
    const riskRewardRatio = this.parameters.defaultTakeProfitPercent / this.parameters.defaultStopLossPercent
    const rrRisk =
      riskRewardRatio < 1 ? "EXTREME" : riskRewardRatio < 1.5 ? "HIGH" : riskRewardRatio < 2 ? "MEDIUM" : "LOW"

    factors.push({
      factor: "Risk-Reward Ratio",
      risk: rrRisk,
      value: riskRewardRatio,
      threshold: 2,
      description: `Risk-reward ratio is ${riskRewardRatio.toFixed(2)}:1`,
    })

    // Determine overall position risk (highest of the factors)
    const riskLevels = {
      LOW: 0,
      MEDIUM: 1,
      HIGH: 2,
      EXTREME: 3,
    }

    const maxRiskLevel = Math.max(...factors.map((f) => riskLevels[f.risk]))

    const overallRisk = Object.keys(riskLevels).find(
      (key) => riskLevels[key as keyof typeof riskLevels] === maxRiskLevel,
    ) as "LOW" | "MEDIUM" | "HIGH" | "EXTREME"

    return {
      risk: overallRisk,
      factors,
    }
  }

  /**
   * Assess portfolio risk
   */
  private assessPortfolioRisk(): {
    risk: "LOW" | "MEDIUM" | "HIGH" | "EXTREME"
    factors: {
      factor: string
      risk: "LOW" | "MEDIUM" | "HIGH" | "EXTREME"
      value: number
      threshold: number
      description: string
    }[]
  } {
    const factors: {
      factor: string
      risk: "LOW" | "MEDIUM" | "HIGH" | "EXTREME"
      value: number
      threshold: number
      description: string
    }[] = []

    // Assess daily drawdown
    const drawdownRisk =
      this.portfolioStats.dailyDrawdown > this.parameters.maxDailyDrawdown * 0.8
        ? "EXTREME"
        : this.portfolioStats.dailyDrawdown > this.parameters.maxDailyDrawdown * 0.6
          ? "HIGH"
          : this.portfolioStats.dailyDrawdown > this.parameters.maxDailyDrawdown * 0.4
            ? "MEDIUM"
            : "LOW"

    factors.push({
      factor: "Daily Drawdown",
      risk: drawdownRisk,
      value: this.portfolioStats.dailyDrawdown,
      threshold: this.parameters.maxDailyDrawdown,
      description: `Current drawdown is ${(this.portfolioStats.dailyDrawdown * 100).toFixed(2)}% of maximum ${(this.parameters.maxDailyDrawdown * 100).toFixed(2)}%`,
    })

    // Assess open positions
    const positionUtilization = this.portfolioStats.openPositions / this.parameters.maxOpenPositions
    const positionRisk = positionUtilization > 0.8 ? "HIGH" : positionUtilization > 0.6 ? "MEDIUM" : "LOW"

    factors.push({
      factor: "Position Utilization",
      risk: positionRisk,
      value: positionUtilization,
      threshold: 0.8,
      description: `Using ${this.portfolioStats.openPositions} of ${this.parameters.maxOpenPositions} available positions`,
    })

    // Assess equity allocation
    const equityAllocation = this.portfolioStats.allocatedEquity / this.portfolioStats.totalEquity
    const allocationRisk =
      equityAllocation > 0.8 ? "EXTREME" : equityAllocation > 0.6 ? "HIGH" : equityAllocation > 0.4 ? "MEDIUM" : "LOW"

    factors.push({
      factor: "Equity Allocation",
      risk: allocationRisk,
      value: equityAllocation,
      threshold: 0.6,
      description: `${(equityAllocation * 100).toFixed(2)}% of equity is allocated to positions`,
    })

    // Determine overall portfolio risk (highest of the factors)
    const riskLevels = {
      LOW: 0,
      MEDIUM: 1,
      HIGH: 2,
      EXTREME: 3,
    }

    const maxRiskLevel = Math.max(...factors.map((f) => riskLevels[f.risk]))

    const overallRisk = Object.keys(riskLevels).find(
      (key) => riskLevels[key as keyof typeof riskLevels] === maxRiskLevel,
    ) as "LOW" | "MEDIUM" | "HIGH" | "EXTREME"

    return {
      risk: overallRisk,
      factors,
    }
  }

  /**
   * Generate risk recommendations
   */
  private generateRiskRecommendations(
    overallRisk: "LOW" | "MEDIUM" | "HIGH" | "EXTREME",
    factors: {
      factor: string
      risk: "LOW" | "MEDIUM" | "HIGH" | "EXTREME"
      value: number
      threshold: number
      description: string
    }[],
  ): string[] {
    const recommendations: string[] = []

    // General recommendation based on overall risk
    switch (overallRisk) {
      case "EXTREME":
        recommendations.push("Consider pausing trading until risk levels decrease")
        break
      case "HIGH":
        recommendations.push("Reduce position sizes by 50% until risk levels normalize")
        break
      case "MEDIUM":
        recommendations.push("Consider reducing position sizes by 25%")
        break
      case "LOW":
        recommendations.push("Risk levels are acceptable for normal trading")
        break
    }

    // Specific recommendations based on risk factors
    factors.forEach((factor) => {
      if (factor.risk === "HIGH" || factor.risk === "EXTREME") {
        switch (factor.factor) {
          case "Market Volatility":
            recommendations.push("Reduce position sizes due to high market volatility")
            break
          case "Stop Loss Distance":
            recommendations.push("Consider widening stop loss distances in volatile conditions")
            break
          case "Risk-Reward Ratio":
            recommendations.push("Aim for higher take profit targets to improve risk-reward ratio")
            break
          case "Daily Drawdown":
            recommendations.push("Consider taking a break from trading to reset daily drawdown")
            break
          case "Position Utilization":
            recommendations.push("Close some positions before opening new ones")
            break
          case "Equity Allocation":
            recommendations.push("Reduce overall exposure to free up equity")
            break
        }
      }
    })

    return recommendations
  }
}

// Export singleton instance
export const riskManager = RiskManager.getInstance()
