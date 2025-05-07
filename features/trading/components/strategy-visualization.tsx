"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { AlertCircle, ArrowDown, ArrowUp, RefreshCw } from "lucide-react"
import type { TradingSignal, Kline } from "@/lib/types/market-types"

interface StrategyVisualizationProps {
  signal?: TradingSignal | null
  klineData?: Kline[] | null
  signals?: TradingSignal[] | null
  isLoading?: boolean
  error?: Error | null
  onRefresh?: () => void
}

export const StrategyVisualization: React.FC<StrategyVisualizationProps> = ({
  signal,
  klineData,
  signals,
  isLoading = false,
  error = null,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState("signal")
  const [chartData, setChartData] = useState<any[]>([])
  const [signalHistory, setSignalHistory] = useState<TradingSignal[]>([])

  // Process kline data for chart
  useEffect(() => {
    if (klineData && klineData.length > 0) {
      const processedData = klineData.map((kline) => {
        const timestamp = typeof kline.openTime === "number" ? kline.openTime : Number.parseInt(kline.openTime as any)

        const close = typeof kline.close === "number" ? kline.close : Number.parseFloat(kline.close)

        return {
          time: timestamp,
          price: close,
          formattedTime: new Date(timestamp).toLocaleTimeString(),
        }
      })

      setChartData(processedData)
    }
  }, [klineData])

  // Process signals for history
  useEffect(() => {
    if (signals && signals.length > 0) {
      // Filter only actionable signals
      const actionableSignals = signals.filter((s) => s.action !== "NONE")
      setSignalHistory(actionableSignals)
    } else if (signal && signal.action !== "NONE") {
      setSignalHistory((prev) => {
        // Check if signal already exists
        const exists = prev.some((s) => s.timestamp === signal.timestamp && s.action === signal.action)

        if (!exists) {
          // Add to history and limit to 10 items
          const updated = [signal, ...prev].slice(0, 10)
          return updated
        }
        return prev
      })
    }
  }, [signal, signals])

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Strategy Analysis</CardTitle>
          <CardDescription>Analyzing market data...</CardDescription>
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
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span>Strategy Analysis Error</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 p-4 bg-red-50 rounded-md">{error.message || "An unknown error occurred"}</div>
          {onRefresh && (
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={onRefresh} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (!signal) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Strategy Analysis</CardTitle>
          <CardDescription>No signal data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground p-4 bg-muted/50 rounded-md text-center">
            No trading signals have been generated yet.
            {onRefresh && (
              <div className="mt-4">
                <Button variant="outline" onClick={onRefresh} size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const getSignalColor = (type: string) => {
    switch (type.toUpperCase()) {
      case "BUY":
      case "LONG":
        return "bg-green-500 hover:bg-green-600"
      case "SELL":
      case "SHORT":
        return "bg-red-500 hover:bg-red-600"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "BUY":
        return <ArrowUp className="h-4 w-4 text-green-500" />
      case "SELL":
        return <ArrowDown className="h-4 w-4 text-red-500" />
      case "CLOSE_LONG":
        return <ArrowDown className="h-4 w-4 text-amber-500" />
      case "CLOSE_SHORT":
        return <ArrowUp className="h-4 w-4 text-amber-500" />
      default:
        return null
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Strategy Analysis</CardTitle>
            <CardDescription>Latest signal generated at {formatTimestamp(signal.timestamp)}</CardDescription>
          </div>
          <Badge className={getSignalColor(signal.type || signal.action)}>{signal.type || signal.action}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="signal">Current Signal</TabsTrigger>
            <TabsTrigger value="chart">Price Chart</TabsTrigger>
            <TabsTrigger value="history">Signal History</TabsTrigger>
          </TabsList>

          <TabsContent value="signal">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Action</p>
                  <p className="flex items-center gap-1">
                    {getActionIcon(signal.action)}
                    {signal.action}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Price</p>
                  <p>{typeof signal.price === "number" ? signal.price.toFixed(2) : signal.price}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reason</p>
                  <p>{signal.reason || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Confidence</p>
                  <p>{signal.confidence ? (signal.confidence * 100).toFixed(1) + "%" : (signal.strength || 0) + "%"}</p>
                </div>
              </div>

              {(signal.stopLoss || signal.takeProfit) && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {signal.stopLoss && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Stop Loss</p>
                      <p className="text-red-500">{signal.stopLoss.toFixed(2)}</p>
                    </div>
                  )}
                  {signal.takeProfit && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Take Profit</p>
                      <p className="text-green-500">{signal.takeProfit.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Indicators</p>
                <div className="grid grid-cols-2 gap-2">
                  {signal.indicators &&
                    Object.entries(signal.indicators).map(([key, value]) => (
                      <div key={key} className="flex justify-between bg-muted p-2 rounded-md">
                        <span className="font-medium">{key}:</span>
                        <span>{typeof value === "number" ? value.toFixed(2) : String(value)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="chart">
            {chartData.length > 0 ? (
              <div className="h-[300px]">
                <ChartContainer
                  config={{
                    price: {
                      label: "Price",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="formattedTime" axisLine={false} tickLine={false} minTickGap={60} />
                      <YAxis dataKey="price" axisLine={false} tickLine={false} width={60} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="hsl(var(--chart-1))"
                        fillOpacity={1}
                        fill="url(#colorPrice)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            ) : (
              <div className="text-center p-4 text-muted-foreground">No chart data available</div>
            )}
          </TabsContent>

          <TabsContent value="history">
            {signalHistory.length > 0 ? (
              <div className="space-y-2">
                {signalHistory.map((historySignal, index) => (
                  <div key={index} className="p-3 border rounded-md flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {getActionIcon(historySignal.action)}
                      <span className="font-medium">{historySignal.action}</span>
                      <span className="text-sm text-muted-foreground">
                        @{" "}
                        {typeof historySignal.price === "number" ? historySignal.price.toFixed(2) : historySignal.price}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(historySignal.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-4 text-muted-foreground">No signal history available</div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">{signal.interval ? `Timeframe: ${signal.interval}` : ""}</div>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export default StrategyVisualization
