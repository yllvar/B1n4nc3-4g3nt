"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { webSocketMonitorRegistry } from "@/features/websocket/lib/websocket-monitor"
import { binanceWebSocketClient } from "@/features/websocket/lib/websocket-client"
import { binanceRestApiFallback } from "@/features/websocket/lib/rest-api-fallback"

export function WebSocketDebug({ symbol }: { symbol: string }) {
  const [monitors, setMonitors] = useState<any[]>([])
  const [activeStreams, setActiveStreams] = useState<string[]>([])
  const [pingResult, setPingResult] = useState<string>("Not tested")
  const [serverTimeOffset, setServerTimeOffset] = useState<number | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>("")

  // Normalize symbol
  const normalizedSymbol = symbol.replace(/\s+/g, "").toLowerCase()

  useEffect(() => {
    const interval = setInterval(() => {
      const allMonitors = webSocketMonitorRegistry.getAllMonitors()
      setMonitors(allMonitors.map((m) => m.getMetrics()))
      setActiveStreams(binanceWebSocketClient.getActiveStreams())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const testPing = async () => {
    try {
      setPingResult("Testing...")
      const result = await binanceRestApiFallback.ping()
      setPingResult(result ? "Success" : "Failed")
    } catch (error) {
      setPingResult(`Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const checkServerTime = async () => {
    try {
      setServerTimeOffset(null)
      const offset = await binanceRestApiFallback.checkServerTime()
      setServerTimeOffset(offset)
    } catch (error) {
      setServerTimeOffset(null)
      console.error("Error checking server time:", error)
    }
  }

  const testSymbolFormat = () => {
    const formats = [normalizedSymbol, normalizedSymbol.toUpperCase(), symbol, symbol.toUpperCase()]

    setDebugInfo(`Testing symbol formats:\n${formats.join("\n")}`)

    // Test each format with the REST API
    Promise.all(
      formats.map(async (format) => {
        try {
          const result = await binanceRestApiFallback.getCurrentPrice(format)
          return `${format}: Success (${result})`
        } catch (error) {
          return `${format}: Failed (${error instanceof Error ? error.message : String(error)})`
        }
      }),
    ).then((results) => {
      setDebugInfo(results.join("\n"))
    })
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>WebSocket Debug</CardTitle>
        <CardDescription>Troubleshoot WebSocket connections for {symbol}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={testPing} variant="outline" size="sm">
              Test API Ping
            </Button>
            <Button onClick={checkServerTime} variant="outline" size="sm">
              Check Server Time
            </Button>
            <Button onClick={testSymbolFormat} variant="outline" size="sm">
              Test Symbol Format
            </Button>
            <Button onClick={() => binanceWebSocketClient.forceReconnect()} variant="outline" size="sm">
              Force Reconnect
            </Button>
          </div>

          <div className="text-sm">
            <p>
              <strong>Ping Result:</strong> {pingResult}
            </p>
            <p>
              <strong>Server Time Offset:</strong> {serverTimeOffset !== null ? `${serverTimeOffset}ms` : "Not checked"}
            </p>
            <p>
              <strong>Active Streams:</strong> {activeStreams.length > 0 ? activeStreams.join(", ") : "None"}
            </p>
          </div>

          {debugInfo && (
            <div className="mt-4 p-2 bg-muted rounded-md">
              <pre className="text-xs whitespace-pre-wrap">{debugInfo}</pre>
            </div>
          )}

          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">WebSocket Monitors</h4>
            {monitors.length > 0 ? (
              <div className="space-y-2">
                {monitors.map((monitor, index) => (
                  <div key={index} className="p-2 bg-muted rounded-md">
                    <p className="text-xs">
                      <strong>Stream:</strong> {monitor.streamName}
                    </p>
                    <p className="text-xs">
                      <strong>Status:</strong> {monitor.connectionStatus}
                    </p>
                    <p className="text-xs">
                      <strong>Messages:</strong> {monitor.messagesReceived}
                    </p>
                    <p className="text-xs">
                      <strong>Last Message:</strong>{" "}
                      {monitor.lastMessageReceivedAt
                        ? new Date(monitor.lastMessageReceivedAt).toLocaleTimeString()
                        : "Never"}
                    </p>
                    <p className="text-xs">
                      <strong>Errors:</strong> {monitor.errors.length}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active monitors</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
