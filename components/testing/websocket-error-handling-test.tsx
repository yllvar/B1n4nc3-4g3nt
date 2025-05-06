"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle } from "lucide-react"
import { binanceConnectionManager } from "@/lib/websocket/websocket-connection-manager"
import { errorHandler } from "@/lib/error-handling"

interface TestResult {
  name: string
  passed: boolean
  message: string
}

interface WebSocketErrorHandlingTestProps {
  onResultsUpdate: (passed: number, failed: number) => void
}

export function WebSocketErrorHandlingTest({ onResultsUpdate }: WebSocketErrorHandlingTestProps) {
  const [results, setResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runTests = async () => {
    setIsRunning(true)
    setResults([])

    const testResults: TestResult[] = []

    // Test 1: Error handler captures WebSocket errors
    try {
      // Clear existing errors
      errorHandler.clearErrors()

      // Get initial error count
      const initialErrors = errorHandler.getRecentErrors().length

      // Simulate a WebSocket error
      const testError = new Error("Test WebSocket Error")
      errorHandler.handleError(testError, {
        context: { source: "WebSocket" },
        severity: "medium",
      })

      // Check if error was captured
      const newErrors = errorHandler.getRecentErrors().length
      const errorCaptured = newErrors > initialErrors

      testResults.push({
        name: "Error Capture",
        passed: errorCaptured,
        message: errorCaptured ? `Successfully captured WebSocket error` : `Failed to capture WebSocket error`,
      })

      // Clean up
      errorHandler.clearErrors()
    } catch (error) {
      testResults.push({
        name: "Error Capture",
        passed: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      })
    }

    // Test 2: Invalid stream name handling
    try {
      let errorOccurred = false

      try {
        // Try to subscribe to an invalid stream
        const invalidStream = "invalid@stream@format"
        binanceConnectionManager.subscribe(invalidStream, () => {})

        // Wait a moment to see if an error occurs
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (error) {
        errorOccurred = true
      }

      // Check connection status after error
      const isStillConnected = binanceConnectionManager.isConnected()

      testResults.push({
        name: "Invalid Stream Handling",
        passed: isStillConnected, // We should still be connected even after an invalid stream
        message: isStillConnected
          ? `Connection maintained despite invalid stream`
          : `Connection lost after invalid stream subscription`,
      })
    } catch (error) {
      testResults.push({
        name: "Invalid Stream Handling",
        passed: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      })
    }

    // Test 3: Connection metrics during errors
    try {
      // Get initial metrics
      const initialMetrics = binanceConnectionManager.getMetrics()

      // Force a reconnection (which might trigger errors)
      binanceConnectionManager.forceReconnect()

      // Wait for reconnection
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Get new metrics
      const newMetrics = binanceConnectionManager.getMetrics()

      // Check if metrics are still being updated
      const metricsUpdated =
        newMetrics.uptime !== initialMetrics.uptime || newMetrics.reconnects !== initialMetrics.reconnects

      testResults.push({
        name: "Metrics During Errors",
        passed: metricsUpdated,
        message: metricsUpdated
          ? `Metrics continue to update during error conditions`
          : `Metrics failed to update during error conditions`,
      })
    } catch (error) {
      testResults.push({
        name: "Metrics During Errors",
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
        <CardTitle>WebSocket Error Handling Tests</CardTitle>
        <CardDescription>Tests error handling and recovery</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={runTests} disabled={isRunning} data-action="run-tests" className="mb-4">
          {isRunning ? "Running Tests..." : "Run Error Handling Tests"}
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
