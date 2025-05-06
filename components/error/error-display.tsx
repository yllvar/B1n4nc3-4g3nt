"use client"

import { useErrorHandling } from "@/hooks/use-error-handling"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, AlertCircle, Info, X, RefreshCw, Wifi, WifiOff } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ErrorDisplayProps {
  title?: string
  showControls?: boolean
  maxHeight?: string
  limit?: number
  filterBySeverity?: ("low" | "medium" | "high" | "critical")[]
  filterByCode?: string[]
  className?: string
}

export function ErrorDisplay({
  title = "System Notifications",
  showControls = true,
  maxHeight = "300px",
  limit,
  filterBySeverity,
  filterByCode,
  className = "",
}: ErrorDisplayProps) {
  const { errors, hasErrors, hasCriticalErrors, clearErrors, retryRecoverableErrors, dismissError, isNetworkOnline } =
    useErrorHandling({
      filterBySeverity,
      filterByCode,
      limit,
    })

  if (!hasErrors && !showControls) {
    return null
  }

  return (
    <Card className={`border ${hasCriticalErrors ? "border-red-300" : ""} ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{title}</CardTitle>
            {hasErrors && (
              <Badge variant={hasCriticalErrors ? "destructive" : "outline"}>
                {errors.length} {errors.length === 1 ? "issue" : "issues"}
              </Badge>
            )}
          </div>
          {isNetworkOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
        </div>
        <CardDescription>
          {hasErrors ? "The following issues were detected in the system" : "No issues detected"}
        </CardDescription>
      </CardHeader>
      {hasErrors && (
        <CardContent>
          <ScrollArea className={`pr-4 ${maxHeight ? `max-h-[${maxHeight}]` : ""}`}>
            <div className="space-y-3">
              {errors.map((error, index) => (
                <div
                  key={`${error.code}-${index}`}
                  className={`p-3 rounded-md flex items-start justify-between ${
                    error.severity === "critical"
                      ? "bg-red-50 border-l-4 border-red-500"
                      : error.severity === "high"
                        ? "bg-amber-50 border-l-4 border-amber-500"
                        : error.severity === "medium"
                          ? "bg-blue-50 border-l-4 border-blue-500"
                          : "bg-gray-50 border-l-4 border-gray-500"
                  }`}
                >
                  <div className="flex gap-3">
                    {error.severity === "critical" ? (
                      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    ) : error.severity === "high" ? (
                      <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-medium text-sm">
                        {error.code}{" "}
                        <span className="text-xs text-gray-500">
                          ({new Date(error.timestamp).toLocaleTimeString()})
                        </span>
                      </div>
                      <div className="text-sm mt-1">{error.message}</div>
                      {error.context && (
                        <div className="text-xs text-gray-500 mt-1">
                          {Object.entries(error.context)
                            .filter(([key]) => key !== "stack")
                            .map(([key, value]) => (
                              <div key={key}>
                                <span className="font-medium">{key}:</span>{" "}
                                {typeof value === "object" ? JSON.stringify(value) : String(value)}
                              </div>
                            ))}
                        </div>
                      )}
                      {error.retryAction && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => error.retryAction && error.retryAction()}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" /> Retry
                        </Button>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 rounded-full"
                    onClick={() => dismissError(index)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Dismiss</span>
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      )}
      {showControls && (hasErrors || !isNetworkOnline) && (
        <CardFooter className="flex justify-between pt-2">
          <Button variant="outline" size="sm" onClick={clearErrors}>
            Clear all
          </Button>
          <Button size="sm" onClick={retryRecoverableErrors}>
            <RefreshCw className="h-4 w-4 mr-2" /> Retry recoverable
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
