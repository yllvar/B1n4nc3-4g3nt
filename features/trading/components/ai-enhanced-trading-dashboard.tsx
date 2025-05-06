"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useKlineData } from "@/features/market/hooks/use-kline-data"
import { ScalpingStrategy } from "@/lib/trading/scalping-strategy"
import ScalpingSignal from "@/features/trading/components/scalping-signal"
import LLMEnhancedSignal from "@/features/trading/components/llm-enhanced-signal"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface AIEnhancedTradingDashboardProps {
  symbol: string
}

export default function AIEnhancedTradingDashboard({ symbol }: AIEnhancedTradingDashboardProps) {
  const [activeTimeframe, setActiveTimeframe] = useState("5m")
  const [strategy] = useState(() => new ScalpingStrategy())

  // Fetch kline data for the main timeframe
  const { data: klineData, isLoading: isLoadingKlines, error: klineError } = useKlineData(symbol, activeTimeframe)

  // Fetch higher timeframe data for confirmation
  const { data: higherTimeframeData, isLoading: isLoadingHigherTimeframe } = useKlineData(symbol, "1h")

  // Calculate technical signals
  const [technicalSignal, setTechnicalSignal] = useState<any>(null)

  useEffect(() => {
    if (klineData && klineData.length > 0) {
      const signals = strategy.calculateSignals(klineData)
      if (signals && signals.length > 0) {
        setTechnicalSignal(signals[signals.length - 1])
      }
    }
  }, [klineData, strategy])

  const isLoading = isLoadingKlines || isLoadingHigherTimeframe

  if (klineError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Loading Market Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{klineError.message}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{symbol.toUpperCase()} Trading Analysis</h2>

        <Tabs value={activeTimeframe} onValueChange={setActiveTimeframe}>
          <TabsList>
            <TabsTrigger value="1m">1m</TabsTrigger>
            <TabsTrigger value="5m">5m</TabsTrigger>
            <TabsTrigger value="15m">15m</TabsTrigger>
            <TabsTrigger value="1h">1h</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ScalpingSignal
            klineData={klineData || []}
            higherTimeframeData={higherTimeframeData || []}
            isLoading={isLoading}
          />

          <LLMEnhancedSignal
            symbol={symbol}
            timeframe={activeTimeframe}
            klineData={klineData || []}
            technicalSignal={technicalSignal}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  )
}
