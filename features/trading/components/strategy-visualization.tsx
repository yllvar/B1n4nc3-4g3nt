"use client"

import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { TradingSignal } from "@/lib/types/market-types"

interface StrategyVisualizationProps {
  signal?: TradingSignal
  isLoading?: boolean
  error?: string | null
}

export const StrategyVisualization: React.FC<StrategyVisualizationProps> = ({
  signal,
  isLoading = false,
  error = null,
}) => {
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Strategy Signal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full border-red-200">
        <CardHeader>
          <CardTitle>Strategy Signal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (!signal) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Strategy Signal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">No signal data available</div>
        </CardContent>
      </Card>
    )
  }

  const getSignalColor = (type: string) => {
    switch (type.toUpperCase()) {
      case "BUY":
        return "bg-green-500 hover:bg-green-600"
      case "SELL":
        return "bg-red-500 hover:bg-red-600"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Strategy Signal: {signal.symbol}</span>
          <Badge className={getSignalColor(signal.type)}>{signal.type}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Time</p>
              <p>{formatTimestamp(signal.timestamp)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Price</p>
              <p>{signal.price.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Interval</p>
              <p>{signal.interval}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Confidence</p>
              <p>{(signal.confidence * 100).toFixed(1)}%</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Indicators</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(signal.indicators).map(([key, value]) => (
                <div key={key} className="flex justify-between bg-muted p-2 rounded-md">
                  <span className="font-medium">{key}:</span>
                  <span>{typeof value === "number" ? value.toFixed(2) : String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default StrategyVisualization
