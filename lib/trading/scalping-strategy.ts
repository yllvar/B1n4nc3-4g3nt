import type { Kline, StrategyParameters, StrategySignal, StrategyPosition } from "../market/interfaces"
import { calculateEMA, calculateVWAP } from "../utils/technical-indicators"
import { ValidationError } from "../error-types" // Updated import path

export class ScalpingStrategy {
  private parameters: StrategyParameters
  private lastSignal: StrategySignal | null = null
  private activePosition: StrategyPosition | null = null

  constructor(params?: Partial<StrategyParameters>) {
    // Default parameters
    this.parameters = {
      shortEmaPeriod: 9,
      longEmaPeriod: 21,
      emaThreshold: 0.0005, // 0.05%
      vwapPeriod: 20,
      vwapThreshold: 0.0008, // 0.08%
      takeProfitPercent: 0.005, // 0.5%
      stopLossPercent: 0.003, // 0.3%
      maxHoldingTimeMinutes: 5,
      maxTradesPerHour: 6,
      leverageMultiplier: 5,
      ...params,
    }
  }

  /**
   * Get strategy parameters
   */
  public getParameters(): StrategyParameters {
    return { ...this.parameters }
  }

  /**
   * Update strategy parameters
   */
  public updateParameters(params: Partial<StrategyParameters>): void {
    this.parameters = {
      ...this.parameters,
      ...params,
    }
  }

  /**
   * Get active position
   */
  public getActivePosition(): StrategyPosition | null {
    return this.activePosition
  }

  /**
   * Reset strategy state
   */
  public reset(): void {
    this.activePosition = null
  }

  /**
   * Calculate position size based on account balance and risk
   */
  public calculatePositionSize(accountBalance: number, currentPrice: number): number {
    // Calculate position size based on account balance, leverage, and a fixed risk percentage
    const riskPercentage = 0.02 // 2% risk per trade
    const positionValue = accountBalance * riskPercentage * this.parameters.leverageMultiplier
    return positionValue / currentPrice
  }

