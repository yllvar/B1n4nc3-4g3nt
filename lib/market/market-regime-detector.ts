/**
 * Market Regime Detector
 * Detects market conditions and adapts strategy parameters accordingly
 */
import { calculateRSI, calculateBollingerBands, calculateATR, calculateEMA } from "../utils/technical-indicators"
import type { Kline } from "../market/interfaces"
import { errorHandler } from "../error-handling"

export type MarketRegime = "TRENDING_UP" | "TRENDING_DOWN" | "RANGING" | "VOLATILE" | "UNKNOWN"

export interface MarketCondition {
  regime: MarketRegime
  strength: number // 0-1 indicating strength of the regime
  volatility: number
  trend: number // -1 to 1, negative for downtrend, positive for uptrend
  momentum: number // -1 to 1
  support: number | null
  resistance: number | null
  description: string
}

export interface RegimeDetectionConfig {
  lookbackPeriods: number
  trendThreshold: number
  volatilityThreshold: number
  momentumThreshold: number
  rangeBoundThreshold: number
}

export class MarketRegimeDetector {
  private static instance: MarketRegimeDetector
  private config: RegimeDetectionConfig
  private regimeCache: Map<string, { condition: MarketCondition; timestamp: number }> = new Map()

  private constructor() {
    this.config = {
      lookbackPeriods: 20,
      trendThreshold: 0.3,
      volatilityThreshold: 0.015,
      momentumThreshold: 0.2,
      rangeBoundThreshold: 0.6,
    }
  }

