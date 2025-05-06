"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { env } from "@/lib/env"
import { binanceConnectionManager } from "@/lib/websocket/websocket-connection-manager"

export function WebSocketConfig() {
  const [config, setConfig] = useState({
    initialDelay: env.WS_RECONNECT_INITIAL_DELAY,
    maxDelay: env.WS_RECONNECT_MAX_DELAY,
    factor: env.WS_RECONNECT_FACTOR,
    maxAttempts: env.WS_RECONNECT_MAX_ATTEMPTS,
    heartbeatInterval: env.WS_HEARTBEAT_INTERVAL,
    heartbeatTimeout: env.WS_HEARTBEAT_TIMEOUT,
  })

  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState("")

  useEffect(() => {
    // Check connection status initially and every second
    const checkConnection = () => {
      setIsConnected(binanceConnectionManager.isConnected())
      setConnectionState(binanceConnectionManager.getConnectionState())
    }

    checkConnection()
    const interval = setInterval(checkConnection, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setConfig((prev) => ({
      ...prev,
      [name]: name === "factor" ? Number.parseFloat(value) : Number.parseInt(value, 10),
    }))
  }

  const handleApply = () => {
    // In a real application, you would update the environment variables
    // and restart the WebSocket connection with the new configuration
    toast({
      title: "Configuration Updated",
      description: "WebSocket configuration has been updated. Changes will take effect on reconnection.",
    })

    // Force reconnection to apply changes
    binanceConnectionManager.forceReconnect()
  }

  const handleReconnect = () => {
    binanceConnectionManager.forceReconnect()
    toast({
      title: "Reconnecting",
      description: "Forcing WebSocket reconnection...",
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
    <Card>
      <CardHeader>
        <CardTitle>WebSocket Configuration</CardTitle>
        <CardDescription>
          Configure WebSocket connection parameters. Current state:
          <span className={`ml-2 font-medium ${isConnected ? "text-green-500" : "text-red-500"}`}>
            {connectionState}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="initialDelay">Initial Reconnect Delay (ms)</Label>
            <Input
              id="initialDelay"
              name="initialDelay"
              type="number"
              value={config.initialDelay}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxDelay">Maximum Reconnect Delay (ms)</Label>
            <Input id="maxDelay" name="maxDelay" type="number" value={config.maxDelay} onChange={handleChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="factor">Backoff Factor</Label>
            <Input id="factor" name="factor" type="number" step="0.1" value={config.factor} onChange={handleChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxAttempts">Maximum Reconnect Attempts</Label>
            <Input
              id="maxAttempts"
              name="maxAttempts"
              type="number"
              value={config.maxAttempts}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heartbeatInterval">Heartbeat Interval (ms)</Label>
            <Input
              id="heartbeatInterval"
              name="heartbeatInterval"
              type="number"
              value={config.heartbeatInterval}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heartbeatTimeout">Heartbeat Timeout (ms)</Label>
            <Input
              id="heartbeatTimeout"
              name="heartbeatTimeout"
              type="number"
              value={config.heartbeatTimeout}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-6">
          <Button onClick={handleApply}>Apply Configuration</Button>
          <Button variant="outline" onClick={handleReconnect}>
            Force Reconnect
          </Button>
          <Button variant="outline" onClick={handleResetCircuitBreaker}>
            Reset Circuit Breaker
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
