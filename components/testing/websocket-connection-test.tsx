"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle } from "lucide-react"
import { binanceConnectionManager } from "@/lib/websocket/websocket-connection-manager"

interface TestResult {
  name: string
  passed: boolean
  message: string
}

interface WebSocketConnectionTestProps {
  onResultsUpdate: (passed: number, failed: number) => void
}

export function WebSocketConnectionTest({ onResultsUpdate }: WebSocketConnectionTestProps) {
  const [results, setResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runTests = async () => {
    setIsRunning(true)
    setResults([])

    const testResults: TestResult[] = []

    // Test 1: Can connect to WebSocket
    try {
      const initialStatus = binanceConnectionManager.getConnectionState()

      // Force a new connection
      binanceConnectionManager.forceReconnect()

      // Wait for connection to establish
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const newStatus = binanceConnectionManager.getConnectionState()
      const isConnected = binanceConnectionManager.isConnected()

      testResults.push({
        name: "WebSocket Connection",
        passed: isConnected,
        message: isConnected
          ? `Successfully connected (Status: ${newStatus})`
          : `Failed to connect (Status: ${newStatus}, Previous: ${initialStatus})`,
      })
    } catch (error) {
      testResults.push({
        name: "WebSocket Connection",
        passed: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      })
    }

    // Test 2: Can subscribe to a stream
    try {
      let messageReceived = false
      const symbol = "btcusdt"
      const streamName = `${symbol}@trade`

      const unsubscribe = binanceConnectionManager.subscribe(streamName, () => {
        messageReceived = true
      })

      // Wait for message
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Clean up
      unsubscribe()

      testResults.push({
        name: "Stream Subscription",
        passed: messageReceived,
        message: messageReceived
          ? `Successfully received message from ${streamName}`
          : `No message received from ${streamName} after 3 seconds`,
      })
    } catch (error) {
      testResults.push({
        name: "Stream Subscription",
        passed: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      })
    }

    // Test 3: Can get connection metrics
    try {
      const metrics = binanceConnectionManager.getMetrics()
      const hasMetrics = metrics && typeof metrics === "object"

      testResults.push({
        name: "Connection Metrics",
        passed: hasMetrics,
        message: hasMetrics
          ? `Successfully retrieved metrics: ${JSON.stringify(metrics).substring(0, 100)}...`
          : `Failed to retrieve metrics`,
      })
    } catch (error) {
      testResults.push({
        name: "Connection Metrics",
        passed: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      })
    }

    setResults(testResults)
    setIsRunning(false)

    // Update parent component with results summary
    const passed = testResults.filter((r) => r.passed).length
    const failed = testResults.filter((r) => !r.passed).length
    onResultsUpdate(passed, failed)
  }

  return (
    <Card data-testrunner="true">
      <CardHeader>
        <CardTitle>WebSocket Connection Tests</CardTitle>
        <CardDescription>Tests basic WebSocket connection functionality</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={runTests} disabled={isRunning} data-action="run-tests" className="mb-4">
          {isRunning ? "Running Tests..." : "Run Connection Tests"}
        </Button>

        <div className="space-y-2">
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-3 rounded-md flex items-start gap-2 ${
                result.passed ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
              }`}
            >
              {result.passed ? (
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              )}
              <div>
                <p className="font-medium">{result.name}</p>
                <p className="text-sm">{result.message}</p>
              </div>
            </div>
          ))}

          {results.length === 0 && isRunning && <div className="text-center p-4 text-gray-500">Running tests...</div>}

          {results.length === 0 && !isRunning && (
            <div className="text-center p-4 text-gray-500">
              No tests run yet. Click the button above to start testing.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
