/**
 * Technical Indicators Library
 *
 * This file contains implementations of common technical indicators used in trading strategies.
 * All functions are optimized for performance and accuracy.
 */

/**
 * Calculate Exponential Moving Average (EMA)
 * @param prices Array of price values
 * @param period EMA period
 * @returns Array of EMA values
 */
export function calculateEMA(prices: number[], period: number): number[] {
  if (!prices || prices.length === 0 || period <= 0) {
    return []
  }

  const ema: number[] = []
  const multiplier = 2 / (period + 1)

  // Initialize EMA with SMA for the first period
  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += prices[i]
  }
  ema[period - 1] = sum / period

  // Calculate EMA for the rest of the prices
  for (let i = period; i < prices.length; i++) {
    ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1]
  }

  return ema
}

/**
 * Calculate Simple Moving Average (SMA)
 * @param prices Array of price values
 * @param period SMA period
 * @returns Array of SMA values
 */
export function calculateSMA(prices: number[], period: number): number[] {
  if (!prices || prices.length === 0 || period <= 0) {
    return []
  }

  const sma: number[] = []

  for (let i = period - 1; i < prices.length; i++) {
    let sum = 0
    for (let j = 0; j < period; j++) {
      sum += prices[i - j]
    }
    sma[i] = sum / period
  }

  return sma
}

/**
 * Calculate Relative Strength Index (RSI)
 * @param prices Array of price values
 * @param period RSI period
 * @returns Array of RSI values
 */
export function calculateRSI(prices: number[], period: number): number[] {
  if (!prices || prices.length <= period) {
    return []
  }

  const rsi: number[] = []
  const gains: number[] = []
  const losses: number[] = []

  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    gains[i - 1] = change > 0 ? change : 0
    losses[i - 1] = change < 0 ? Math.abs(change) : 0
  }

  // Calculate initial average gain and loss
  let avgGain = 0
  let avgLoss = 0
  for (let i = 0; i < period; i++) {
    avgGain += gains[i]
    avgLoss += losses[i]
  }
  avgGain /= period
  avgLoss /= period

  // Calculate RSI
  for (let i = period; i < prices.length; i++) {
    // Update average gain and loss
    avgGain = (avgGain * (period - 1) + gains[i - 1]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period

    // Calculate RS and RSI
    const rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss) // Avoid division by zero
    rsi[i] = 100 - 100 / (1 + rs)
  }

  return rsi
}

/**
 * Calculate Moving Average Convergence Divergence (MACD)
 * @param prices Array of price values
 * @param fastPeriod Fast EMA period
 * @param slowPeriod Slow EMA period
 * @param signalPeriod Signal EMA period
 * @returns Object with MACD line, signal line, and histogram
 */
export function calculateMACD(
  prices: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): { macd: number[]; signal: number[]; histogram: number[] } {
  if (!prices || prices.length === 0) {
    return { macd: [], signal: [], histogram: [] }
  }

  const fastEMA = calculateEMA(prices, fastPeriod)
  const slowEMA = calculateEMA(prices, slowPeriod)
  const macd: number[] = []
  const signal: number[] = []
  const histogram: number[] = []

  // Calculate MACD line
  for (let i = slowPeriod - 1; i < prices.length; i++) {
    macd[i] = fastEMA[i] - slowEMA[i]
  }

  // Calculate signal line (EMA of MACD)
  const macdValues = macd.slice(slowPeriod - 1)
  const signalValues = calculateEMA(macdValues, signalPeriod)

  // Adjust signal values to match the original array indices
  for (let i = 0; i < signalValues.length; i++) {
    signal[i + slowPeriod - 1 + signalPeriod - 1] = signalValues[i]
  }

  // Calculate histogram
  for (let i = slowPeriod - 1 + signalPeriod - 1; i < prices.length; i++) {
    histogram[i] = macd[i] - signal[i]
  }

  return { macd, signal, histogram }
}

/**
 * Calculate Volume Weighted Average Price (VWAP)
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of close prices
 * @param volumes Array of volumes
 * @param period VWAP period
 * @returns Array of VWAP values
 */
