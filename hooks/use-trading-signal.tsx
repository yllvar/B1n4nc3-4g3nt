"use client"

import { useState, useEffect } from "react"
import { tradingSignalManager } from "@/lib/state/trading-signal-manager"
import type { StrategyParameters, TradingSignal } from "@/lib/types/market-types"

interface UseTradingSignalOptions {
  symbol?: string
  interval?: string
  strategyParams?: Partial<StrategyParameters>
}

export function useTradingSignal({
  symbol = "BTCUSDT",
  interval = "5m",
  strategyParams = {}
}: UseTradingSignalOptions = {}) {
  const [signal, setSignal] = useState<TradingSignal | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    const unsubscribe = tradingSignalManager.subscribeToSignal(
      symbol,
      interval,
      {
        symbol,
        interval,
        ...strategyParams
      } as StrategyParameters,
      (newSignal) => {
        setSignal(newSignal)
        setIsLoading(false)
      }
    )

    return () => {
      unsubscribe()
      setSignal(null)
    }
  }, [symbol, interval, JSON.stringify(strategyParams)])

  const refresh = () => {
    tradingSignalManager.subscribeToSignal(
      symbol,
      interval,
      {
        symbol,
        interval,
        ...strategyParams
      } as StrategyParameters,
      (newSignal) => {
        setSignal(newSignal)
      }
    )
  }

  return {
    signal,
    isLoading,
    error,
    refresh
  }
}
