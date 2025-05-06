"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { webSocketMonitorRegistry, type WebSocketMetrics } from "@/features/websocket/lib/websocket-monitor"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, AlertTriangle, Clock, Database, RefreshCw, Wifi, WifiOff } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { binanceWebSocketClient } from "@/features/websocket/lib/websocket-client"

interface WebSocketStatusProps {
  streamName?: string // If provided, show only this stream
}

export default function WebSocketStatus({ streamName }: WebSocketStatusProps) {
  const [metrics, setMetrics] = useState<Map<string, WebSocketMetrics>>(new Map())
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isReconnecting, setIsReconnecting] = useState(false)

  useEffect(() => {
    const unsubscribers: (() => void)[] = []

    // Get all monitors or just the specified one
    const monitors = streamName
      ? [webSocketMonitorRegistry.getMonitor(streamName)]
      : webSocketMonitorRegistry.getAllMonitors()

    // Subscribe to each monitor
    monitors.forEach((monitor) => {
      const unsubscribe = monitor.subscribe((updatedMetrics) => {
        setMetrics((prev) => {
          const newMap = new Map(prev)
          newMap.set(monitor.getStreamName(), updatedMetrics)
          return newMap
        })
        setLastUpdated(new Date())
      })
      unsubscribers.push(unsubscribe)
    })

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [streamName])

  const handleForceReconnect = () => {
    setIsReconnecting(true)
    try {
      binanceWebSocketClient.forceReconnect()
      setTimeout(() => setIsReconnecting(false), 3000)
    } catch (error) {
      console.error("Error forcing reconnection:", error)
      setIsReconnecting(false)
    }
  }

  // If no metrics yet, show loading
  if (metrics.size === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>WebSocket Status</CardTitle>
          <CardDescription>No active WebSocket connections</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleForceReconnect} disabled={isReconnecting}>
            {isReconnecting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Reconnecting...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Force Reconnect
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Count disconnected streams
  const disconnectedCount = Array.from(metrics.values()).filter(
    (metric) => metric.connectionStatus === "disconnected",
  ).length

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>WebSocket Status</CardTitle>
            <CardDescription>
              {streamName ? `Monitoring ${streamName}` : `Monitoring ${metrics.size} active connections`}
            </CardDescription>
          </div>
          <div className="text-xs text-muted-foreground">
            Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Button
            onClick={handleForceReconnect}
            disabled={isReconnecting}
            variant={disconnectedCount > 0 ? "destructive" : "outline"}
          >
            {isReconnecting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Reconnecting...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {disconnectedCount > 0 ? `Reconnect (${disconnectedCount} disconnected)` : "Force Reconnect"}
              </>
            )}
          </Button>
        </div>

        <div className="space-y-4">
          {Array.from(metrics.entries()).map(([stream, metric]) => (
            <div key={stream} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ConnectionStatusIcon status={metric.connectionStatus} />
                  <h3 className="font-medium">{stream}</h3>
                </div>
                <ConnectionStatusBadge status={metric.connectionStatus} />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MetricItem
                  icon={<Activity className="h-4 w-4" />}
                  label="Message Rate"
                  value={`${metric.messageRate}/s`}
                />
                <MetricItem
                  icon={<Database className="h-4 w-4" />}
                  label="Total Messages"
                  value={metric.messageCount.toLocaleString()}
                />
                <MetricItem icon={<Clock className="h-4 w-4" />} label="Latency" value={`${metric.pingLatency}ms`} />
                <MetricItem
                  icon={<RefreshCw className="h-4 w-4" />}
                  label="Reconnects"
                  value={`${metric.reconnectSuccesses}/${metric.reconnectAttempts}`}
                />
              </div>

              {metric.errorCount > 0 && (
                <div className="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="font-medium">Last Error:</span>
                    {metric.lastError?.message || "Unknown error"}
                    {metric.lastErrorAt && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(metric.lastErrorAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {metric.staleDataEvents > 0 && (
                <div className="mt-2 rounded-md bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Detected {metric.staleDataEvents} stale data events</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ConnectionStatusIcon({ status }: { status: WebSocketMetrics["connectionStatus"] }) {
  switch (status) {
    case "connected":
      return <Wifi className="h-4 w-4 text-green-500" />
    case "connecting":
      return <Wifi className="h-4 w-4 text-amber-500" />
    case "reconnecting":
      return <RefreshCw className="h-4 w-4 animate-spin text-amber-500" />
    case "disconnecting":
      return <WifiOff className="h-4 w-4 text-amber-500" />
    case "disconnected":
      return <WifiOff className="h-4 w-4 text-destructive" />
    default:
      return <Wifi className="h-4 w-4 text-muted-foreground" />
  }
}

function ConnectionStatusBadge({ status }: { status: WebSocketMetrics["connectionStatus"] }) {
  switch (status) {
    case "connected":
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
          Connected
        </Badge>
      )
    case "connecting":
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
          Connecting
        </Badge>
      )
    case "reconnecting":
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
          Reconnecting
        </Badge>
      )
    case "disconnecting":
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
          Disconnecting
        </Badge>
      )
    case "disconnected":
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive">
          Disconnected
        </Badge>
      )
    default:
      return <Badge variant="outline">Unknown</Badge>
  }
}

function MetricItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border p-2 text-xs">
      {icon}
      <div className="flex flex-col">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
    </div>
  )
}