export function calculateVWAP(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  period: number,
): number[] {
  if (
    !highs ||
    !lows ||
    !closes ||
    !volumes ||
    highs.length === 0 ||
    lows.length === 0 ||
    closes.length === 0 ||
    volumes.length === 0 ||
    period <= 0
  ) {
    return []
  }

  const vwap: number[] = []
  const typicalPrices: number[] = []

  // Calculate typical price for each candle
  for (let i = 0; i < highs.length; i++) {
    typicalPrices[i] = (highs[i] + lows[i] + closes[i]) / 3
  }

  // Calculate VWAP for each period
  for (let i = period - 1; i < typicalPrices.length; i++) {
    let sumPriceVolume = 0
    let sumVolume = 0

    for (let j = i - period + 1; j <= i; j++) {
      sumPriceVolume += typicalPrices[j] * volumes[j]
      sumVolume += volumes[j]
    }

    vwap[i] = sumVolume > 0 ? sumPriceVolume / sumVolume : 0
  }

  return vwap
}

/**
 * Calculate Average True Range (ATR)
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of close prices
 * @param period ATR period (default: 14)
 * @returns Array of ATR values
 */
export function calculateATR(highs: number[], lows: number[], closes: number[], period = 14): number[] {
  if (!highs.length || !lows.length || !closes.length || period <= 0) {
    return []
  }

  const length = Math.min(highs.length, lows.length, closes.length)
  const trueRanges: number[] = []
  const atr: number[] = []

  // Calculate True Range for each candle
  for (let i = 0; i < length; i++) {
    if (i === 0) {
      // For the first candle, TR is simply High - Low
      trueRanges.push(highs[i] - lows[i])
    } else {
      // For subsequent candles, TR is the greatest of:
      // 1. Current High - Current Low
      // 2. |Current High - Previous Close|
      // 3. |Current Low - Previous Close|
      const highLow = highs[i] - lows[i]
      const highClosePrev = Math.abs(highs[i] - closes[i - 1])
      const lowClosePrev = Math.abs(lows[i] - closes[i - 1])
      trueRanges.push(Math.max(highLow, highClosePrev, lowClosePrev))
    }
  }

  // Initialize with NaN for values where we don't have enough data
  for (let i = 0; i < period - 1; i++) {
    atr.push(Number.NaN)
  }

  // Calculate first ATR as simple average of TR
  let firstATR = 0
  for (let i = 0; i < period; i++) {
    firstATR += trueRanges[i]
  }
  firstATR /= period
  atr.push(firstATR)

  // Calculate subsequent ATRs using Wilder's smoothing
  for (let i = period; i < length; i++) {
    const currentATR = ((period - 1) * atr[atr.length - 1] + trueRanges[i]) / period
    atr.push(currentATR)
  }

  return atr
}

/**
 * Calculate Bollinger Bands
 * @param prices Array of price values
 * @param period Bollinger Bands period
 * @param stdDev Standard deviation multiplier
 * @returns Object with upper, middle, and lower bands
 */
export function calculateBollingerBands(
  prices: number[],
  period = 20,
  stdDev = 2,
): { upper: number[]; middle: number[]; lower: number[] } {
  if (!prices || prices.length === 0 || period <= 0) {
    return { upper: [], middle: [], lower: [] }
  }

  const middle = calculateSMA(prices, period)
  const upper: number[] = []
  const lower: number[] = []

  for (let i = period - 1; i < prices.length; i++) {
    let sum = 0
    for (let j = 0; j < period; j++) {
      sum += Math.pow(prices[i - j] - middle[i], 2)
    }
    const std = Math.sqrt(sum / period)
    upper[i] = middle[i] + stdDev * std
    lower[i] = middle[i] - stdDev * std
  }

  return { upper, middle, lower }
}

/**
 * Calculate Stochastic Oscillator
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of close prices
 * @param kPeriod Period for %K calculation (default: 14)
 * @param dPeriod Period for %D calculation (default: 3)
 * @returns Object with %K and %D values
 */
