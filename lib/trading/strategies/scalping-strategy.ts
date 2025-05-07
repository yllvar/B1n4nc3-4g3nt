import type { Kline } from "@/lib/types/market-types"
import { calculateEMA, calculateRSI, calculateMACD, calculateVWAP } from "@/lib/utils/technical-indicators"
import { ValidationError } from "@/lib/error-handling"

export interface StrategyParameters {
  symbol: string
  interval: string
  shortEmaPeriod: number
  longEmaPeriod: number
  emaThreshold: number
  rsiPeriod: number
  rsiOverbought: number
  rsiOversold: number
  macdFastPeriod: number
  macdSlowPeriod: number
  macdSignalPeriod: number
  vwapPeriod: number
  vwapThreshold: number
  takeProfitPercent: number
  stopLossPercent: number
  maxHoldingTimeMinutes: number
  maxTradesPerHour: number
  leverageMultiplier: number
}

export interface StrategyPosition {
  type: "LONG" | "SHORT"
  entryPrice: number
  entryTime: number
  stopLoss?: number
  takeProfit?: number
}

export interface StrategySignal {
  action: "BUY" | "SELL" | "CLOSE_LONG" | "CLOSE_SHORT" | "NONE"
  price: number
  timestamp: number
  strength: number
  reason: string
  stopLoss: number | null
  takeProfit: number | null
  indicators: Record<string, number | string | boolean>
}

export class ScalpingStrategy {
  private parameters: StrategyParameters
  private lastSignal: StrategySignal | null = null
  private activePosition: StrategyPosition | null = null
  private recentTrades: Array<{
    type: "ENTRY" | "EXIT"
    position: "LONG" | "SHORT"
    price: number
    timestamp: number
    profit?: number
  }> = []