  /**
   * Calculate strategy signals based on kline data
   */
  public calculateSignals(klines: Kline[], higherTimeframeEma?: number): StrategySignal[] {
    try {
      // Validate input data
      if (!Array.isArray(klines)) {
        throw new ValidationError("Invalid klines data: expected array", {
          context: { invalidData: klines },
        })
      }

      if (klines.length === 0) {
        return []
      }

      if (
        klines.length <
        Math.max(this.parameters.shortEmaPeriod, this.parameters.longEmaPeriod, this.parameters.vwapPeriod)
      ) {
        return []
      }

      const closes = klines.map((k) => {
        if (typeof k.close !== "number") {
          throw new ValidationError("Invalid kline data: close price is not a number", {
            context: { invalidData: k },
          })
        }
        return k.close
      })

      const highs = klines.map((k) => {
        if (typeof k.high !== "number") {
          throw new ValidationError("Invalid kline data: high price is not a number", {
            context: { invalidData: k },
          })
        }
        return k.high
      })

      const lows = klines.map((k) => {
        if (typeof k.low !== "number") {
          throw new ValidationError("Invalid kline data: low price is not a number", {
            context: { invalidData: k },
          })
        }
        return k.low
      })

      const volumes = klines.map((k) => {
        if (typeof k.volume !== "number") {
          throw new ValidationError("Invalid kline data: volume is not a number", {
            context: { invalidData: k },
          })
        }
        return k.volume
      })

      const timestamps = klines.map((k) => {
        if (typeof k.openTime !== "number") {
          throw new ValidationError("Invalid kline data: openTime is not a number", {
            context: { invalidData: k },
          })
        }
        return k.openTime
      })

      // Calculate indicators
      const shortEma = calculateEMA(closes, this.parameters.shortEmaPeriod)
      const longEma = calculateEMA(closes, this.parameters.longEmaPeriod)
      const vwap = calculateVWAP(highs, lows, closes, volumes, this.parameters.vwapPeriod)

      const signals: StrategySignal[] = []

      // Generate signals for each candle
      for (
        let i = Math.max(this.parameters.shortEmaPeriod, this.parameters.longEmaPeriod, this.parameters.vwapPeriod);
        i < klines.length;
        i++
      ) {
        const currentPrice = closes[i]
        const currentShortEma = shortEma[i]
        const currentLongEma = longEma[i]
        const currentVwap = vwap[i]
        const timestamp = timestamps[i]

        // Skip if we don't have all indicators
        if (!currentShortEma || !currentLongEma || !currentVwap) continue

        let action: "BUY" | "SELL" | "CLOSE_LONG" | "CLOSE_SHORT" | "NONE" = "NONE"
        let strength = 50
        let reason = "No signal"
        let stopLoss: number | null = null
        let takeProfit: number | null = null

        // Check for entry signals
        if (!this.activePosition) {
          // Long signal: Short EMA crosses above Long EMA and price is above VWAP
          if (
            shortEma[i] > longEma[i] &&
            shortEma[i - 1] <= longEma[i - 1] &&
            currentPrice > currentVwap &&
            (!higherTimeframeEma || currentPrice > higherTimeframeEma)
          ) {
            action = "BUY"
            strength = 75
            reason = "EMA crossover with price above VWAP"
            stopLoss = currentPrice * (1 - this.parameters.stopLossPercent)
            takeProfit = currentPrice * (1 + this.parameters.takeProfitPercent)
            this.activePosition = {
              type: "LONG",
              entryPrice: currentPrice,
              entryTime: timestamp,
            }
          }
          // Short signal: Short EMA crosses below Long EMA and price is below VWAP
          else if (
            shortEma[i] < longEma[i] &&
            shortEma[i - 1] >= longEma[i - 1] &&
            currentPrice < currentVwap &&
            (!higherTimeframeEma || currentPrice < higherTimeframeEma)
          ) {
            action = "SELL"
            strength = 75
            reason = "EMA crossover with price below VWAP"
            stopLoss = currentPrice * (1 + this.parameters.stopLossPercent)
            takeProfit = currentPrice * (1 - this.parameters.takeProfitPercent)
            this.activePosition = {
              type: "SHORT",
              entryPrice: currentPrice,
              entryTime: timestamp,
            }
          }
        }
        // Check for exit signals
        else if (this.activePosition) {
          const holdingTimeMinutes = (timestamp - this.activePosition.entryTime) / (1000 * 60)

          // Exit long position
          if (this.activePosition.type === "LONG") {
            // Take profit
            if (currentPrice >= this.activePosition.entryPrice * (1 + this.parameters.takeProfitPercent)) {
              action = "CLOSE_LONG"
              strength = 90
              reason = "Take profit reached"
              this.activePosition = null
            }
            // Stop loss
            else if (currentPrice <= this.activePosition.entryPrice * (1 - this.parameters.stopLossPercent)) {
              action = "CLOSE_LONG"
              strength = 90
              reason = "Stop loss triggered"
              this.activePosition = null
            }
            // Max holding time
            else if (holdingTimeMinutes >= this.parameters.maxHoldingTimeMinutes) {
              action = "CLOSE_LONG"
              strength = 70
              reason = "Max holding time reached"
              this.activePosition = null
            }
            // Trend reversal
            else if (shortEma[i] < longEma[i] && shortEma[i - 1] >= longEma[i - 1]) {
              action = "CLOSE_LONG"
              strength = 60
              reason = "Trend reversal detected"
              this.activePosition = null
            }
          }
          // Exit short position
          else if (this.activePosition.type === "SHORT") {
            // Take profit
            if (currentPrice <= this.activePosition.entryPrice * (1 - this.parameters.takeProfitPercent)) {
              action = "CLOSE_SHORT"
              strength = 90
              reason = "Take profit reached"
              this.activePosition = null
            }
            // Stop loss
            else if (currentPrice >= this.activePosition.entryPrice * (1 + this.parameters.stopLossPercent)) {
              action = "CLOSE_SHORT"
              strength = 90
              reason = "Stop loss triggered"
              this.activePosition = null
            }
            // Max holding time
            else if (holdingTimeMinutes >= this.parameters.maxHoldingTimeMinutes) {
              action = "CLOSE_SHORT"
              strength = 70
              reason = "Max holding time reached"
              this.activePosition = null
            }
            // Trend reversal
            else if (shortEma[i] > longEma[i] && shortEma[i - 1] <= longEma[i - 1]) {
              action = "CLOSE_SHORT"
              strength = 60
              reason = "Trend reversal detected"
              this.activePosition = null
            }
          }
        }

        // Create signal
        const signal: StrategySignal = {
          action,
          price: currentPrice,
          timestamp,
          strength,
          reason,
          stopLoss,
          takeProfit,
          indicators: {
            shortEma: currentShortEma,
            longEma: currentLongEma,
            vwap: currentVwap,
            emaPeriod: this.parameters.shortEmaPeriod,
          },
        }

        signals.push(signal)
        this.lastSignal = signal
      }

      return signals
    } catch (error) {
      console.error("Error calculating signals:", error)
      return []
    }
  }
}

/**
 * Standalone function to calculate scalping signals
 * This function is exported for backward compatibility
 */
export function calculateScalpingSignal(klines: Kline[], params?: Partial<StrategyParameters>): StrategySignal | null {
  const strategy = new ScalpingStrategy(params)
  const signals = strategy.calculateSignals(klines)
  return signals.length > 0 ? signals[signals.length - 1] : null
}

// Re-export types from interfaces for backward compatibility
export type { StrategyParameters, StrategySignal, StrategyPosition } from "../market/interfaces"
