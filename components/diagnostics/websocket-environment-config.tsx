"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"

interface EnvVariable {
  name: string
  value: string | number | undefined
  description: string
  recommendation?: string
}

export function WebSocketEnvironmentConfig() {
  const [envVariables, setEnvVariables] = useState<EnvVariable[]>([
    {
      name: "BINANCE_WS_BASE_URL",
      value: process.env.NEXT_PUBLIC_BINANCE_API_BASE_URL || "Not set",
      description: "Base URL for Binance WebSocket connections",
      recommendation:
        "Should be set to wss://fstream.binance.com/ws for futures or wss://stream.binance.com:9443/ws for spot",
    },
    {
      name: "WS_RECONNECT_INITIAL_DELAY",
      value: process.env.WS_RECONNECT_INITIAL_DELAY || "Not set (default: 5000)",
      description: "Initial delay in milliseconds before attempting to reconnect",
      recommendation: "Recommended value: 1000-5000ms",
    },
    {
      name: "WS_RECONNECT_MAX_DELAY",
      value: process.env.WS_RECONNECT_MAX_DELAY || "Not set (default: 60000)",
      description: "Maximum delay between reconnection attempts",
      recommendation: "Recommended value: 30000-60000ms",
    },
    {
      name: "WS_RECONNECT_FACTOR",
      value: process.env.WS_RECONNECT_FACTOR || "Not set (default: 2)",
      description: "Exponential backoff factor for reconnection attempts",
      recommendation: "Recommended value: 1.5-2.0",
    },
    {
      name: "WS_RECONNECT_MAX_ATTEMPTS",
      value: process.env.WS_RECONNECT_MAX_ATTEMPTS || "Not set (default: 10)",
      description: "Maximum number of reconnection attempts before failing",
      recommendation: "Recommended value: 5-15",
    },
    {
      name: "WS_HEARTBEAT_INTERVAL",
      value: process.env.WS_HEARTBEAT_INTERVAL || "Not set (default: 30000)",
      description: "Interval in milliseconds between heartbeat checks",
      recommendation: "Recommended value: 20000-40000ms",
    },
    {
      name: "WS_HEARTBEAT_TIMEOUT",
      value: process.env.WS_HEARTBEAT_TIMEOUT || "Not set (default: 10000)",
      description: "Timeout in milliseconds for heartbeat responses",
      recommendation: "Recommended value: 5000-15000ms",
    },
  ])

  return (
    <Card>
      <CardHeader>
        <CardTitle>WebSocket Environment Configuration</CardTitle>
        <CardDescription>Current environment variables affecting WebSocket behavior</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Configuration Info</AlertTitle>
          <AlertDescription>
            These environment variables control the behavior of WebSocket connections, including reconnection strategies
            and heartbeat mechanisms.
          </AlertDescription>
        </Alert>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variable</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Recommendation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {envVariables.map((variable) => (
              <TableRow key={variable.name}>
                <TableCell className="font-mono text-xs">{variable.name}</TableCell>
                <TableCell className="font-mono text-xs">{variable.value}</TableCell>
                <TableCell className="text-sm">{variable.description}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{variable.recommendation}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
