"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Wifi, WifiOff, AlertTriangle, RefreshCw } from "lucide-react"
import { binanceWebSocketManager } from "@/lib/websocket/binance-websocket-manager"

type ConnectionStatus = "connected" | "disconnected" | "connecting" | "reconnecting" | "error"

export function ConnectionStatusIndicator() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected")
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    // Initial status
    setStatus(binanceWebSocketManager.getConnectionState() as ConnectionStatus)

    // Add listener for status changes
    const listenerId = "connection-status-indicator"
    binanceWebSocketManager.addStateChangeListener(listenerId, (newStatus) => {
      setStatus(newStatus as ConnectionStatus)
      setLastUpdated(new Date())
    })

    // Set up polling as a fallback to ensure UI stays in sync
    const interval = setInterval(() => {
      const currentStatus = binanceWebSocketManager.getConnectionState() as ConnectionStatus
      if (currentStatus !== status) {
        setStatus(currentStatus)
        setLastUpdated(new Date())
      }
    }, 5000)

    // Cleanup
    return () => {
      binanceWebSocketManager.removeStateChangeListener(listenerId)
      clearInterval(interval)
    }
  }, [status])

  // Determine icon and color based on status
  const getStatusDetails = () => {
    switch (status) {
      case "connected":
        return {
          icon: <Wifi className="h-4 w-4" />,
          color: "bg-green-500 hover:bg-green-600",
          text: "Connected",
        }
      case "connecting":
        return {
          icon: <RefreshCw className="h-4 w-4 animate-spin" />,
          color: "bg-yellow-500 hover:bg-yellow-600",
          text: "Connecting",
        }
      case "reconnecting":
        return {
          icon: <RefreshCw className="h-4 w-4 animate-spin" />,
          color: "bg-yellow-500 hover:bg-yellow-600",
          text: "Reconnecting",
        }
      case "error":
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          color: "bg-red-500 hover:bg-red-600",
          text: "Connection Error",
        }
      case "disconnected":
      default:
        return {
          icon: <WifiOff className="h-4 w-4" />,
          color: "bg-red-500 hover:bg-red-600",
          text: "Disconnected",
        }
    }
  }

  const { icon, color, text } = getStatusDetails()

  // Format the last updated time
  const getLastUpdatedText = () => {
    const seconds = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ago`
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${color} text-white cursor-help transition-colors duration-200`}>
            <span className="flex items-center gap-1.5">
              {icon}
              <span className="hidden sm:inline">{text}</span>
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-sm">
            <p className="font-semibold">{text}</p>
            <p className="text-xs text-muted-foreground">Last updated: {getLastUpdatedText()}</p>
            {status !== "connected" && (
              <p className="text-xs mt-1">The application will automatically attempt to reconnect.</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
