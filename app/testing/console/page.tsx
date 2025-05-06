"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { testRunner } from "@/lib/testing/console-test-runner"
import { websocketTests } from "@/lib/testing/websocket-tests"

export default function ConsoleTestPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<any>(null)

  // Register test suites
  useState(() => {
    testRunner.registerSuite("WebSocket", websocketTests)
  })

  const runTests = async () => {
    setIsRunning(true)
    setResults(null)

    try {
      const testResults = await testRunner.runAll()
      setResults(testResults)
    } catch (error) {
      console.error("Error running tests:", error)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Console Test Runner</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Browser Console Tests</CardTitle>
          <CardDescription>Run tests and view detailed results in the browser console</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runTests} disabled={isRunning} className="w-full">
            {isRunning ? "Running Tests..." : "Run All Tests"}
          </Button>

          <div className="mt-4 text-sm text-muted-foreground">
            <p>Open your browser console (F12 or Cmd+Option+I) to see detailed test results.</p>
          </div>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(results).map(([suiteName, suiteResults]: [string, any[]]) => {
                const totalTests = suiteResults.length
                const passedTests = suiteResults.filter((r) => r.passed).length
                const passPercentage = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0

                return (
                  <div key={suiteName} className="border rounded-md p-4">
                    <h3 className="text-lg font-medium mb-2">{suiteName}</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="text-sm px-2 py-1 rounded bg-green-100 text-green-800">{passedTests} Passed</div>
                      <div className="text-sm px-2 py-1 rounded bg-red-100 text-red-800">
                        {totalTests - passedTests} Failed
                      </div>
                      <div className="text-sm px-2 py-1 rounded bg-blue-100 text-blue-800">{passPercentage}%</div>
                    </div>

                    <div className="space-y-2">
                      {suiteResults.map((result, index) => (
                        <div
                          key={index}
                          className={`p-2 rounded-md text-sm ${
                            result.passed ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                          }`}
                        >
                          <div className="flex justify-between">
                            <span>{result.name}</span>
                            <span>{result.duration}ms</span>
                          </div>
                          {!result.passed && result.error && (
                            <p className="text-xs mt-1 text-red-600">{result.error.message}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
