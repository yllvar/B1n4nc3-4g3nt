/**
 * Technical Indicators Library
 * Contains functions for calculating various technical indicators
 */

import { memoize } from "@/lib/utils/memoize"

/**
 * Calculate Exponential Moving Average (EMA)
 * @param prices Array of price values
 * @param period EMA period
 * @returns Array of EMA values
 */
export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) {
    return Array(prices.length).fill(null)
  }

  // Calculate initial SMA
  const sma = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period

  // Calculate multiplier
  const multiplier = 2 / (period + 1)

  // Initialize EMA array with the first value as SMA
  const ema = Array(prices.length).fill(0)
  ema[period - 1] = sma

  // Calculate EMA for the rest of the prices
  for (let i = period; i < prices.length; i++) {
    ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1]
  }

  // Fill initial values with null
  for (let i = 0; i < period - 1; i++) {
    ema[i] = null
  }

  return ema
}

// Memoized version of calculateEMA
export const memoizedEMA = memoize(
  calculateEMA,
  (prices, period) => `ema-${period}-${prices.length}-${prices[0]}-${prices[prices.length - 1]}`,
  60000, // 1 minute cache
)

/**
 * Calculate Volume Weighted Average Price (VWAP)
 * @param prices Array of price values (typically (high + low + close) / 3)
 * @param volumes Array of volume values
 * @param period VWAP period
 * @returns Array of VWAP values
 */
export function calculateVWAP(prices: number[], volumes: number[], period: number): number[] {
  if (prices.length !== volumes.length) {
    throw new Error("Prices and volumes arrays must have the same length")
  }

  const vwap = Array(prices.length).fill(null)

  for (let i = period - 1; i < prices.length; i++) {
    let sumPV = 0
    let sumV = 0

    for (let j = i - period + 1; j <= i; j++) {
      sumPV += prices[j] * volumes[j]
      sumV += volumes[j]
    }

    vwap[i] = sumPV / sumV
  }

  return vwap
}

/**
 * Calculate VWAP slope (rate of change)
 * @param vwap Array of VWAP values
 * @param periods Number of periods to calculate slope
 * @returns Array of VWAP slope values
 */
export function calculateVWAPSlope(vwap: number[], periods = 3): number[] {
  const slope = Array(vwap.length).fill(null)

  for (let i = periods; i < vwap.length; i++) {
    if (vwap[i] !== null && vwap[i - periods] !== null) {
      slope[i] = (vwap[i] - vwap[i - periods]) / periods
    }
  }

  return slope
}

// Memoized version of calculateVWAP
export const memoizedVWAP = memoize(
  calculateVWAP,
  (prices, volumes, period) =>
    `vwap-${period}-${prices.length}-${prices[0]}-${prices[prices.length - 1]}-${volumes[0]}-${volumes[volumes.length - 1]}`,
  60000, // 1 minute cache
)

/**
 * Calculate Average True Range (ATR)
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of close prices
 * @param period ATR period
 * @returns Array of ATR values
 */
export function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number[] {
  if (highs.length !== lows.length || highs.length !== closes.length) {
    throw new Error("Highs, lows, and closes arrays must have the same length")
  }

  const trueRanges = Array(highs.length).fill(0)
  const atr = Array(highs.length).fill(null)

  // Calculate true ranges
  for (let i = 1; i < highs.length; i++) {
    const tr1 = highs[i] - lows[i] // Current high - current low
    const tr2 = Math.abs(highs[i] - closes[i - 1]) // Current high - previous close
    const tr3 = Math.abs(lows[i] - closes[i - 1]) // Current low - previous close
    trueRanges[i] = Math.max(tr1, tr2, tr3)
  }

  // Calculate initial ATR as simple average of true ranges
  if (highs.length >= period) {
    let sum = 0
    for (let i = 1; i <= period; i++) {
      sum += trueRanges[i]
    }
    atr[period] = sum / period

    // Calculate subsequent ATR values using smoothing
    for (let i = period + 1; i < highs.length; i++) {
      atr[i] = (atr[i - 1] * (period - 1) + trueRanges[i]) / period
    }
  }

  return atr
}

// Memoized version of calculateATR
export const memoizedATR = memoize(
  calculateATR,
  (highs, lows, closes, period) =>
    `atr-${period}-${highs.length}-${highs[0]}-${highs[highs.length - 1]}-${lows[0]}-${closes[closes.length - 1]}`,
  60000, // 1 minute cache
)

/**
 * Calculate Simple Moving Average (SMA)
 * @param prices Array of price values
 * @param period SMA period
 * @returns Array of SMA values
 */
