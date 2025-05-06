"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMarketData } from "@/features/market/hooks/use-market-data"
import StrategyVisualization from "./strategy-visualization"
import { useTechnicalAnalysis } from "@/hooks/use-technical-analysis"
import type { StrategyParameters as NewStrategyParameters } from "@/lib/market/interfaces"

interface TradingDashboardProps {
  symbol: string
}

export default function TradingDashboard() {
  const { symbol } = useMarketData()
  const [interval, setInterval] = useState("5m")
  const [strategyParams, setStrategyParams] = useState<Partial<NewStrategyParameters>>({
    shortEmaPeriod: 9,
    longEmaPeriod: 21,
    vwapPeriod: 20,
    takeProfitPercent: 0.01,
    stopLossPercent: 0.005,
  })

  const { signals, klineData, isLoading, error, strategy } = useTechnicalAnalysis({
    interval,
    limit: 100,
    strategyParams,
  })

  const handleRefresh = () => {
    // Force refresh by changing a parameter slightly
    setStrategyParams((prev) => ({
      ...prev,
      vwapPeriod: (prev.vwapPeriod || 20) + 0.001,
    }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Trading Dashboard</h2>
        <Tabs value={interval} onValueChange={setInterval} className="w-auto">
          <TabsList>
            <TabsTrigger value="1m">1m</TabsTrigger>
            <TabsTrigger value="5m">5m</TabsTrigger>
            <TabsTrigger value="15m">15m</TabsTrigger>
            <TabsTrigger value="1h">1h</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {error ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-red-500">Error: {error.message}</div>
          </CardContent>
        </Card>
      ) : (
        <StrategyVisualization
          klineData={klineData}
          signals={signals}
          isLoading={isLoading}
          onRefresh={handleRefresh}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Strategy Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="font-medium">Symbol:</div>
                <div>{symbol || "Not selected"}</div>
                <div className="font-medium">Short EMA Period:</div>
                <div>{strategyParams.shortEmaPeriod}</div>
                <div className="font-medium">Long EMA Period:</div>
                <div>{strategyParams.longEmaPeriod}</div>
                <div className="font-medium">VWAP Period:</div>
                <div>{strategyParams.vwapPeriod}</div>
                <div className="font-medium">Take Profit:</div>
                <div>{(strategyParams.takeProfitPercent || 0) * 100}%</div>
                <div className="font-medium">Stop Loss:</div>
                <div>{(strategyParams.stopLossPercent || 0) * 100}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Position</CardTitle>
          </CardHeader>
          <CardContent>
            {strategy.getActivePosition() ? (
              <div className="text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="font-medium">Type:</div>
                  <div className={strategy.getActivePosition()?.type === "LONG" ? "text-green-500" : "text-red-500"}>
                    {strategy.getActivePosition()?.type}
                  </div>
                  <div className="font-medium">Entry Price:</div>
                  <div>{strategy.getActivePosition()?.entryPrice}</div>
                  <div className="font-medium">Entry Time:</div>
                  <div>{new Date(strategy.getActivePosition()?.entryTime || 0).toLocaleString()}</div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">No active position</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
