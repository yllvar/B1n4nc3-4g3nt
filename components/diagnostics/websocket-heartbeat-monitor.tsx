"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { unifiedWebSocketClient, type WebSocketEvent } from "@/lib/websocket/unified-websocket-client"

interface HeartbeatEvent {
  timestamp: number
  type: "sent" | "received" | "timeout"
  latency?: number
}

export function WebSocketHeartbeatMonitor() {
  const [heartbeats, setHeartbeats] = useState<HeartbeatEvent[]>([])
  const [lastHeartbeatTime, setLastHeartbeatTime] = useState<number | null>(null)
  const [heartbeatInterval, setHeartbeatInterval] = useState<number>(Number(process.env.WS_HEARTBEAT_INTERVAL) || 30000)

  useEffect(() => {
    const handleEvent = (event: WebSocketEvent) => {
      if (event.type === "heartbeat") {
        const newHeartbeat: HeartbeatEvent = {
          timestamp: Date.now(),
          type: event.success ? "received" : "timeout",
          latency: event.latency,
        }

        setHeartbeats((prev) => {
          const updated = [...prev, newHeartbeat]
          // Keep only the last 20 heartbeats
          return updated.length > 20 ? updated.slice(updated.length - 20) : updated
        })

        setLastHeartbeatTime(Date.now())
      }
    }

    // Subscribe to WebSocket events
    unifiedWebSocketClient.on("heartbeat", handleEvent)

    // Clean up
    return () => {
      unifiedWebSocketClient.off("heartbeat", handleEvent)
    }
  }, [])

  // Calculate time until next heartbeat
  const [timeUntilNext, setTimeUntilNext] = useState<number | null>(null)

  useEffect(() => {
    if (!lastHeartbeatTime) return

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastHeartbeatTime
      const remaining = Math.max(0, heartbeatInterval - elapsed)
      setTimeUntilNext(remaining)
    }, 1000)

    return () => clearInterval(interval)
  }, [lastHeartbeatTime, heartbeatInterval])

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const formatDuration = (ms: number) => {
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>WebSocket Heartbeat Monitor</CardTitle>
        <CardDescription>
          Monitors heartbeat events to ensure connection stability. Interval: {formatDuration(heartbeatInterval)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-muted-foreground">Last Heartbeat</div>
              <div className="text-xl font-semibold">{lastHeartbeatTime ? formatTime(lastHeartbeatTime) : "None"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Next Heartbeat</div>
              <div className="text-xl font-semibold">
                {timeUntilNext !== null ? formatDuration(timeUntilNext) : "Unknown"}
              </div>
            </div>
          </div>

          <div className="border rounded-md overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-2 text-left">Time</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Latency</th>
                </tr>
              </thead>
              <tbody>
                {heartbeats.length > 0 ? (
                  heartbeats.map((heartbeat, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                      <td className="p-2">{formatTime(heartbeat.timestamp)}</td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            heartbeat.type === "received"
                              ? "bg-green-100 text-green-800"
                              : heartbeat.type === "sent"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {heartbeat.type}
                        </span>
                      </td>
                      <td className="p-2">{heartbeat.latency ? `${heartbeat.latency}ms` : "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-muted-foreground">
                      No heartbeat events recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