export function calculateSMA(prices: number[], period: number): number[] {
  if (prices.length < period) {
    return Array(prices.length).fill(null)
  }

  const sma = Array(prices.length).fill(null)

  // Optimize by using a sliding window approach
  let sum = 0

  // Calculate first SMA
  for (let i = 0; i < period; i++) {
    sum += prices[i]
  }
  sma[period - 1] = sum / period

  // Calculate remaining SMAs using sliding window
  for (let i = period; i < prices.length; i++) {
    sum = sum - prices[i - period] + prices[i]
    sma[i] = sum / period
  }

  return sma
}

// Memoized version of calculateSMA
export const memoizedSMA = memoize(
  calculateSMA,
  (prices, period) => `sma-${period}-${prices.length}-${prices[0]}-${prices[prices.length - 1]}`,
  60000, // 1 minute cache
)

/**
 * Calculate Relative Strength Index (RSI)
 * @param prices Array of price values
 * @param period RSI period
 * @returns Array of RSI values
 */
export function calculateRSI(prices: number[], period: number): number[] {
  if (prices.length <= period) {
    return Array(prices.length).fill(null)
  }

  const rsi = Array(prices.length).fill(null)
  const gains = Array(prices.length).fill(0)
  const losses = Array(prices.length).fill(0)

  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    if (change > 0) {
      gains[i] = change
    } else {
      losses[i] = Math.abs(change)
    }
  }

  // Calculate initial average gain and loss
  let avgGain = 0
  let avgLoss = 0

  for (let i = 1; i <= period; i++) {
    avgGain += gains[i]
    avgLoss += losses[i]
  }

  avgGain /= period
  avgLoss /= period

  // Calculate RSI
  for (let i = period + 1; i < prices.length; i++) {
    // Smooth averages
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period

    // Calculate RS and RSI
    const rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss) // Avoid division by zero
    rsi[i] = 100 - 100 / (1 + rs)
  }

  return rsi
}

// Memoized version of calculateRSI
export const memoizedRSI = memoize(
  calculateRSI,
  (prices, period) => `rsi-${period}-${prices.length}-${prices[0]}-${prices[prices.length - 1]}`,
  60000, // 1 minute cache
)

/**
 * Get adaptive EMA period based on volatility (ATR)
 * @param price Current price
 * @param atr Current ATR value
 * @param baseEmaPeriod Base EMA period
 * @returns Adjusted EMA period
 */
export function getAdaptiveEmaPeriod(price: number, atr: number, baseEmaPeriod = 7): number {
  // Calculate ATR as percentage of price
  const atrPercent = atr / price

  // Thresholds for volatility adjustment
  const highVolatilityThreshold = 0.005 // 0.5% of price
  const lowVolatilityThreshold = 0.002 // 0.2% of price

  if (atrPercent > highVolatilityThreshold) {
    // High volatility - use shorter EMA period
    return Math.max(baseEmaPeriod - 2, 5)
  } else if (atrPercent < lowVolatilityThreshold) {
    // Low volatility - use longer EMA period
    return baseEmaPeriod + 2
  }

  // Medium volatility - use base period
  return baseEmaPeriod
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * @param prices Array of price values
 * @param fastPeriod Fast EMA period (default: 12)
 * @param slowPeriod Slow EMA period (default: 26)
 * @param signalPeriod Signal EMA period (default: 9)
 * @returns Object with macdLine, signalLine, and histogram arrays
 */
export function calculateMACD(prices: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  // Calculate fast and slow EMAs
  const fastEMA = calculateEMA(prices, fastPeriod)
  const slowEMA = calculateEMA(prices, slowPeriod)

  // Calculate MACD line (fast EMA - slow EMA)
  const macdLine = fastEMA.map((fast, i) => {
    if (fast === null || slowEMA[i] === null) return null
    return fast - slowEMA[i]
  })

  // Calculate signal line (EMA of MACD line)
  const validMacdValues = macdLine.filter((value): value is number => value !== null)
  const signalLineTemp = calculateEMA(validMacdValues, signalPeriod)

  // Align signal line with original array length
  const signalLine = Array(prices.length).fill(null)
  let validCount = 0

  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] !== null) {
      if (validCount < signalLineTemp.length) {
        signalLine[i] = signalLineTemp[validCount]
        validCount++
      }
    }
  }

  // Calculate histogram (MACD line - signal line)
  const histogram = macdLine.map((macd, i) => {
    if (macd === null || signalLine[i] === null) return null
    return macd - signalLine[i]
  })

  return { macdLine, signalLine, histogram }
}

// Memoized version of calculateMACD
export const memoizedMACD = memoize(
  calculateMACD,
  (prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) =>
    `macd-${fastPeriod}-${slowPeriod}-${signalPeriod}-${prices.length}-${prices[0]}-${prices[prices.length - 1]}`,
  60000, // 1 minute cache
)
