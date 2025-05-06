"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  unifiedWebSocketClient,
  type WebSocketMetrics,
  type WebSocketStatus,
} from "@/lib/websocket/unified-websocket-client"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export function WebSocketConnectionMetrics() {
  const [metrics, setMetrics] = useState<WebSocketMetrics>({
    latency: 0,
    messageRate: 0,
    uptime: 0,
    reconnects: 0,
    lastMessageTime: null,
    connectionHealth: 100,
    errorCount: 0,
  })
  const [status, setStatus] = useState<WebSocketStatus>("disconnected")
  const [chartData, setChartData] = useState<Array<{ time: string; messageRate: number; latency: number }>>([])

  useEffect(() => {
    const unsubscribe = unifiedWebSocketClient.subscribe((newStatus, newMetrics) => {
      setStatus(newStatus)
      setMetrics(newMetrics)

      // Add data point to chart
      setChartData((prev) => {
        const now = new Date()
        const timeStr = now.toLocaleTimeString()

        // Keep only the last 30 data points
        const newData = [...prev, { time: timeStr, messageRate: newMetrics.messageRate, latency: newMetrics.latency }]
        if (newData.length > 30) {
          return newData.slice(newData.length - 30)
        }
        return newData
      })
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return "Never"
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Connection Health</CardTitle>
          <CardDescription>Overall health of the WebSocket connection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span>Connection Health</span>
                <span>{metrics.connectionHealth}%</span>
              </div>
              <Progress value={metrics.connectionHealth || 0} className="h-2" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-muted/20 p-3 rounded-md">
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="text-xl font-semibold">{status}</div>
              </div>
              <div className="bg-muted/20 p-3 rounded-md">
                <div className="text-sm text-muted-foreground">Uptime</div>
                <div className="text-xl font-semibold">{formatUptime(metrics.uptime)}</div>
              </div>
              <div className="bg-muted/20 p-3 rounded-md">
                <div className="text-sm text-muted-foreground">Reconnects</div>
                <div className="text-xl font-semibold">{metrics.reconnects}</div>
              </div>
              <div className="bg-muted/20 p-3 rounded-md">
                <div className="text-sm text-muted-foreground">Last Message</div>
                <div className="text-xl font-semibold">{formatTime(metrics.lastMessageTime)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Real-time WebSocket performance data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="messageRate" stroke="#8884d8" name="Message Rate" />
                <Line yAxisId="right" type="monotone" dataKey="latency" stroke="#82ca9d" name="Latency (ms)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
