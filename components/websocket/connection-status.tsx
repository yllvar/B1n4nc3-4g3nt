"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  unifiedWebSocketClient,
  type WebSocketStatus,
  type WebSocketMetrics,
} from "@/lib/websocket/unified-websocket-client"
import { AlertCircle, CheckCircle, RefreshCw, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

export function WebSocketConnectionStatus() {
  const [connectionState, setConnectionState] = useState<WebSocketStatus>("disconnected")
  const [metrics, setMetrics] = useState<WebSocketMetrics>({
    latency: 0,
    messageRate: 0,
    uptime: 0,
    reconnects: 0,
    lastMessageTime: null,
  })
  const [activeStreams, setActiveStreams] = useState<string[]>([])
  const [isReconnecting, setIsReconnecting] = useState(false)

  useEffect(() => {
    // Subscribe to WebSocket status updates
    const unsubscribe = unifiedWebSocketClient.subscribe((status, wsMetrics) => {
      setConnectionState(status)
      setMetrics(wsMetrics)
      setActiveStreams(unifiedWebSocketClient.getActiveStreams())
    })

    // Initial state
    setConnectionState(unifiedWebSocketClient.getStatus())
    setMetrics(unifiedWebSocketClient.getMetrics())
    setActiveStreams(unifiedWebSocketClient.getActiveStreams())

    return () => {
      unsubscribe()
    }
  }, [])

  const handleReconnect = async () => {
    setIsReconnecting(true)
    toast({
      title: "Reconnecting WebSocket",
      description: "Attempting to reconnect to all active streams...",
    })

    try {
      unifiedWebSocketClient.forceReconnect()
      toast({
        title: "WebSocket Reconnected",
        description: "Successfully reconnected to WebSocket streams.",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Reconnection Failed",
        description: error instanceof Error ? error.message : "Failed to reconnect to WebSocket",
        variant: "destructive",
      })
    } finally {
      setIsReconnecting(false)
    }
  }

  const getStatusColor = () => {
    switch (connectionState) {
      case "connected":
        return "bg-green-500"
      case "connecting":
        return "bg-yellow-500"
      case "fallback":
        return "bg-blue-500"
      case "disconnected":
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusIcon = () => {
    switch (connectionState) {
      case "connected":
        return <CheckCircle className="h-4 w-4 mr-1" />
      case "connecting":
        return <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
      case "fallback":
        return <AlertCircle className="h-4 w-4 mr-1" />
      case "disconnected":
      case "error":
        return <WifiOff className="h-4 w-4 mr-1" />
      default:
        return <AlertCircle className="h-4 w-4 mr-1" />
    }
  }

  const formatUptime = (ms: number) => {
    if (ms === 0) return "0s"

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

  return (
    <Card className="border-l-4" style={{ borderLeftColor: getStatusColor() }}>
      <CardContent className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div>
            <Badge className={`${getStatusColor()}`}>
              <span className="flex items-center">
                {getStatusIcon()}
                {connectionState}
              </span>
            </Badge>
          </div>
          <div className="hidden sm:block">
            <div className="text-sm">
              <span className="text-muted-foreground mr-2">Streams:</span>
              <span className="font-medium">{activeStreams.length > 0 ? activeStreams.join(", ") : "None"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-4">
            <div className="text-sm">
              <span className="text-muted-foreground mr-2">Uptime:</span>
              <span className="font-medium">{formatUptime(metrics.uptime)}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground mr-2">Latency:</span>
              <span className="font-medium">{metrics.latency > 0 ? `${metrics.latency}ms` : "N/A"}</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReconnect}
            disabled={isReconnecting || activeStreams.length === 0}
          >
            {isReconnecting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                Reconnecting...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                Reconnect
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
