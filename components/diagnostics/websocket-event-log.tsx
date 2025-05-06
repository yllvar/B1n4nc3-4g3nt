"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { unifiedWebSocketClient, type WebSocketEvent } from "@/lib/websocket/unified-websocket-client"

interface LogEntry {
  id: number
  timestamp: number
  type: string
  details: string
  data?: any
}

export function WebSocketEventLog() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [nextId, setNextId] = useState(1)

  useEffect(() => {
    const eventTypes = ["connect", "disconnect", "message", "error", "state_change", "heartbeat", "reconnect"]

    const handlers: Record<string, (event: any) => void> = {}

    eventTypes.forEach((type) => {
      handlers[type] = (event: WebSocketEvent) => {
        const newLog: LogEntry = {
          id: nextId,
          timestamp: Date.now(),
          type,
          details: getEventDetails(type, event),
          data: event,
        }

        setLogs((prev) => {
          const updated = [newLog, ...prev]
          // Keep only the last 100 logs
          return updated.length > 100 ? updated.slice(0, 100) : updated
        })

        setNextId((id) => id + 1)
      }

      unifiedWebSocketClient.on(type, handlers[type])
    })

    // Clean up
    return () => {
      eventTypes.forEach((type) => {
        unifiedWebSocketClient.off(type, handlers[type])
      })
    }
  }, [nextId])

  const getEventDetails = (type: string, event: any): string => {
    switch (type) {
      case "connect":
        return `Connected to ${event.stream}`
      case "disconnect":
        return `Disconnected from ${event.stream}`
      case "message":
        return `Received message from ${event.stream}`
      case "error":
        return `Error: ${event.error?.message || "Unknown error"}`
      case "state_change":
        return `State changed to ${event.state}`
      case "heartbeat":
        return event.success
          ? `Heartbeat successful (${event.latency}ms)`
          : `Heartbeat timeout after ${event.timeout}ms`
      case "reconnect":
        return `Reconnection attempt ${event.attempt} of ${event.maxAttempts}`
      default:
        return `Event: ${JSON.stringify(event)}`
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getEventColor = (type: string): string => {
    switch (type) {
      case "connect":
        return "bg-green-100 text-green-800"
      case "disconnect":
        return "bg-orange-100 text-orange-800"
      case "error":
        return "bg-red-100 text-red-800"
      case "reconnect":
        return "bg-yellow-100 text-yellow-800"
      case "heartbeat":
        return "bg-blue-100 text-blue-800"
      case "message":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>WebSocket Event Log</CardTitle>
          <CardDescription>Real-time log of WebSocket events</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={clearLogs}>
          Clear Logs
        </Button>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md overflow-hidden max-h-[400px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-background">
              <tr className="bg-muted/50">
                <th className="p-2 text-left">Time</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="border-t border-border">
                    <td className="p-2 text-sm">{formatTime(log.timestamp)}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getEventColor(log.type)}`}>{log.type}</span>
                    </td>
                    <td className="p-2 text-sm">{log.details}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-muted-foreground">
                    No events logged yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
