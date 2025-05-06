"use client"

import { useState, useEffect } from "react"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { WebSocketEnvironmentConfig } from "./websocket-environment-config"
import { WebSocketConnectionMetrics } from "./websocket-connection-metrics"
import { WebSocketEventLog } from "./websocket-event-log"
import { WebSocketHeartbeatMonitor } from "./websocket-heartbeat-monitor"
import { WebSocketTestConnection } from "./websocket-test-connection"
import { binanceConnectionManager } from "@/lib/websocket/websocket-connection-manager"
import type { ConnectionState } from "@/lib/websocket/unified-websocket-client"

export function WebSocketDiagnosticsDashboard() {
  const [connectionState, setConnectionState] = useState<ConnectionState | string>("disconnected")
  const [isConnected, setIsConnected] = useState(false)
  const [activeStreams, setActiveStreams] = useState<string[]>([])

  useEffect(() => {
    const updateConnectionStatus = () => {
      const state = binanceConnectionManager.getConnectionState()
      setConnectionState(state)
      setIsConnected(binanceConnectionManager.isConnected())
      setActiveStreams(binanceConnectionManager.getActiveStreams())
    }

    // Initial check
    updateConnectionStatus()

    // Set up interval to periodically check connection status
    const interval = setInterval(updateConnectionStatus, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleForceReconnect = () => {
    binanceConnectionManager.forceReconnect()
    toast({
      title: "Reconnection Triggered",
      description: "Forcing WebSocket to reconnect...",
    })
  }

  const handleResetCircuitBreaker = () => {
    binanceConnectionManager.resetCircuitBreaker()
    toast({
      title: "Circuit Breaker Reset",
      description: "WebSocket circuit breaker has been reset.",
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>WebSocket Connection Status</span>
            <span
              className={`text-sm px-3 py-1 rounded-full ${
                isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {connectionState}
            </span>
          </CardTitle>
          <CardDescription>
            Current connection details and active streams: {activeStreams.length ? activeStreams.join(", ") : "None"}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex gap-2">
          <button
            onClick={handleForceReconnect}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Force Reconnect
          </button>
          <button
            onClick={handleResetCircuitBreaker}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            Reset Circuit Breaker
          </button>
        </CardFooter>
      </Card>

      <Tabs defaultValue="config">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="metrics">Connection Metrics</TabsTrigger>
          <TabsTrigger value="heartbeat">Heartbeat Monitor</TabsTrigger>
          <TabsTrigger value="events">Event Log</TabsTrigger>
        </TabsList>
        <TabsContent value="config">
          <WebSocketEnvironmentConfig />
        </TabsContent>
        <TabsContent value="metrics">
          <WebSocketConnectionMetrics />
        </TabsContent>
        <TabsContent value="heartbeat">
          <WebSocketHeartbeatMonitor />
        </TabsContent>
        <TabsContent value="events">
          <WebSocketEventLog />
        </TabsContent>
      </Tabs>

      <WebSocketTestConnection />
    </div>
  )
}
