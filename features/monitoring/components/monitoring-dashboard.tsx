"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import WebSocketStatus from "@/features/monitoring/components/websocket-status"
import PerformanceMetrics from "@/features/monitoring/components/performance-metrics"
import { binanceWebSocketClient } from "@/features/websocket/lib/websocket-client"

export default function MonitoringDashboard() {
  const [activeStreams, setActiveStreams] = useState<string[]>([])

  // Refresh active streams every 5 seconds
  useEffect(() => {
    // Initial fetch
    setActiveStreams(binanceWebSocketClient.getActiveStreams())

    const interval = setInterval(() => {
      setActiveStreams(binanceWebSocketClient.getActiveStreams())
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>WebSocket Monitoring</CardTitle>
        <CardDescription>Monitor WebSocket connections and performance metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="mb-4 flex flex-wrap">
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
