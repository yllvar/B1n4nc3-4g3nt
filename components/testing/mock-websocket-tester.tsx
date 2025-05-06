"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { mockWebSocketClient } from "@/lib/testing/mock-websocket-client"
import { mockWebSocketService } from "@/lib/testing/mock-websocket-service"

export function MockWebSocketTester() {
  const [isConnected, setIsConnected] = useState(false)
  const [symbol, setSymbol] = useState("btcusdt")
  const [streamType, setStreamType] = useState("trade")
  const [messages, setMessages] = useState<any[]>([])
  const [simulateErrors, setSimulateErrors] = useState(false)
  const [simulateDisconnects, setSimulateDisconnects] = useState(false)

  useEffect(() => {
    // Connection status will be updated by connect/disconnect handlers
  }, [])

  const handleConnect = () => {
    mockWebSocketClient.connect()
    setIsConnected(true)
  }

  const handleDisconnect = () => {
    mockWebSocketClient.disconnect()
    setIsConnected(false)
  }

  const handleSubscribe = () => {
    const stream = `${symbol.toLowerCase()}@${streamType}`

    mockWebSocketClient.connectToStream(stream, (data) => {
      setMessages((prev) => [data, ...prev].slice(0, 10))
    })
  }

  const handleSimulateError = () => {
    mockWebSocketService.simulateError("Manual error simulation")
  }

  const handleSimulateDisconnect = () => {
    mockWebSocketService.simulateDisconnect()
  }

  const handleToggleErrors = (checked: boolean) => {
    setSimulateErrors(checked)
    // Update mock service options
    // Note: In a real implementation, you would need to expose a method to update options
    // This is just a placeholder
    console.log("Set simulate errors:", checked)
  }

  const handleToggleDisconnects = (checked: boolean) => {
    setSimulateDisconnects(checked)
    // Update mock service options
    // Note: In a real implementation, you would need to expose a method to update options
    // This is just a placeholder
    console.log("Set simulate disconnects:", checked)
  }

  const handleClearMessages = () => {
    setMessages([])
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Mock WebSocket Connection</span>
            <span
              className={`text-sm px-3 py-1 rounded-full ${
                isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </CardTitle>
          <CardDescription>Control the mock WebSocket connection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleConnect} disabled={isConnected}>
              Connect
            </Button>
            <Button onClick={handleDisconnect} disabled={!isConnected} variant="outline">
              Disconnect
            </Button>
            <Button onClick={handleSimulateError} disabled={!isConnected} variant="destructive">
              Simulate Error
            </Button>
            <Button onClick={handleSimulateDisconnect} disabled={!isConnected} variant="destructive">
              Simulate Disconnect
            </Button>
          </div>

          <div className="mt-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Switch id="simulate-errors" checked={simulateErrors} onCheckedChange={handleToggleErrors} />
              <Label htmlFor="simulate-errors">Simulate random errors</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="simulate-disconnects"
                checked={simulateDisconnects}
                onCheckedChange={handleToggleDisconnects}
              />
              <Label htmlFor="simulate-disconnects">Simulate random disconnects</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscribe to Stream</CardTitle>
          <CardDescription>Test subscribing to mock data streams</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="e.g., btcusdt"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="streamType">Stream Type</Label>
              <select
                id="streamType"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                value={streamType}
                onChange={(e) => setStreamType(e.target.value)}
              >
                <option value="trade">Trade</option>
                <option value="kline_1m">Kline (1m)</option>
                <option value="depth">Depth</option>
                <option value="ticker">Ticker</option>
                <option value="bookTicker">Book Ticker</option>
              </select>
            </div>
          </div>

          <Button onClick={handleSubscribe} disabled={!isConnected} className="w-full">
            Subscribe
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Mock Messages</CardTitle>
            <Button variant="outline" size="sm" onClick={handleClearMessages}>
              Clear
            </Button>
          </div>
          <CardDescription>Messages received from mock WebSocket</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md p-2 h-64 overflow-auto bg-muted/5">
            {messages.length > 0 ? (
              <div className="space-y-2">
                {messages.map((msg, index) => (
                  <div key={index} className="text-xs font-mono bg-muted/10 p-2 rounded">
                    <pre className="whitespace-pre-wrap break-all">{JSON.stringify(msg, null, 2)}</pre>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No messages received</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
