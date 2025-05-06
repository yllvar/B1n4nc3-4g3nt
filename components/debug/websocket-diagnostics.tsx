"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { unifiedWebSocketClient } from "@/lib/websocket/unified-websocket-client"
import { toast } from "@/components/ui/use-toast"
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react"

function WebSocketDiagnosticsPanel() {
  const [testUrl, setTestUrl] = useState("wss://fstream.binance.com/ws")
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    latency?: number
  } | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  const testConnection = async () => {
    setIsTesting(true)
    setTestResult(null)

    try {
      const startTime = Date.now()
      const socket = new WebSocket(testUrl)

      socket.onopen = () => {
        const latency = Date.now() - startTime
        setTestResult({
          success: true,
          message: "Connection established successfully",
          latency,
        })
        socket.close()
        setIsTesting(false)
      }

      socket.onerror = (error) => {
        setTestResult({
          success: false,
          message: "Failed to connect to WebSocket server",
        })
        setIsTesting(false)
      }

      socket.onclose = () => {
        if (!testResult) {
          setTestResult({
            success: false,
            message: "Connection closed unexpectedly",
          })
          setIsTesting(false)
        }
      }

      // Set a timeout in case the connection hangs
      setTimeout(() => {
        if (isTesting) {
          socket.close()
          setTestResult({
            success: false,
            message: "Connection timed out after 5 seconds",
          })
          setIsTesting(false)
        }
      }, 5000)
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      })
      setIsTesting(false)
    }
  }

  const reconnectAllStreams = () => {
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
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>WebSocket Diagnostics</CardTitle>
        <CardDescription>Test and troubleshoot WebSocket connections</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="test">
          <TabsList className="mb-4">
            <TabsTrigger value="test">Connection Test</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="test" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="websocket-url">WebSocket URL</Label>
              <div className="flex space-x-2">
                <Input
                  id="websocket-url"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  placeholder="wss://example.com/ws"
                />
                <Button onClick={testConnection} disabled={isTesting}>
                  {isTesting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-4 rounded-md ${
                  testResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}
              >
                <div className="flex items-center">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 mr-2" />
                  ) : (
                    <AlertCircle className="h-5 w-5 mr-2" />
                  )}
                  <div>
                    <p className="font-medium">{testResult.message}</p>
                    {testResult.latency && <p className="text-sm">Latency: {testResult.latency}ms</p>}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 pt-4">
              <h3 className="font-medium">Browser WebSocket Support</h3>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  WebSocket API supported:{" "}
                  <span className="font-medium">{typeof WebSocket !== "undefined" ? "Yes" : "No"}</span>
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">WebSocket Actions</h3>
              <div className="flex flex-col space-y-2">
                <Button onClick={reconnectAllStreams}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reconnect All Streams
                </Button>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <h3 className="font-medium">Network Status</h3>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  Online Status: <span className="font-medium">{navigator.onLine ? "Online" : "Offline"}</span>
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Export the component as WebSocketDiagnostics for compatibility
export const WebSocketDiagnostics = WebSocketDiagnosticsPanel

export default WebSocketDiagnosticsPanel