export function calculateStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod = 14,
  dPeriod = 3,
): { k: number[]; d: number[] } {
  if (!highs.length || !lows.length || !closes.length) {
    return { k: [], d: [] }
  }

  const length = Math.min(highs.length, lows.length, closes.length)
  const k: number[] = []

  // Calculate %K
  for (let i = 0; i < length; i++) {
    if (i < kPeriod - 1) {
      k.push(Number.NaN)
      continue
    }

    // Find highest high and lowest low in the period
    let highestHigh = Number.NEGATIVE_INFINITY
    let lowestLow = Number.POSITIVE_INFINITY

    for (let j = i - kPeriod + 1; j <= i; j++) {
      highestHigh = Math.max(highestHigh, highs[j])
      lowestLow = Math.min(lowestLow, lows[j])
    }

    // Calculate %K
    const range = highestHigh - lowestLow
    if (range === 0) {
      k.push(100) // If there's no range, %K is 100
    } else {
      k.push(((closes[i] - lowestLow) / range) * 100)
    }
  }

  // Calculate %D (SMA of %K)
  const d = calculateSMA(
    k.filter((val) => !isNaN(val)),
    dPeriod,
  )

  // Pad %D with NaN to match the length of %K
  const paddedD: number[] = Array(length).fill(Number.NaN)
  let validKCount = 0

  for (let i = 0; i < length; i++) {
    if (!isNaN(k[i])) {
      validKCount++
      if (validKCount > dPeriod) {
        paddedD[i] = d[validKCount - dPeriod - 1]
      }
    }
  }

  return { k, d: paddedD }
}

/**
 * Calculate On-Balance Volume (OBV)
 * @param closes Array of close prices
 * @param volumes Array of volume values
 * @returns Array of OBV values
 */
export function calculateOBV(closes: number[], volumes: number[]): number[] {
  if (!closes.length || !volumes.length) {
    return []
  }

  const length = Math.min(closes.length, volumes.length)
  const obv: number[] = [0] // Start with 0

  for (let i = 1; i < length; i++) {
    if (closes[i] > closes[i - 1]) {
      // Price up, add volume
      obv.push(obv[i - 1] + volumes[i])
    } else if (closes[i] < closes[i - 1]) {
      // Price down, subtract volume
      obv.push(obv[i - 1] - volumes[i])
    } else {
      // Price unchanged, OBV unchanged
      obv.push(obv[i - 1])
    }
  }

  return obv
}

/**
 * Calculate Ichimoku Cloud
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param conversionPeriod Tenkan-sen period (default: 9)
 * @param basePeriod Kijun-sen period (default: 26)
 * @param laggingSpanPeriod Chikou Span period (default: 52)
 * @param displacement Displacement period (default: 26)
 * @returns Object with Tenkan-sen, Kijun-sen, Senkou Span A, Senkou Span B, and Chikou Span
 */
export function calculateIchimoku(
  highs: number[],
  lows: number[],
  conversionPeriod = 9,
  basePeriod = 26,
  laggingSpanPeriod = 52,
  displacement = 26,
): {
  conversionLine: number[]
  baseLine: number[]
  leadingSpanA: number[]
  leadingSpanB: number[]
  laggingSpan: number[]
} {
  if (!highs.length || !lows.length) {
    return {
      conversionLine: [],
      baseLine: [],
      leadingSpanA: [],
      leadingSpanB: [],
      laggingSpan: [],
    }
  }

  const length = Math.min(highs.length, lows.length)
  const conversionLine: number[] = []
  const baseLine: number[] = []
  const leadingSpanA: number[] = []
  const leadingSpanB: number[] = []
  const laggingSpan: number[] = []

  // Calculate Conversion Line (Tenkan-sen)
  for (let i = 0; i < length; i++) {
    if (i < conversionPeriod - 1) {
      conversionLine.push(Number.NaN)
    } else {
      let highestHigh = Number.NEGATIVE_INFINITY
      let lowestLow = Number.POSITIVE_INFINITY

      for (let j = i - conversionPeriod + 1; j <= i; j++) {
        highestHigh = Math.max(highestHigh, highs[j])
        lowestLow = Math.min(lowestLow, lows[j])
      }

      conversionLine.push((highestHigh + lowestLow) / 2)
    }
  }

  // Calculate Base Line (Kijun-sen)
  for (let i = 0; i < length; i++) {
    if (i < basePeriod - 1) {
      baseLine.push(Number.NaN)
    } else {
      let highestHigh = Number.NEGATIVE_INFINITY
      let lowestLow = Number.POSITIVE_INFINITY

      for (let j = i - basePeriod + 1; j <= i; j++) {
        highestHigh = Math.max(highestHigh, highs[j])
        lowestLow = Math.min(lowestLow, lows[j])
      }

      baseLine.push((highestHigh + lowestLow) / 2)
    }
  }

  // Calculate Leading Span A (Senkou Span A)
  for (let i = 0; i < length; i++) {
    if (i < basePeriod - 1) {
      leadingSpanA.push(Number.NaN)
    } else {
      const spanAValue = (conversionLine[i] + baseLine[i]) / 2
      leadingSpanA.push(spanAValue)
    }
  }

  // Calculate Leading Span B (Senkou Span B)
  for (let i = 0; i < length; i++) {
    if (i < laggingSpanPeriod - 1) {
      leadingSpanB.push(Number.NaN)
    } else {
      let highestHigh = Number.NEGATIVE_INFINITY
      let lowestLow = Number.POSITIVE_INFINITY

      for (let j = i - laggingSpanPeriod + 1; j <= i; j++) {
        highestHigh = Math.max(highestHigh, highs[j])
        lowestLow = Math.min(lowestLow, lows[j])
      }

      leadingSpanB.push((highestHigh + lowestLow) / 2)
    }
  }

  // Calculate Lagging Span (Chikou Span)
  for (let i = 0; i < length; i++) {
    if (i < displacement) {
      laggingSpan.push(Number.NaN)
    } else {
      laggingSpan.push(highs[i - displacement] + lows[i - displacement] / 2)
    }
  }

  return {
    conversionLine,
    baseLine,
    leadingSpanA,
    leadingSpanB,
    laggingSpan,
  }
}

