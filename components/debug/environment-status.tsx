"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

export function EnvironmentStatus() {
  const [envVars, setEnvVars] = useState<Record<string, string | undefined>>({})

  useEffect(() => {
    // Collect all environment variables that are accessible to the client
    setEnvVars({
      BINANCE_API_BASE_URL: process.env.BINANCE_API_BASE_URL,
      BINANCE_WS_BASE_URL: process.env.BINANCE_WS_BASE_URL,
      NEXT_PUBLIC_BINANCE_API_BASE_URL: process.env.NEXT_PUBLIC_BINANCE_API_BASE_URL,
      NODE_ENV: process.env.NODE_ENV,
    })
  }, [])

  const missingVars = Object.entries(envVars)
    .filter(([key, value]) => !value && key.startsWith("NEXT_PUBLIC_"))
    .map(([key]) => key)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Environment Status</CardTitle>
        <CardDescription>Current environment configuration</CardDescription>
      </CardHeader>
      <CardContent>
        {missingVars.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Missing Environment Variables</AlertTitle>
            <AlertDescription>
              The following public environment variables are missing:
              <ul className="mt-2 list-disc pl-5">
                {missingVars.map((variable) => (
                  <li key={variable}>{variable}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Available Environment Variables:</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(envVars).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between rounded border p-2">
                <span className="text-xs font-mono">{key}</span>
                <Badge variant={value ? "default" : "destructive"}>{value ? "Available" : "Missing"}</Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
