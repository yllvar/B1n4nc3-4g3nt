"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { calculateRSI, calculateEMA, calculateSMA } from "@/lib/indicators/technical-indicators"
import { useKlineData } from "./use-kline-data"

interface UseTechnicalIndicatorsOptions {
  interval?: string
  limit?: number
}

interface IndicatorValues {
  rsi: number | null
  ema20: number | null
  sma50: number | null
  macd: number | null
  macdSignal: number | null
}

export function useTechnicalIndicators(symbol: string, options: UseTechnicalIndicatorsOptions = {}) {
  const { interval = "15m", limit = 100 } = options
  const { klineData, isLoading, error } = useKlineData({ symbol, interval, limit })
  const [indicators, setIndicators] = useState<IndicatorValues>({
    rsi: null,
    ema20: null,
    sma50: null,
    macd: null,
    macdSignal: null,
  })

  // Memoize the extraction of price data from klineData
  const priceData = useMemo(() => {
    if (!klineData || klineData.length === 0) return { closes: [], highs: [], lows: [], volumes: [] }

    return {
      closes: klineData.map((k) => k.close),
      highs: klineData.map((k) => k.high),
      lows: klineData.map((k) => k.low),
      volumes: klineData.map((k) => k.volume),
    }
  }, [klineData])

  // Memoize the calculation of technical indicators
  const calculateIndicators = useCallback(() => {
    if (priceData.closes.length === 0) return

    const { closes } = priceData

    // Calculate RSI (14 periods)
    const rsiValues = calculateRSI(closes, 14)
    const rsi = rsiValues[rsiValues.length - 1]

    // Calculate EMA (20 periods)
    const ema20Values = calculateEMA(closes, 20)
    const ema20 = ema20Values[ema20Values.length - 1]

    // Calculate SMA (50 periods)
    const sma50Values = calculateSMA(closes, 50)
    const sma50 = sma50Values[sma50Values.length - 1]

    // Calculate MACD (12, 26, 9)
    const ema12Values = calculateEMA(closes, 12)
    const ema26Values = calculateEMA(closes, 26)

    // Only calculate if we have enough data
    if (ema12Values[ema12Values.length - 1] !== null && ema26Values[ema26Values.length - 1] !== null) {
      const macdLine = ema12Values.map((ema12, i) => {
        if (ema12 === null || ema26Values[i] === null) return null
        return ema12 - ema26Values[i]
      })

      // Filter out null values for MACD signal calculation
      const validMacdLine = macdLine.filter((value): value is number => value !== null)
      const macdSignalValues = calculateEMA(validMacdLine, 9)

      const macd = macdLine[macdLine.length - 1]
      const macdSignal = macdSignalValues[macdSignalValues.length - 1]

      setIndicators({ rsi, ema20, sma50, macd, macdSignal })
    } else {
      setIndicators({ rsi, ema20, sma50, macd: null, macdSignal: null })
    }
  }, [priceData])

  // Effect to calculate indicators when price data changes
  useEffect(() => {
    if (!isLoading && !error && priceData.closes.length > 0) {
      calculateIndicators()
    }
  }, [calculateIndicators, isLoading, error, priceData.closes.length])

  return { indicators, isLoading, error }
}