/**
 * Calculate Parabolic SAR
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param accelerationFactor Initial acceleration factor (default: 0.02)
 * @param maxAcceleration Maximum acceleration (default: 0.2)
 * @returns Array of SAR values
 */
export function calculateParabolicSAR(
  highs: number[],
  lows: number[],
  accelerationFactor = 0.02,
  maxAcceleration = 0.2,
): number[] {
  if (!highs.length || !lows.length || highs.length < 2) {
    return []
  }

  const length = Math.min(highs.length, lows.length)
  const sar: number[] = [Number.NaN] // First value is undefined

  // Determine initial trend
  let isUptrend = highs[1] > highs[0] // Assume trend based on second bar

  let extremePoint = isUptrend ? highs[0] : lows[0]
  let currentAF = accelerationFactor

  sar.push(isUptrend ? lows[0] : highs[0]) // Second value is the first valid SAR

  for (let i = 2; i < length; i++) {
    // Calculate SAR for the current period
    const prevSAR = sar[i - 1]
    let currentSAR = prevSAR + currentAF * (extremePoint - prevSAR)

    // Ensure SAR doesn't penetrate the previous two price bars
    if (isUptrend) {
      currentSAR = Math.min(currentSAR, lows[i - 1], lows[i - 2])
    } else {
      currentSAR = Math.max(currentSAR, highs[i - 1], highs[i - 2])
    }

    // Check if trend reversal occurred
    if ((isUptrend && lows[i] < currentSAR) || (!isUptrend && highs[i] > currentSAR)) {
      // Trend reversal
      isUptrend = !isUptrend
      currentSAR = extremePoint // Reset SAR to extreme point
      extremePoint = isUptrend ? highs[i] : lows[i]
      currentAF = accelerationFactor
    } else {
      // No reversal, update extreme point if needed
      if (isUptrend && highs[i] > extremePoint) {
        extremePoint = highs[i]
        currentAF = Math.min(currentAF + accelerationFactor, maxAcceleration)
      } else if (!isUptrend && lows[i] < extremePoint) {
        extremePoint = lows[i]
        currentAF = Math.min(currentAF + accelerationFactor, maxAcceleration)
      }
    }

    sar.push(currentSAR)
  }

  return sar
}

/**
 * Calculate Fibonacci Retracement Levels
 * @param high Highest price in the trend
 * @param low Lowest price in the trend
 * @returns Object with Fibonacci retracement levels
 */
export function calculateFibonacciLevels(
  high: number,
  low: number,
): {
  level0: number // 0% (low)
  level236: number // 23.6%
  level382: number // 38.2%
  level50: number // 50%
  level618: number // 61.8%
  level786: number // 78.6%
  level100: number // 100% (high)
} {
  const range = high - low

  return {
    level0: low,
    level236: low + range * 0.236,
    level382: low + range * 0.382,
    level50: low + range * 0.5,
    level618: low + range * 0.618,
    level786: low + range * 0.786,
    level100: high,
  }
}

