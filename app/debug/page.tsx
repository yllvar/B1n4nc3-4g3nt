"use client"

import type React from "react"

import { useState } from "react"
import { WebSocketDebug } from "@/components/debug/websocket-debug"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function DebugPage() {
  const [symbol, setSymbol] = useState("SOLUSDT")
  const [inputSymbol, setInputSymbol] = useState("SOLUSDT")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSymbol(inputSymbol)
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">WebSocket Connection Debugger</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Symbol Selection</CardTitle>
          <CardDescription>Enter the trading pair symbol to debug</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={inputSymbol}
              onChange={(e) => setInputSymbol(e.target.value)}
              placeholder="Enter symbol (e.g. SOLUSDT)"
            />
            <Button type="submit">Debug</Button>
          </form>
        </CardContent>
      </Card>

      <WebSocketDebug symbol={symbol} />
    </div>
  )
}
