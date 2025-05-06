"use client"

import { useEffect, useState } from "react"
import { webSocketMonitorRegistry } from "@/features/websocket/lib/websocket-monitor"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PerformanceChart } from "@/features/charts/components/performance-chart"

interface PerformanceMetricsProps {
  streamName?: string // If provided, show only this stream
}

export default function PerformanceMetrics({ streamName }: PerformanceMetricsProps) {
  const [metricsHistory, setMetricsHistory] = useState<Map<string, Array<any>>>(new Map())

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
                <PerformanceChart data={history} type="messageRate" />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="latency">
            {Array.from(metricsHistory.entries()).map(([stream, history]) => (
              <div key={stream} className="mb-6 last:mb-0">
                <h3 className="mb-2 text-sm font-medium">{stream}</h3>
                <PerformanceChart data={history} type="latency" />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="errors">
            {Array.from(metricsHistory.entries()).map(([stream, history]) => (
              <div key={stream} className="mb-6 last:mb-0">
                <h3 className="mb-2 text-sm font-medium">{stream}</h3>
                <PerformanceChart data={history} type="errors" />
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
