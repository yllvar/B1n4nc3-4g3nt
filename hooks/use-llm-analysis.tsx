"use client"

import { useState, useEffect, useCallback } from "react"
import { togetherAIService, type LLMAnalysisRequest, type LLMAnalysisResponse } from "@/lib/ai/together-ai-service"

interface UseLLMAnalysisProps {
  symbol: string
  timeframe: string
  technicalSignal: string
  signalStrength: number
  currentPrice: number
  indicators: Record<string, number | string>
  recentPriceAction: {
    percentChange24h: number
    percentChange1h: number
    volumeChange24h: number
  }
  marketContext?: {
    btcCorrelation?: number | null
    marketSentiment?: string | null
    volatilityRank?: number | null
  }
  autoRefresh?: boolean
  refreshInterval?: number // in milliseconds
}

interface UseLLMAnalysisResult {
  analysis: LLMAnalysisResponse | null
  isLoading: boolean
  error: Error | null
  lastUpdated: Date | null
  refresh: () => Promise<void>
}

export function useLLMAnalysis({
  symbol,
  timeframe,
  technicalSignal,
  signalStrength,
  currentPrice,
  indicators,
  recentPriceAction,
  marketContext,
  autoRefresh = false,
  refreshInterval = 300000, // 5 minutes by default
}: UseLLMAnalysisProps): UseLLMAnalysisResult {
  const [analysis, setAnalysis] = useState<LLMAnalysisResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0)

  const fetchAnalysis = useCallback(async () => {
    // Prevent excessive API calls
    const now = Date.now()
    if (now - lastRefreshTime < 5000) {
      // Minimum 5 seconds between refreshes
      return
    }

    setIsLoading(true)
    setError(null)
    setLastRefreshTime(now)

    try {
      const request: LLMAnalysisRequest = {
        symbol,
        timeframe,
        technicalSignal,
        signalStrength,
        currentPrice,
        indicators,
        recentPriceAction,
        marketContext,
      }

      const response = await togetherAIService.analyzeSignal(request)

      if (response) {
        setAnalysis(response)
        setLastUpdated(new Date())
      } else {
        throw new Error("No response received from Together AI service")
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error occurred"))
    } finally {
      setIsLoading(false)
    }
  }, [
    symbol,
    timeframe,
    technicalSignal,
    signalStrength,
    currentPrice,
    indicators,
    recentPriceAction,
    marketContext,
    lastRefreshTime,
  ])

  // Initial fetch
  useEffect(() => {
    fetchAnalysis()
  }, [fetchAnalysis])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const intervalId = setInterval(() => {
      fetchAnalysis()
    }, refreshInterval)

    return () => clearInterval(intervalId)
  }, [autoRefresh, refreshInterval, fetchAnalysis])

  return {
    analysis,
    isLoading,
    error,
    lastUpdated,
    refresh: fetchAnalysis,
  }
}