  public static getInstance(): MarketRegimeDetector {
    if (!MarketRegimeDetector.instance) {
      MarketRegimeDetector.instance = new MarketRegimeDetector()
    }
    return MarketRegimeDetector.instance
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<RegimeDetectionConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  public getConfig(): RegimeDetectionConfig {
    return { ...this.config }
  }

  /**
   * Detect market regime from kline data
   */
  public detectRegime(symbol: string, klines: Kline[], timeframe = "1h"): MarketCondition {
    try {
      // Check cache first
      const cacheKey = `${symbol}_${timeframe}`
      const cachedRegime = this.regimeCache.get(cacheKey)
      const now = Date.now()

      // Use cache if it's less than 5 minutes old
      if (cachedRegime && now - cachedRegime.timestamp < 300000) {
        return cachedRegime.condition
      }

      // Ensure we have enough data
      if (klines.length < this.config.lookbackPeriods * 2) {
        return {
          regime: "UNKNOWN",
          strength: 0,
          volatility: 0,
          trend: 0,
          momentum: 0,
          support: null,
          resistance: null,
          description: "Insufficient data for regime detection",
        }
      }

      // Extract price data
      const closes = klines.map((k) => (typeof k.close === "number" ? k.close : Number.parseFloat(k.close as string)))
      const highs = klines.map((k) => (typeof k.high === "number" ? k.high : Number.parseFloat(k.high as string)))
      const lows = klines.map((k) => (typeof k.low === "number" ? k.low : Number.parseFloat(k.low as string)))

      // Calculate indicators
      const rsi = calculateRSI(closes, 14)
      const ema20 = calculateEMA(closes, 20)
      const ema50 = calculateEMA(closes, 50)
      const ema200 = calculateEMA(closes, 200)
      const bbands = calculateBollingerBands(closes, 20, 2)
      const atr = calculateATR(highs, lows, closes, 14)

      // Get latest values
      const currentClose = closes[closes.length - 1]
      const currentRsi = rsi[rsi.length - 1]
      const currentEma20 = ema20[ema20.length - 1]
      const currentEma50 = ema50[ema50.length - 1]
      const currentEma200 = ema200[ema200.length - 1]
      const currentAtr = atr[atr.length - 1]
      const currentUpperBand = bbands.upper[bbands.upper.length - 1]
      const currentLowerBand = bbands.lower[bbands.lower.length - 1]
      const currentMiddleBand = bbands.middle[bbands.middle.length - 1]

      // Calculate normalized volatility (ATR as percentage of price)
      const normalizedVolatility = currentAtr / currentClose

      // Calculate trend strength
      const shortTermTrend = (currentEma20 - currentEma50) / currentEma50
      const longTermTrend = (currentEma50 - currentEma200) / currentEma200
      const trendStrength = (shortTermTrend + longTermTrend) / 2

      // Calculate momentum
      const momentum = (currentRsi - 50) / 50

      // Calculate range-bound indicator
      const bandWidth = (currentUpperBand - currentLowerBand) / currentMiddleBand
      const normalizedBandWidth = Math.min(bandWidth / 0.05, 1) // Normalize to 0-1
      const rangeBoundIndicator = 1 - normalizedBandWidth

      // Detect support and resistance
      const { support, resistance } = this.detectSupportResistance(closes, highs, lows)

      // Determine market regime
      let regime: MarketRegime
      let strength: number
      let description: string

      if (normalizedVolatility > this.config.volatilityThreshold) {
        regime = "VOLATILE"
        strength = Math.min(normalizedVolatility / (this.config.volatilityThreshold * 2), 1)
        description = `Volatile market with ${(normalizedVolatility * 100).toFixed(2)}% price swings`
      } else if (trendStrength > this.config.trendThreshold && momentum > this.config.momentumThreshold) {
        regime = "TRENDING_UP"
        strength = Math.min(trendStrength / (this.config.trendThreshold * 2), 1)
        description = `Uptrend with ${(trendStrength * 100).toFixed(2)}% strength and positive momentum`
      } else if (trendStrength < -this.config.trendThreshold && momentum < -this.config.momentumThreshold) {
        regime = "TRENDING_DOWN"
        strength = Math.min(Math.abs(trendStrength) / (this.config.trendThreshold * 2), 1)
        description = `Downtrend with ${(Math.abs(trendStrength) * 100).toFixed(2)}% strength and negative momentum`
      } else if (rangeBoundIndicator > this.config.rangeBoundThreshold) {
        regime = "RANGING"
        strength = Math.min(rangeBoundIndicator / (this.config.rangeBoundThreshold * 1.2), 1)
        description = `Range-bound market with ${(rangeBoundIndicator * 100).toFixed(2)}% containment`
      } else {
        regime = "UNKNOWN"
        strength = 0.5
        description = "Mixed market conditions with no clear regime"
      }

      // Create market condition object
      const condition: MarketCondition = {
        regime,
        strength,
        volatility: normalizedVolatility,
        trend: trendStrength,
        momentum,
        support,
        resistance,
        description,
      }

      // Cache the result
      this.regimeCache.set(cacheKey, {
        condition,
        timestamp: now,
      })

      return condition
    } catch (error) {
      errorHandler.handleError(error, {
        context: { action: "detectRegime", symbol, timeframe },
        severity: "medium",
      })

      // Return safe default
      return {
        regime: "UNKNOWN",
        strength: 0,
        volatility: 0,
        trend: 0,
        momentum: 0,
        support: null,
        resistance: null,
        description: "Error detecting market regime",
      }
    }
  }

  /**
   * Detect support and resistance levels
   */
  private detectSupportResistance(
    closes: number[],
    highs: number[],
    lows: number[],
  ): { support: number | null; resistance: number | null } {
    // Simple implementation - can be enhanced with more sophisticated algorithms
    const recentLows = lows.slice(-30)
    const recentHighs = highs.slice(-30)

    // Find local minima and maxima
    const localMinima: number[] = []
    const localMaxima: number[] = []

    for (let i = 2; i < recentLows.length - 2; i++) {
      // Local minimum
      if (
        recentLows[i] < recentLows[i - 1] &&
        recentLows[i] < recentLows[i - 2] &&
        recentLows[i] < recentLows[i + 1] &&
        recentLows[i] < recentLows[i + 2]
      ) {
        localMinima.push()
      }

      // Local maximum
      if (
        recentHighs[i] > recentHighs[i - 1] &&
        recentHighs[i] > recentHighs[i - 2] &&
        recentHighs[i] > recentHighs[i + 1] &&
        recentHighs[i] > recentHighs[i + 2]
      ) {
        localMaxima.push(recentHighs[i])
      }
    }

    // Find the most recent significant support and resistance
    const currentPrice = closes[closes.length - 1]

    // Support is the highest local minimum below current price
    const supportCandidates = localMinima.filter((price) => price < currentPrice)
    const support = supportCandidates.length > 0 ? Math.max(...supportCandidates) : null

    // Resistance is the lowest local maximum above current price
    const resistanceCandidates = localMaxima.filter((price) => price > currentPrice)
    const resistance = resistanceCandidates.length > 0 ? Math.min(...resistanceCandidates) : null

    return { support, resistance }
  }

  /**
   * Get optimized strategy parameters for the current market regime
   */
  public getOptimizedParameters(symbol: string, klines: Kline[], timeframe: string, baseParameters: any): any {
    // Detect the current market regime
    const marketCondition = this.detectRegime(symbol, klines, timeframe)

    // Clone the base parameters
    const optimizedParams = { ...baseParameters }

    // Adjust parameters based on market regime
    switch (marketCondition.regime) {
      case "TRENDING_UP":
        // In strong uptrends, we can be more aggressive
        optimizedParams.takeProfitPercent = baseParameters.takeProfitPercent * 1.5
        optimizedParams.stopLossPercent = baseParameters.stopLossPercent * 0.8
        optimizedParams.trailingStopEnabled = true
        optimizedParams.maxHoldingTimeMinutes = baseParameters.maxHoldingTimeMinutes * 1.5
        break

      case "TRENDING_DOWN":
        // In downtrends, be more conservative with long positions
        optimizedParams.takeProfitPercent = baseParameters.takeProfitPercent * 0.8
        optimizedParams.stopLossPercent = baseParameters.stopLossPercent * 0.7
        optimizedParams.maxHoldingTimeMinutes = baseParameters.maxHoldingTimeMinutes * 0.7
        break

      case "RANGING":
        // In ranging markets, tighten profit targets and use mean reversion
        optimizedParams.takeProfitPercent = baseParameters.takeProfitPercent * 0.7
        optimizedParams.stopLossPercent = baseParameters.stopLossPercent * 1.2
        optimizedParams.trailingStopEnabled = false
        break

      case "VOLATILE":
        // In volatile markets, widen stops and take profits
        optimizedParams.takeProfitPercent = baseParameters.takeProfitPercent * 1.3
        optimizedParams.stopLossPercent = baseParameters.stopLossPercent * 1.5
        optimizedParams.maxHoldingTimeMinutes = baseParameters.maxHoldingTimeMinutes * 0.5
        break

      case "UNKNOWN":
      default:
        // No changes for unknown regime
        break
    }

    // Scale adjustments based on regime strength
    const strengthFactor = marketCondition.strength

    // Apply strength-based scaling to the adjustments
    for (const key of Object.keys(optimizedParams)) {
      if (key !== "trailingStopEnabled" && optimizedParams[key] !== baseParameters[key]) {
        // Scale the adjustment based on regime strength
        const adjustment = optimizedParams[key] - baseParameters[key]
        optimizedParams[key] = baseParameters[key] + adjustment * strengthFactor
      }
    }

    return optimizedParams
  }
}

// Export singleton instance
export const marketRegimeDetector = MarketRegimeDetector.getInstance()
