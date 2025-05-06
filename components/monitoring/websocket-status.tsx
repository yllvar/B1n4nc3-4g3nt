"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { binanceConnectionManager } from "@/lib/websocket/websocket-connection-manager"
import { ConnectionState, type WebSocketMetrics } from "@/lib/websocket/unified-websocket-client"
import { Activity, AlertTriangle, CheckCircle, Clock, RefreshCw, Wifi, WifiOff, XCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default function WebSocketStatus() {
  const [metrics, setMetrics] = useState<WebSocketMetrics | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    // Get initial metrics
    setMetrics(binanceConnectionManager.getMetrics())

    // Subscribe to metrics updates
    const unsubscribe = binanceConnectionManager.addMetricsListener((updatedMetrics) => {
      setMetrics(updatedMetrics)
      setLastUpdated(new Date())
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleForceReconnect = () => {
    binanceConnectionManager.forceReconnect()
  }

  // If no metrics yet, show loading
  if (!metrics) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>WebSocket Status</CardTitle>
          <CardDescription>Loading connection metrics...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const getConnectionIcon = (state: ConnectionState) => {
    switch (state) {
      case ConnectionState.CONNECTED:
        return <Wifi className="h-4 w-4 text-green-500" />
      case ConnectionState.CONNECTING:
        return <Wifi className="h-4 w-4 text-amber-500" />
      case ConnectionState.RECONNECTING:
        return <RefreshCw className="h-4 w-4 animate-spin text-amber-500" />
      case ConnectionState.DISCONNECTED:
        return <WifiOff className="h-4 w-4 text-amber-500" />
      case ConnectionState.FAILED:
        return <WifiOff className="h-4 w-4 text-destructive" />
      default:
        return <Wifi className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getConnectionBadge = (state: ConnectionState) => {
    switch (state) {
      case ConnectionState.CONNECTED:
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
            Connected
          </Badge>
        )
      case ConnectionState.CONNECTING:
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
            Connecting
          </Badge>
        )
      case ConnectionState.RECONNECTING:
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
            Reconnecting
          </Badge>
        )
      case ConnectionState.DISCONNECTED:
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
            Disconnected
          </Badge>
        )
      case ConnectionState.FAILED:
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive">
            Failed
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getHealthStatus = () => {
    const health = metrics.connectionHealth
    if (health >= 90) return { label: "Excellent", icon: <CheckCircle className="h-4 w-4 text-green-500" /> }
    if (health >= 70) return { label: "Good", icon: <CheckCircle className="h-4 w-4 text-green-400" /> }
    if (health >= 50) return { label: "Fair", icon: <AlertTriangle className="h-4 w-4 text-yellow-500" /> }
    if (health >= 30) return { label: "Poor", icon: <AlertTriangle className="h-4 w-4 text-orange-500" /> }
    return { label: "Critical", icon: <XCircle className="h-4 w-4 text-red-500" /> }
  }

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return "Never"
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
  }

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const healthStatus = getHealthStatus()
  const activeStreams = binanceConnectionManager.getActiveStreams()

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>WebSocket Status</CardTitle>
            <CardDescription>
              {activeStreams.length > 0 ? `Monitoring ${activeStreams.length} active streams` : "No active streams"}
            </CardDescription>
          </div>
          <div className="text-xs text-muted-foreground">
            Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getConnectionIcon(metrics.connectionState)}
            <h3 className="font-medium">{metrics.connectionState}</h3>
          </div>
          {getConnectionBadge(metrics.connectionState)}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Connection Health</span>
            <span className="flex items-center gap-1 font-medium">
              {healthStatus.icon} {healthStatus.label}
            </span>
          </div>
          <Progress value={metrics.connectionHealth} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Message Rate</span>
            <p className="flex items-center gap-1 font-medium">
              <Activity className="h-4 w-4 text-blue-500" />
              {metrics.messageRate.toFixed(1)}/s
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Latency</span>
            <p className="flex items-center gap-1 font-medium">
              <Clock className="h-4 w-4 text-blue-500" />
              {metrics.averageLatency.toFixed(0)} ms
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Last Heartbeat</span>
            <p className="flex items-center gap-1 font-medium">
              <Activity className="h-4 w-4 text-green-500" />
              {formatTime(metrics.lastHeartbeatTime)}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Uptime</span>
            <p className="flex items-center gap-1 font-medium">
              <Clock className="h-4 w-4 text-green-500" />
              {formatUptime(metrics.uptime)}
            </p>
          </div>
        </div>

        {metrics.reconnectAttempts > 0 && (
          <div className="rounded-md bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <div className="flex items-center">
              <RefreshCw className="mr-2 h-4 w-4" />
              <span>
                {metrics.reconnectAttempts} reconnection{metrics.reconnectAttempts !== 1 ? "s" : ""} attempted
              </span>
            </div>
          </div>
        )}

        {metrics.errorCount > 0 && (
          <div className="rounded-md bg-red-50 p-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
            <div className="flex items-center">
              <AlertTriangle className="mr-2 h-4 w-4" />
              <span>
                {metrics.errorCount} error{metrics.errorCount !== 1 ? "s" : ""} detected
                {metrics.lastError && `: ${metrics.lastError.message}`}
              </span>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleForceReconnect}
          variant="outline"
          className="w-full"
          disabled={activeStreams.length === 0}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Force Reconnect
        </Button>
      </CardFooter>
    </Card>
  )
}
