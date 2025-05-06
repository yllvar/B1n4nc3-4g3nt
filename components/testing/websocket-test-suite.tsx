"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { WebSocketConnectionTest } from "./websocket-connection-test"
import { WebSocketDataTest } from "./websocket-data-test"
import { WebSocketReconnectionTest } from "./websocket-reconnection-test"
import { WebSocketErrorHandlingTest } from "./websocket-error-handling-test"

export function WebSocketTestSuite() {
  const [results, setResults] = useState<{
    passed: number
    failed: number
    total: number
  }>({
    passed: 0,
    failed: 0,
    total: 0,
  })

  const updateResults = (passed: number, failed: number) => {
    setResults({
      passed,
      failed,
      total: passed + failed,
    })
  }

  const runAllTests = () => {
    // This would trigger all test components to run their tests
    document.querySelectorAll('[data-testrunner="true"]').forEach((el) => {
      const button = el.querySelector('button[data-action="run-tests"]')
      if (button) {
        ;(button as HTMLButtonElement).click()
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>WebSocket Test Suite</span>
            <div className="flex items-center gap-2">
              <span className="text-sm px-3 py-1 rounded-full bg-green-100 text-green-800">
                {results.passed} Passed
              </span>
              <span className="text-sm px-3 py-1 rounded-full bg-red-100 text-red-800">{results.failed} Failed</span>
              <span className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-800">{results.total} Total</span>
            </div>
          </CardTitle>
          <CardDescription>Run tests to verify WebSocket functionality</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runAllTests} className="w-full mb-4">
            Run All Tests
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="connection">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="connection">Connection Tests</TabsTrigger>
          <TabsTrigger value="data">Data Tests</TabsTrigger>
          <TabsTrigger value="reconnection">Reconnection Tests</TabsTrigger>
          <TabsTrigger value="error">Error Handling</TabsTrigger>
        </TabsList>
        <TabsContent value="connection">
          <WebSocketConnectionTest onResultsUpdate={updateResults} />
        </TabsContent>
        <TabsContent value="data">
          <WebSocketDataTest onResultsUpdate={updateResults} />
        </TabsContent>
        <TabsContent value="reconnection">
          <WebSocketReconnectionTest onResultsUpdate={updateResults} />
        </TabsContent>
        <TabsContent value="error">
          <WebSocketErrorHandlingTest onResultsUpdate={updateResults} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
