"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { binanceConnectionManager } from "@/lib/websocket/websocket-connection-manager"

export function WebSocketTestConnection() {
  const [symbol, setSymbol] = useState("btcusdt")
  const [streamType, setStreamType] = useState("trade")
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [autoDisconnect, setAutoDisconnect] = useState(true)
  const [disconnectTime, setDisconnectTime] = useState(30)
  const [messages, setMessages] = useState<any[]>([])
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null)

  const handleSubscribe = () => {
    if (isSubscribed) {
      // Clean up existing subscription
      if (unsubscribe) {
        unsubscribe()
        setUnsubscribe(null)
      }

      if (timerInterval) {
        clearInterval(timerInterval)
        setTimerInterval(null)
      }

      setIsSubscribed(false)
      setMessages([])
      setTimeRemaining(null)

      toast({
        title: "Unsubscribed",
        description: `Unsubscribed from ${streamType} stream for ${symbol}`,
      })

      return
    }

    // Format the stream correctly for Binance
    // For Binance, the format is typically: <symbol>@<streamType>
    // Example: btcusdt@trade
    const stream = `${symbol.toLowerCase()}@${streamType}`

    try {
      // Subscribe to WebSocket stream
      const unsub = binanceConnectionManager.subscribe(stream, (data) => {
        setMessages((prev) => [data, ...prev].slice(0, 10))
      })

      setUnsubscribe(() => unsub)
      setIsSubscribed(true)

      toast({
        title: "Subscribed",
        description: `Successfully subscribed to ${stream}`,
      })

      // Set up auto disconnect if enabled
      if (autoDisconnect) {
        const seconds = disconnectTime
        setTimeRemaining(seconds)

        const interval = setInterval(() => {
          setTimeRemaining((prev) => {
            if (prev === null) return null
            if (prev <= 1) {
              // Auto disconnect
              if (unsubscribe) {
                unsubscribe()
                setUnsubscribe(null)
              }
              setIsSubscribed(false)
              setMessages([])
              clearInterval(interval)

              toast({
                title: "Auto-disconnected",
                description: `Automatically disconnected from ${stream} after ${disconnectTime} seconds`,
              })

              return null
            }
            return prev - 1
          })
        }, 1000)

        setTimerInterval(interval)
      }
    } catch (error) {
      toast({
        title: "Subscription Failed",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test WebSocket Connection</CardTitle>
        <CardDescription>Subscribe to a Binance WebSocket stream to test connection</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                disabled={isSubscribed}
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
                disabled={isSubscribed}
              >
                <option value="trade">Trade</option>
                <option value="kline_1m">Kline (1m)</option>
                <option value="depth@100ms">Depth (100ms)</option>
                <option value="ticker">Ticker</option>
                <option value="miniTicker">Mini Ticker</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="auto-disconnect"
              checked={autoDisconnect}
              onCheckedChange={setAutoDisconnect}
              disabled={isSubscribed}
            />
            <Label htmlFor="auto-disconnect">Auto-disconnect after</Label>
            <Input
              type="number"
              className="w-20"
              value={disconnectTime}
              onChange={(e) => setDisconnectTime(Number.parseInt(e.target.value) || 30)}
              disabled={!autoDisconnect || isSubscribed}
              min={5}
              max={300}
            />
            <span className="text-sm">seconds</span>
          </div>

          <Button onClick={handleSubscribe} className={isSubscribed ? "bg-red-500 hover:bg-red-600" : ""}>
            {isSubscribed
              ? timeRemaining !== null
                ? `Unsubscribe (auto in ${timeRemaining}s)`
                : "Unsubscribe"
              : "Subscribe"}
          </Button>

          <div className="space-y-2">
            <div className="flex justify-between">
              <h4 className="text-sm font-semibold">Recent Messages</h4>
              <Button variant="outline" size="sm" onClick={() => setMessages([])} disabled={messages.length === 0}>
                Clear
              </Button>
            </div>
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
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  {isSubscribed ? "Waiting for messages..." : "No messages received"}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
