"use client"

import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import testing from "@/lib/testing/global-test-helpers"

export default function TestHelpersPage() {
  useEffect(() => {
    // Make sure testing helpers are available in window
    if (typeof window !== "undefined") {
      ;(window as any).testing = testing
      console.log("Testing utilities available at window.testing")
    }
  }, [])

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Test Helpers</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Browser Console Test Helpers</CardTitle>
          <CardDescription>
            Use these helpers to test your WebSocket implementation from the browser console
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-md">
              <h3 className="text-lg font-medium mb-2">Available Commands</h3>
              <pre className="text-sm overflow-auto p-2 bg-muted/50 rounded">
                {`// Run all tests
window.testing.runner.runAll()

// Test connection
window.testing.testConnection()

// Test subscription
window.testing.testSubscription("btcusdt", "trade")

// Test error handling
window.testing.testErrorHandling()

// Assertions
window.testing.assert(condition, message)
window.testing.assertEquals(actual, expected, message)`}
              </pre>
            </div>

            <p className="text-sm text-muted-foreground">
              Open your browser console (F12 or Cmd+Option+I) and try these commands.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