  constructor(params?: Partial<StrategyParameters>) {
    // Default parameters
    this.parameters = {
      symbol: "BTCUSDT",
      interval: "5m",
      shortEmaPeriod: 9,
      longEmaPeriod: 21,
      emaThreshold: 0.0005, // 0.05%
      rsiPeriod: 14,
      rsiOverbought: 70,
      rsiOversold: 30,
      macdFastPeriod: 12,
      macdSlowPeriod: 26,
      macdSignalPeriod: 9,
      vwapPeriod: 20,
      vwapThreshold: 0.0008, // 0.08%
      takeProfitPercent: 0.005, // 0.5%
      stopLossPercent: 0.003, // 0.3%
      maxHoldingTimeMinutes: 60,
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
    return this.activePosition ? { ...this.activePosition } : null
  }

  /**
   * Get recent trades
   */
  public getRecentTrades(): Array<{
    type: "ENTRY" | "EXIT"
    position: "LONG" | "SHORT"
    price: number
    timestamp: number
    profit?: number
  }> {
    return [...this.recentTrades]
  }

  /**
   * Reset strategy state
   */
  public reset(): void {
    this.activePosition = null
    this.lastSignal = null
  }

  /**
   * Calculate position size based on account balance and risk
   */
  public calculatePositionSize(accountBalance: number, currentPrice: number): number {
    // Calculate position size based on account balance, leverage, and a fixed risk percentage
    const riskPercentage = 0.02 // 2% risk per trade
    const riskAmount = accountBalance * riskPercentage

    // Calculate position size based on stop loss
    const stopLossDistance = currentPrice * this.parameters.stopLossPercent

    // Apply leverage
    const leveragedPositionSize = (riskAmount / stopLossDistance) * this.parameters.leverageMultiplier

    // Ensure position size is reasonable (not too large)
    const maxPositionSize = (accountBalance * 0.2 * this.parameters.leverageMultiplier) / currentPrice

    return Math.min(leveragedPositionSize, maxPositionSize)
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

      const minPeriod = Math.max(
        this.parameters.shortEmaPeriod,
        this.parameters.longEmaPeriod,
        this.parameters.rsiPeriod,
        this.parameters.macdSlowPeriod + this.parameters.macdSignalPeriod,
        this.parameters.vwapPeriod,
      )

      if (klines.length < minPeriod) {
        return []
      }

      // Extract data from klines
      const closes = klines.map((k) => (typeof k.close === "number" ? k.close : Number.parseFloat(k.close)))
      const highs = klines.map((k) => (typeof k.high === "number" ? k.high : Number.parseFloat(k.high)))
      const lows = klines.map((k) => (typeof k.low === "number" ? k.low : Number.parseFloat(k.low)))
      const volumes = klines.map((k) => (typeof k.volume === "number" ? k.volume : Number.parseFloat(k.volume)))
      const timestamps = klines.map((k) =>
        typeof k.openTime === "number" ? k.openTime : Number.parseInt(k.openTime as any),
      )

      // Calculate indicators
      const shortEma = calculateEMA(closes, this.parameters.shortEmaPeriod)
      const longEma = calculateEMA(closes, this.parameters.longEmaPeriod)
      const rsi = calculateRSI(closes, this.parameters.rsiPeriod)
      const macd = calculateMACD(
        closes,
        this.parameters.macdFastPeriod,
        this.parameters.macdSlowPeriod,
        this.parameters.macdSignalPeriod,
      )
      const vwap = calculateVWAP(highs, lows, closes, volumes, this.parameters.vwapPeriod)

      const signals: StrategySignal[] = []

      // Generate signals for each candle
      for (let i = minPeriod; i < klines.length; i++) {
        const currentPrice = closes[i]
        const currentShortEma = shortEma[i]
        const currentLongEma = longEma[i]
        const currentRsi = rsi[i]
        const currentMacd = macd.MACD[i]
        const currentMacdSignal = macd.signal[i]
        const currentMacdHistogram = macd.histogram[i]
        const currentVwap = vwap[i]
        const timestamp = timestamps[i]

        // Skip if we don't have all indicators
        if (!currentShortEma || !currentLongEma || !currentRsi || !currentMacd || !currentMacdSignal || !currentVwap) {
          continue
        }

        let action: "BUY" | "SELL" | "CLOSE_LONG" | "CLOSE_SHORT" | "NONE" = "NONE"
        let strength = 50
        let reason = "No signal"
        let stopLoss: number | null = null
        let takeProfit: number | null = null

        // Check for entry signals
        if (!this.activePosition) {
          // Long signal conditions
          const isLongSignal =
            // EMA crossover
            shortEma[i] > longEma[i] &&
            shortEma[i - 1] <= longEma[i - 1] &&
            // RSI not overbought
            currentRsi < this.parameters.rsiOverbought &&
            // MACD crossing above signal line
            currentMacdHistogram > 0 &&
            macd.histogram[i - 1] <= 0 &&
            // Price above VWAP
            currentPrice > currentVwap &&
            // Higher timeframe trend filter (if provided)
            (!higherTimeframeEma || currentPrice > higherTimeframeEma)

          // Short signal conditions
          const isShortSignal =
            // EMA crossover
            shortEma[i] < longEma[i] &&
            shortEma[i - 1] >= longEma[i - 1] &&
            // RSI not oversold
            currentRsi > this.parameters.rsiOversold &&
            // MACD crossing below signal line
            currentMacdHistogram < 0 &&
            macd.histogram[i - 1] >= 0 &&
            // Price below VWAP
            currentPrice < currentVwap &&
            // Higher timeframe trend filter (if provided)
            (!higherTimeframeEma || currentPrice < higherTimeframeEma)

          if (isLongSignal) {
            action = "BUY"
            strength = 75
            reason = "EMA crossover with MACD confirmation and price above VWAP"
            stopLoss = currentPrice * (1 - this.parameters.stopLossPercent)
            takeProfit = currentPrice * (1 + this.parameters.takeProfitPercent)

            // Create active position
            this.activePosition = {
              type: "LONG",
              entryPrice: currentPrice,
              entryTime: timestamp,
              stopLoss,
              takeProfit,
            }

            // Record trade
            this.recentTrades.push({
              type: "ENTRY",
              position: "LONG",
              price: currentPrice,
              timestamp,
            })

            // Limit recent trades history
            if (this.recentTrades.length > 50) {
              this.recentTrades.shift()
            }
          } else if (isShortSignal) {
            action = "SELL"
            strength = 75
            reason = "EMA crossover with MACD confirmation and price below VWAP"
            stopLoss = currentPrice * (1 + this.parameters.stopLossPercent)
            takeProfit = currentPrice * (1 - this.parameters.takeProfitPercent)

            // Create active position
            this.activePosition = {
              type: "SHORT",
              entryPrice: currentPrice,
              entryTime: timestamp,
              stopLoss,
              takeProfit,
            }

            // Record trade
            this.recentTrades.push({
              type: "ENTRY",
              position: "SHORT",
              price: currentPrice,
              timestamp,
            })

            // Limit recent trades history
            if (this.recentTrades.length > 50) {
              this.recentTrades.shift()
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

              // Calculate profit
              const profit = (currentPrice - this.activePosition.entryPrice) / this.activePosition.entryPrice

              // Record trade
              this.recentTrades.push({
                type: "EXIT",
                position: "LONG",
                price: currentPrice,
                timestamp,
                profit,
              })

              this.activePosition = null
            }
            // Stop loss
            else if (currentPrice <= this.activePosition.entryPrice * (1 - this.parameters.stopLossPercent)) {
              action = "CLOSE_LONG"
              strength = 90
              reason = "Stop loss triggered"

              // Calculate loss
              const profit = (currentPrice - this.activePosition.entryPrice) / this.activePosition.entryPrice

              // Record trade
              this.recentTrades.push({
                type: "EXIT",
                position: "LONG",
                price: currentPrice,
                timestamp,
                profit,
              })

              this.activePosition = null
            }
            // Max holding time
            else if (holdingTimeMinutes >= this.parameters.maxHoldingTimeMinutes) {
              action = "CLOSE_LONG"
              strength = 70
              reason = "Max holding time reached"

              // Calculate profit/loss
              const profit = (currentPrice - this.activePosition.entryPrice) / this.activePosition.entryPrice

              // Record trade
              this.recentTrades.push({
                type: "EXIT",
                position: "LONG",
                price: currentPrice,
                timestamp,
                profit,
              })

              this.activePosition = null
            }
            // Trend reversal
            else if (shortEma[i] < longEma[i] && shortEma[i - 1] >= longEma[i - 1] && currentMacdHistogram < 0) {
              action = "CLOSE_LONG"
              strength = 60
              reason = "Trend reversal detected"

              // Calculate profit/loss
              const profit = (currentPrice - this.activePosition.entryPrice) / this.activePosition.entryPrice

              // Record trade
              this.recentTrades.push({
                type: "EXIT",
                position: "LONG",
                price: currentPrice,
                timestamp,
                profit,
              })

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

              // Calculate profit
              const profit = (this.activePosition.entryPrice - currentPrice) / this.activePosition.entryPrice

              // Record trade
              this.recentTrades.push({
                type: "EXIT",
                position: "SHORT",
                price: currentPrice,
                timestamp,
                profit,
              })

              this.activePosition = null
            }
            // Stop loss
            else if (currentPrice >= this.activePosition.entryPrice * (1 + this.parameters.stopLossPercent)) {
              action = "CLOSE_SHORT"
              strength = 90
              reason = "Stop loss triggered"

              // Calculate loss
              const profit = (this.activePosition.entryPrice - currentPrice) / this.activePosition.entryPrice

              // Record trade
              this.recentTrades.push({
                type: "EXIT",
                position: "SHORT",
                price: currentPrice,
                timestamp,
                profit,
              })

              this.activePosition = null
            }
            // Max holding time
            else if (holdingTimeMinutes >= this.parameters.maxHoldingTimeMinutes) {
              action = "CLOSE_SHORT"
              strength = 70
              reason = "Max holding time reached"

              // Calculate profit/loss
              const profit = (this.activePosition.entryPrice - currentPrice) / this.activePosition.entryPrice

              // Record trade
              this.recentTrades.push({
                type: "EXIT",
                position: "SHORT",
                price: currentPrice,
                timestamp,
                profit,
              })

              this.activePosition = null
            }
            // Trend reversal
            else if (shortEma[i] > longEma[i] && shortEma[i - 1] <= longEma[i - 1] && currentMacdHistogram > 0) {
              action = "CLOSE_SHORT"
              strength = 60
              reason = "Trend reversal detected"

              // Calculate profit/loss
              const profit = (this.activePosition.entryPrice - currentPrice) / this.activePosition.entryPrice

              // Record trade
              this.recentTrades.push({
                type: "EXIT",
                position: "SHORT",
                price: currentPrice,
                timestamp,
                profit,
              })

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
            rsi: currentRsi,
            macd: currentMacd,
            macdSignal: currentMacdSignal,
            macdHistogram: currentMacdHistogram,
            vwap: currentVwap,
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