/**
 * Calculate Pivot Points (Standard)
 * @param high Previous period's high
 * @param low Previous period's low
 * @param close Previous period's close
 * @returns Object with pivot point and support/resistance levels
 */
export function calculatePivotPoints(
  high: number,
  low: number,
  close: number,
): {
  pivot: number
  r1: number
  r2: number
  r3: number
  s1: number
  s2: number
  s3: number
} {
  const pivot = (high + low + close) / 3

  const r1 = 2 * pivot - low
  const r2 = pivot + (high - low)
  const r3 = high + 2 * (pivot - low)

  const s1 = 2 * pivot - high
  const s2 = pivot - (high - low)
  const s3 = low - 2 * (high - pivot)

  return { pivot, r1, r2, r3, s1, s2, s3 }
}

/**
 * Calculate Rate of Change (ROC)
 * @param prices Array of price values
 * @param period Period for ROC calculation
 * @returns Array of ROC values (percentage)
 */
export function calculateROC(prices: number[], period: number): number[] {
  if (!prices.length || period <= 0) {
    return []
  }

  const roc: number[] = []

  // Initialize with NaN for values where we don't have enough data
  for (let i = 0; i < period; i++) {
    roc.push(Number.NaN)
  }

  // Calculate ROC for the rest
  for (let i = period; i < prices.length; i++) {
    const previousPrice = prices[i - period]
    if (previousPrice === 0) {
      roc.push(0) // Avoid division by zero
    } else {
      roc.push(((prices[i] - previousPrice) / previousPrice) * 100)
    }
  }

  return roc
}

/**
 * Calculate Commodity Channel Index (CCI)
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of close prices
 * @param period Period for CCI calculation (default: 20)
 * @returns Array of CCI values
 */
export function calculateCCI(highs: number[], lows: number[], closes: number[], period = 20): number[] {
  if (!highs.length || !lows.length || !closes.length) {
    return []
  }

  const length = Math.min(highs.length, lows.length, closes.length)
  const typicalPrices: number[] = []
  const cci: number[] = []

  // Calculate typical price for each candle
  for (let i = 0; i < length; i++) {
    typicalPrices[i] = (highs[i] + lows[i] + closes[i]) / 3
  }

  // Initialize with NaN for values where we don't have enough data
  for (let i = 0; i < period - 1; i++) {
    cci.push(Number.NaN)
  }

  // Calculate CCI
  for (let i = period - 1; i < length; i++) {
    // Calculate SMA of typical price
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) {
      sum += typicalPrices[j]
    }
    const sma = sum / period

    // Calculate mean deviation
    let meanDeviation = 0
    for (let j = i - period + 1; j <= i; j++) {
      meanDeviation += Math.abs(typicalPrices[j] - sma)
    }
    meanDeviation /= period

    // Calculate CCI
    if (meanDeviation === 0) {
      cci.push(0) // Avoid division by zero
    } else {
      cci.push((typicalPrices[i] - sma) / (0.015 * meanDeviation))
    }
  }

  return cci
}

/**
 * Calculate Williams %R
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of close prices
 * @param period Period for Williams %R calculation (default: 14)
 * @returns Array of Williams %R values
 */
export function calculateWilliamsR(highs: number[], lows: number[], closes: number[], period = 14): number[] {
  if (!highs.length || !lows.length || !closes.length) {
    return []
  }

  const length = Math.min(highs.length, lows.length, closes.length)
  const williamsR: number[] = []

  // Initialize with NaN for values where we don't have enough data
  for (let i = 0; i < period - 1; i++) {
    williamsR.push(Number.NaN)
  }

  // Calculate Williams %R
  for (let i = period - 1; i < length; i++) {
    // Find highest high and lowest low in the period
    let highestHigh = Number.NEGATIVE_INFINITY
    let lowestLow = Number.POSITIVE_INFINITY

    for (let j = i - period + 1; j <= i; j++) {
      highestHigh = Math.max(highestHigh, highs[j])
      lowestLow = Math.min(lowestLow, lows[j])
    }

    const range = highestHigh - lowestLow
    if (range === 0) {
      williamsR.push(-50) // Default value when there's no range
    } else {
      // Williams %R formula: ((Highest High - Close) / (Highest High - Lowest Low)) * -100
      williamsR.push(((highestHigh - closes[i]) / range) * -100)
    }
  }

  return williamsR
}

