"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import WebSocketStatus from "@/components/monitoring/websocket-status"
import PerformanceMetrics from "@/components/monitoring/performance-metrics"
import { binanceWebSocketClient } from "@/lib/binance/websocket-client"

export default function MonitoringDashboard() {
  const [activeStreams, setActiveStreams] = useState<string[]>(binanceWebSocketClient.getActiveStreams())

  // Refresh active streams every 5 seconds
  useState(() => {
    const interval = setInterval(() => {
      setActiveStreams(binanceWebSocketClient.getActiveStreams())
    }, 5000)

    return () => clearInterval(interval)
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>WebSocket Monitoring</CardTitle>
        <CardDescription>Monitor WebSocket connections and performance metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            {activeStreams.map((stream) => (
              <TabsTrigger key={stream} value={stream}>
                {stream}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              <WebSocketStatus />
            </div>
          </TabsContent>

          <TabsContent value="performance">
            <div className="space-y-6">
              <PerformanceMetrics />
            </div>
          </TabsContent>

          {activeStreams.map((stream) => (
            <TabsContent key={stream} value={stream}>
              <div className="space-y-6">
                <WebSocketStatus streamName={stream} />
                <PerformanceMetrics streamName={stream} />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
