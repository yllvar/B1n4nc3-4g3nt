"use client"

import { useState, useEffect } from "react"
import TradingService from "@/lib/trading/trading-service"
import type { Kline, TradingSignal, StrategyParameters } from "@/lib/types/market-types"
import { AppError } from "@/lib/error-handling/error-types"

interface UseTechnicalAnalysisOptions {
  symbol?: string
  interval?: string
  strategyParams?: Partial<StrategyParameters>
}

interface UseTechnicalAnalysisResult {
  signal: TradingSignal | null
  isLoading: boolean
  error: string | null
  updateParameters: (params: Partial<StrategyParameters>) => void
  analyzeData: (klines: Kline[]) => void
}

export function useTechnicalAnalysis({
  symbol = "BTCUSDT",
  interval = "1m",
  strategyParams = {},
}: UseTechnicalAnalysisOptions = {}): UseTechnicalAnalysisResult {
  const [tradingService] = useState(() => new TradingService(symbol, interval, strategyParams))
  const [signal, setSignal] = useState<TradingSignal | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const updateParameters = (params: Partial<StrategyParameters>) => {
    tradingService.updateStrategyParameters(params)
  }

  const analyzeData = async (klines: Kline[]) => {
    setIsLoading(true)
    setError(null)

    try {
      if (!klines || klines.length === 0) {
        throw new AppError("No kline data provided for analysis")
      }

      const result = tradingService.analyzeMarketData(klines)
      setSignal(result)
    } catch (err) {
      console.error("Error in technical analysis:", err)
      setError(err instanceof Error ? err.message : "Unknown error in technical analysis")
      setSignal(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Clean up effect
  useEffect(() => {
    return () => {
      setSignal(null)
    }
  }, [])

  return {
    signal,
    isLoading,
    error,
    updateParameters,
    analyzeData,
  }
}

export default useTechnicalAnalysis