/**
 * Calculate Directional Movement Index (DMI) and Average Directional Index (ADX)
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of close prices
 * @param period Period for calculations (default: 14)
 * @returns Object with +DI, -DI, and ADX values
 */
export function calculateDMI(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
): { plusDI: number[]; minusDI: number[]; adx: number[] } {
  if (!highs.length || !lows.length || !closes.length || period <= 0) {
    return { plusDI: [], minusDI: [], adx: [] }
  }

  const length = Math.min(highs.length, lows.length, closes.length)
  const trueRanges: number[] = []
  const plusDM: number[] = []
  const minusDM: number[] = []

  // Calculate True Range, +DM, and -DM
  for (let i = 0; i < length; i++) {
    if (i === 0) {
      trueRanges.push(highs[i] - lows[i])
      plusDM.push(0)
      minusDM.push(0)
      continue
    }

    // True Range
    const tr1 = highs[i] - lows[i]
    const tr2 = Math.abs(highs[i] - closes[i - 1])
    const tr3 = Math.abs(lows[i] - closes[i - 1])
    trueRanges.push(Math.max(tr1, tr2, tr3))

    // Directional Movement
    const upMove = highs[i] - highs[i - 1]
    const downMove = lows[i - 1] - lows[i]

    if (upMove > downMove && upMove > 0) {
      plusDM.push(upMove)
    } else {
      plusDM.push(0)
    }

    if (downMove > upMove && downMove > 0) {
      minusDM.push(downMove)
    } else {
      minusDM.push(0)
    }
  }

  // Calculate smoothed values
  const smoothedTR: number[] = []
  const smoothedPlusDM: number[] = []
  const smoothedMinusDM: number[] = []

  // First smoothed values
  let firstTR = 0
  let firstPlusDM = 0
  let firstMinusDM = 0

  for (let i = 0; i < period; i++) {
    firstTR += trueRanges[i]
    firstPlusDM += plusDM[i]
    firstMinusDM += minusDM[i]
  }

  smoothedTR.push(firstTR)
  smoothedPlusDM.push(firstPlusDM)
  smoothedMinusDM.push(firstMinusDM)

  // Calculate subsequent smoothed values using Wilder's smoothing
  for (let i = 1; i < length - period + 1; i++) {
    smoothedTR.push(smoothedTR[i - 1] - smoothedTR[i - 1] / period + trueRanges[i + period - 1])
    smoothedPlusDM.push(smoothedPlusDM[i - 1] - smoothedPlusDM[i - 1] / period + plusDM[i + period - 1])
    smoothedMinusDM.push(smoothedMinusDM[i - 1] - smoothedMinusDM[i - 1] / period + minusDM[i + period - 1])
  }

  // Calculate +DI and -DI
  const plusDI: number[] = []
  const minusDI: number[] = []

  for (let i = 0; i < smoothedTR.length; i++) {
    plusDI.push((smoothedPlusDM[i] / smoothedTR[i]) * 100)
    minusDI.push((smoothedMinusDM[i] / smoothedTR[i]) * 100)
  }

  // Calculate DX
  const dx: number[] = []

  for (let i = 0; i < plusDI.length; i++) {
    const diff = Math.abs(plusDI[i] - minusDI[i])
    const sum = plusDI[i] + minusDI[i]
    dx.push((diff / sum) * 100)
  }

  // Calculate ADX (smoothed DX)
  const adx: number[] = []

  // First ADX is average of first period DX values
  let firstADX = 0
  for (let i = 0; i < period && i < dx.length; i++) {
    firstADX += dx[i]
  }
  firstADX /= period
  adx.push(firstADX)

  // Calculate subsequent ADX values
  for (let i = 1; i < dx.length - period + 1; i++) {
    adx.push((adx[i - 1] * (period - 1) + dx[i + period - 1]) / period)
  }

  // Pad with NaN to match original array length
  const paddedPlusDI = Array(period - 1)
    .fill(Number.NaN)
    .concat(plusDI)
  const paddedMinusDI = Array(period - 1)
    .fill(Number.NaN)
    .concat(minusDI)
  const paddedADX = Array(2 * period - 2)
    .fill(Number.NaN)
    .concat(adx)

  return {
    plusDI: paddedPlusDI,
    minusDI: paddedMinusDI,
    adx: paddedADX,
  }
}
