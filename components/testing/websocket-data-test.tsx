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
  data?: any
}

interface WebSocketDataTestProps {
  onResultsUpdate: (passed: number, failed: number) => void
}

export function WebSocketDataTest({ onResultsUpdate }: WebSocketDataTestProps) {
  const [results, setResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runTests = async () => {
    setIsRunning(true)
    setResults([])

    const testResults: TestResult[] = []

    // Test 1: Can receive trade data
    try {
      let tradeData: any = null
      const symbol = "btcusdt"
      const streamName = `${symbol}@trade`

      const unsubscribe = binanceConnectionManager.subscribe(streamName, (data) => {
        if (!tradeData) tradeData = data
      })

      // Wait for message
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Clean up
      unsubscribe()

      const hasValidData =
        tradeData &&
        typeof tradeData === "object" &&
        "p" in tradeData && // price
        "q" in tradeData && // quantity
        "T" in tradeData // timestamp

      testResults.push({
        name: "Trade Data Structure",
        passed: hasValidData,
        message: hasValidData ? `Received valid trade data` : `Invalid or no trade data received`,
        data: tradeData,
      })
    } catch (error) {
      testResults.push({
        name: "Trade Data Structure",
        passed: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      })
    }

    // Test 2: Can receive order book data
    try {
      let orderBookData: any = null
      const symbol = "btcusdt"
      const streamName = `${symbol}@depth`

      const unsubscribe = binanceConnectionManager.subscribe(streamName, (data) => {
        if (!orderBookData) orderBookData = data
      })

      // Wait for message
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Clean up
      unsubscribe()

      const hasValidData =
        orderBookData &&
        typeof orderBookData === "object" &&
        Array.isArray(orderBookData.bids) &&
        Array.isArray(orderBookData.asks)

      testResults.push({
        name: "Order Book Data Structure",
        passed: hasValidData,
        message: hasValidData ? `Received valid order book data` : `Invalid or no order book data received`,
        data: orderBookData,
      })
    } catch (error) {
      testResults.push({
        name: "Order Book Data Structure",
        passed: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      })
    }

    // Test 3: Data validation - price is a number
    try {
      let priceData: any = null
      const symbol = "btcusdt"
      const streamName = `${symbol}@bookTicker`

      const unsubscribe = binanceConnectionManager.subscribe(streamName, (data) => {
        if (!priceData) priceData = data
      })

      // Wait for message
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Clean up
      unsubscribe()

      const price = priceData && priceData.b ? Number.parseFloat(priceData.b) : Number.NaN
      const isValidPrice = !isNaN(price) && price > 0

      testResults.push({
        name: "Price Data Validation",
        passed: isValidPrice,
        message: isValidPrice ? `Received valid price: ${price}` : `Invalid or no price data received`,
        data: priceData,
      })
    } catch (error) {
      testResults.push({
        name: "Price Data Validation",
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
        <CardTitle>WebSocket Data Tests</CardTitle>
        <CardDescription>Tests data structure and validation</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={runTests} disabled={isRunning} data-action="run-tests" className="mb-4">
          {isRunning ? "Running Tests..." : "Run Data Tests"}
        </Button>

        <div className="space-y-4">
          {results.map((result, index) => (
            <div key={index} className="space-y-2">
              <div
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

              {result.data && (
                <div className="bg-gray-50 p-3 rounded-md overflow-auto max-h-40">
                  <pre className="text-xs">{JSON.stringify(result.data, null, 2)}</pre>
                </div>
              )}
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
