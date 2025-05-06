"use client"

import { useState } from "react"
import { ErrorBoundary } from "@/components/error/error-boundary"
import { ErrorMessage } from "@/components/error/error-message"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { errorHandler } from "@/lib/error-handling"
import { useAsyncOperation } from "@/hooks/use-async-operation"

// A component that will throw an error
function BuggyComponent() {
  const [shouldError, setShouldError] = useState(false)

  if (shouldError) {
    throw new Error("This is a simulated error from the buggy component")
  }

  return (
    <div className="p-4 border rounded-md">
      <h3 className="font-medium mb-2">Error Boundary Test</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Click the button below to trigger an error that will be caught by the Error Boundary
      </p>
      <Button variant="destructive" onClick={() => setShouldError(true)}>
        Trigger Error
      </Button>
    </div>
  )
}

// Simulated API call that sometimes fails
const simulateApiCall = async (shouldFail: boolean) => {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  if (shouldFail) {
    throw new Error("API call failed")
  }

  return { success: true, data: "API call succeeded" }
}

export default function ErrorHandlingDebugPage() {
  const [showNetworkError, setShowNetworkError] = useState(false)

  // Use our async operation hook for error handling
  const { execute, isLoading, isError, error, retry } = useAsyncOperation(simulateApiCall, {
    context: "debug-page",
    autoRetry: false,
  })

  const handleApiCall = async (shouldFail: boolean) => {
    try {
      const result = await execute(shouldFail)
      alert(`API Result: ${JSON.stringify(result)}`)
    } catch (err) {
      // Error is already handled by the hook
    }
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Error Handling Debug Page</h1>
      <p className="text-muted-foreground mb-8">
        This page demonstrates the various error handling components and utilities.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Error Boundary</CardTitle>
            <CardDescription>Error boundaries catch errors in their child component tree</CardDescription>
          </CardHeader>
          <CardContent>
            <ErrorBoundary onError={(error, errorInfo) => errorHandler.handleError(error, {
              context: { section: "demo-error-boundary", componentStack: errorInfo.componentStack },
              severity: "high",
              code: "REACT_ERROR",
            })}>
              <BuggyComponent />
            </ErrorBoundary>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Error Message Component</CardTitle>
            <CardDescription>Various styles of error messages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ErrorMessage title="Critical Error" message="This is a critical error message" severity="critical" />

            <ErrorMessage title="Warning" message="This is a warning message" severity="medium" />

            <ErrorMessage title="Info" message="This is an informational message" severity="low" />

            <ErrorMessage
              title="With Actions"
              message="This message has retry and dismiss actions"
              severity="high"
              onRetry={() => alert("Retry action triggered")}
              onDismiss={() => alert("Dismiss action triggered")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Error Handler Service</CardTitle>
            <CardDescription>Trigger different types of errors via the central error handler</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  errorHandler.handleError("This is a low severity error", {
                    severity: "low",
                    code: "LOW_ERROR",
                  })
                }}
              >
                Low Severity
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  errorHandler.handleError("This is a medium severity error", {
                    severity: "medium",
                    code: "MEDIUM_ERROR",
                  })
                }}
              >
                Medium Severity
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  errorHandler.handleError("This is a high severity error", {
                    severity: "high",
                    code: "HIGH_ERROR",
                  })
                }}
              >
                High Severity
              </Button>

              <Button
                variant="destructive"
                onClick={() => {
                  errorHandler.handleError("This is a critical severity error", {
                    severity: "critical",
                    code: "CRITICAL_ERROR",
                  })
                }}
              >
                Critical Severity
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Error Handling Hook</CardTitle>
            <CardDescription>Demonstrate error handling with retry capabilities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={() => handleApiCall(false)} disabled={isLoading}>
                {isLoading ? "Loading..." : "Successful API Call"}
              </Button>

              <Button variant="destructive" onClick={() => handleApiCall(true)} disabled={isLoading}>
                {isLoading ? "Loading..." : "Failed API Call"}
              </Button>
            </div>

            {isError && (
              <ErrorMessage
                title="API Error"
                message={error?.message || "An unknown error occurred"}
                severity="high"
                onRetry={retry}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Network Status</CardTitle>
            <CardDescription>Test offline error handling</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowNetworkError(!showNetworkError)}>
              {showNetworkError ? "Hide" : "Show"} Network Error
            </Button>

            {showNetworkError && (
              <div className="mt-4">
                <ErrorMessage
                  variant="warning"
                  title="Network Error"
                  message="Simulated offline state. In a real app, this would appear automatically when offline."
                  retryLabel="Simulate Reconnect"
                  onRetry={() => setShowNetworkError(false)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
