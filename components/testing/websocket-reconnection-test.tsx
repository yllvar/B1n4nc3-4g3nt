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

interface WebSocketReconnectionTestProps {
  onResultsUpdate: (passed: number, failed: number) => void
}

export function WebSocketReconnectionTest({ onResultsUpdate }: WebSocketReconnectionTestProps) {
  const [results, setResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runTests = async () => {
    setIsRunning(true)
    setResults([])

    const testResults: TestResult[] = []

    // Test 1: Force reconnect works
    try {
      // First ensure we're connected
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const initialStatus = binanceConnectionManager.getConnectionState()

      // Force reconnect
      binanceConnectionManager.forceReconnect()

      // Wait a moment for reconnection to start
      await new Promise((resolve) => setTimeout(resolve, 500))

      const reconnectingStatus = binanceConnectionManager.getConnectionState()

      // Wait for reconnection to complete
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const finalStatus = binanceConnectionManager.getConnectionState()
      const isConnected = binanceConnectionManager.isConnected()

      const reconnectWorked =
        // Either we saw a reconnecting state
        (reconnectingStatus !== initialStatus && isConnected) ||
        // Or we went straight back to connected
        (isConnected && finalStatus === "connected")

      testResults.push({
        name: "Force Reconnect",
        passed: reconnectWorked,
        message: reconnectWorked
          ? `Successfully reconnected (Initial: ${initialStatus}, During: ${reconnectingStatus}, Final: ${finalStatus})`
          : `Failed to reconnect (Initial: ${initialStatus}, During: ${reconnectingStatus}, Final: ${finalStatus})`,
      })
    } catch (error) {
      testResults.push({
        name: "Force Reconnect",
        passed: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      })
    }

    // Test 2: Subscription persists after reconnect
    try {
      let messageBeforeReconnect = false
      let messageAfterReconnect = false
      const symbol = "btcusdt"
      const streamName = `${symbol}@trade`

      const unsubscribe = binanceConnectionManager.subscribe(streamName, () => {
        if (!messageBeforeReconnect) {
          messageBeforeReconnect = true
        } else if (messageBeforeReconnect) {
          messageAfterReconnect = true
        }
      })

      // Wait for first message
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Force reconnect
      binanceConnectionManager.forceReconnect()

      // Wait for reconnection and second message
      await new Promise((resolve) => setTimeout(resolve, 5000))

      // Clean up
      unsubscribe()

      testResults.push({
        name: "Subscription Persistence",
        passed: messageBeforeReconnect && messageAfterReconnect,
        message:
          messageBeforeReconnect && messageAfterReconnect
            ? `Subscription persisted through reconnection`
            : `Subscription did not persist (Before: ${messageBeforeReconnect}, After: ${messageAfterReconnect})`,
      })
    } catch (error) {
      testResults.push({
        name: "Subscription Persistence",
        passed: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      })
    }

    // Test 3: Circuit breaker can be reset
    try {
      // Reset circuit breaker
      binanceConnectionManager.resetCircuitBreaker()

      // Check connection after reset
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const isConnected = binanceConnectionManager.isConnected()

      testResults.push({
        name: "Circuit Breaker Reset",
        passed: isConnected,
        message: isConnected
          ? `Successfully reset circuit breaker and maintained connection`
          : `Failed to maintain connection after circuit breaker reset`,
      })
    } catch (error) {
      testResults.push({
        name: "Circuit Breaker Reset",
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
        <CardTitle>WebSocket Reconnection Tests</CardTitle>
        <CardDescription>Tests reconnection and recovery functionality</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={runTests} disabled={isRunning} data-action="run-tests" className="mb-4">
          {isRunning ? "Running Tests..." : "Run Reconnection Tests"}
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

          {results.length === 0 && isRunning && (
            <div className="text-center p-4 text-gray-500">Running tests... This may take up to 15 seconds.</div>
          )}

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
