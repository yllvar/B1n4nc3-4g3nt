"use client"

import { useEffect, useState } from "react"
import { webSocketMonitorRegistry, type WebSocketMetrics } from "@/lib/binance/websocket-monitor"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PerformanceMetricsProps {
  streamName?: string // If provided, show only this stream
}

export default function PerformanceMetrics({ streamName }: PerformanceMetricsProps) {
  const [metricsHistory, setMetricsHistory] = useState<Map<string, Array<WebSocketMetrics & { timestamp: number }>>>(
    new Map(),
  )

  useEffect(() => {
    const unsubscribers: (() => void)[] = []

    // Get all monitors or just the specified one
    const monitors = streamName
      ? [webSocketMonitorRegistry.getMonitor(streamName)]
      : webSocketMonitorRegistry.getAllMonitors()

    // Subscribe to each monitor
    monitors.forEach((monitor) => {
      const unsubscribe = monitor.subscribe((updatedMetrics) => {
        setMetricsHistory((prev) => {
          const newMap = new Map(prev)
          const streamName = monitor.getStreamName()
          const history = newMap.get(streamName) || []

          // Add timestamp to metrics
          const metricsWithTimestamp = {
            ...updatedMetrics,
            timestamp: Date.now(),
          }

          // Add to history, keeping only the last 60 data points
          const newHistory = [...history, metricsWithTimestamp]
          if (newHistory.length > 60) {
            newHistory.shift()
          }

          newMap.set(streamName, newHistory)
          return newMap
        })
      })
      unsubscribers.push(unsubscribe)
    })

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [streamName])

  // If no metrics yet, show loading
  if (metricsHistory.size === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>No active WebSocket connections</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Performance Metrics</CardTitle>
        <CardDescription>
          {streamName ? `Monitoring ${streamName}` : `Monitoring ${metricsHistory.size} active connections`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="messageRate">
          <TabsList className="mb-4">
            <TabsTrigger value="messageRate">Message Rate</TabsTrigger>
            <TabsTrigger value="latency">Latency</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
          </TabsList>

          <TabsContent value="messageRate">
            {Array.from(metricsHistory.entries()).map(([stream, history]) => (
              <div key={stream} className="mb-6 last:mb-0">
                <h3 className="mb-2 text-sm font-medium">{stream}</h3>
                <div className="h-[200px]">
                  <MessageRateChart data={history} />
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="latency">
            {Array.from(metricsHistory.entries()).map(([stream, history]) => (
              <div key={stream} className="mb-6 last:mb-0">
                <h3 className="mb-2 text-sm font-medium">{stream}</h3>
                <div className="h-[200px]">
                  <LatencyChart data={history} />
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="errors">
            {Array.from(metricsHistory.entries()).map(([stream, history]) => (
              <div key={stream} className="mb-6 last:mb-0">
                <h3 className="mb-2 text-sm font-medium">{stream}</h3>
                <div className="h-[200px]">
                  <ErrorsChart data={history} />
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function MessageRateChart({ data }: { data: Array<WebSocketMetrics & { timestamp: number }> }) {
  const chartConfig = {
    messageRate: {
      label: "Message Rate",
      color: "hsl(var(--chart-1))",
    },
  }

  const chartData = data.map((item) => ({
    time: item.timestamp,
    messageRate: item.messageRate,
  }))

  return (
    <ChartContainer config={chartConfig}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorMessageRate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            tickFormatter={(value) => new Date(value).toLocaleTimeString()}
            axisLine={false}
            tickLine={false}
            minTickGap={60}
          />
          <YAxis dataKey="messageRate" axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="messageRate"
            stroke="hsl(var(--chart-1))"
            fillOpacity={1}
            fill="url(#colorMessageRate)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

function LatencyChart({ data }: { data: Array<WebSocketMetrics & { timestamp: number }> }) {
  const chartConfig = {
    pingLatency: {
      label: "Ping Latency",
      color: "hsl(var(--chart-2))",
    },
    averageLatency: {
      label: "Avg Latency",
      color: "hsl(var(--chart-3))",
    },
  }

  const chartData = data.map((item) => ({
    time: item.timestamp,
    pingLatency: item.pingLatency,
    averageLatency: item.averageLatency,
  }))

  return (
    <ChartContainer config={chartConfig}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPingLatency" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8} />
              <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorAvgLatency" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.8} />
              <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            tickFormatter={(value) => new Date(value).toLocaleTimeString()}
            axisLine={false}
            tickLine={false}
            minTickGap={60}
          />
          <YAxis dataKey="pingLatency" axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="pingLatency"
            stroke="hsl(var(--chart-2))"
            fillOpacity={1}
            fill="url(#colorPingLatency)"
          />
          <Area
            type="monotone"
            dataKey="averageLatency"
            stroke="hsl(var(--chart-3))"
            fillOpacity={0.5}
            fill="url(#colorAvgLatency)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

function ErrorsChart({ data }: { data: Array<WebSocketMetrics & { timestamp: number }> }) {
  const chartConfig = {
    errorCount: {
      label: "Errors",
      color: "hsl(var(--destructive))",
    },
    dataGaps: {
      label: "Data Gaps",
      color: "hsl(var(--amber-500))",
    },
    staleDataEvents: {
      label: "Stale Data",
      color: "hsl(var(--chart-4))",
    },
  }

  const chartData = data.map((item) => ({
    time: item.timestamp,
    errorCount: item.errorCount,
    dataGaps: item.dataGaps,
    staleDataEvents: item.staleDataEvents,
  }))

  return (
    <ChartContainer config={chartConfig}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8} />
              <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorDataGaps" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--amber-500))" stopOpacity={0.8} />
              <stop offset="95%" stopColor="hsl(var(--amber-500))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorStaleData" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.8} />
              <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            tickFormatter={(value) => new Date(value).toLocaleTimeString()}
            axisLine={false}
            tickLine={false}
            minTickGap={60}
          />
          <YAxis axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="errorCount"
            stroke="hsl(var(--destructive))"
            fillOpacity={1}
            fill="url(#colorErrors)"
          />
          <Area
            type="monotone"
            dataKey="dataGaps"
            stroke="hsl(var(--amber-500))"
            fillOpacity={0.5}
            fill="url(#colorDataGaps)"
          />
          <Area
            type="monotone"
            dataKey="staleDataEvents"
            stroke="hsl(var(--chart-4))"
            fillOpacity={0.5}
            fill="url(#colorStaleData)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
