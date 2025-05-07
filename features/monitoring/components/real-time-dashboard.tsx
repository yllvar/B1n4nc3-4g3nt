"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, CheckCircle, RefreshCw, WifiOff, Zap } from "lucide-react"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface RealTimeDashboardProps {
  refreshInterval?: number
}

export const RealTimeDashboard: React.FC<RealTimeDashboardProps> = ({ refreshInterval = 5000 }) => {
  const [activeTab, setActiveTab] = useState("overview")
  const [wsStatus, setWsStatus] = useState<string>("unknown")
  const [wsMetrics, setWsMetrics] = useState<any>({
    messageRate: 0,
    latency: 0,
    reconnects: 0,
    errors: 0,
    uptime: 0,
  })
  const [serviceStatus, setServiceStatus] = useState<"operational" | "degraded" | "down">("operational")
  const [cacheStats, setCacheStats] = useState<any>({
    size: 0,
    hitRate: 0,
    missRate: 0,
    evictions: 0,
    maxSize: 1000,
  })
  const [activeStreams, setActiveStreams] = useState<string[]>([])
  const [selectedStream, setSelectedStream] = useState<string>("")
  const [metricsHistory, setMetricsHistory] = useState<any[]>([])
  const [errorHistory, setErrorHistory] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Function to fetch WebSocket status
  const fetchWsStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/monitoring/websocket-status")
      const data = await response.json()
      setWsStatus(data.status)
      setWsMetrics({
        messageRate: data.messageRate || 0,
        latency: data.latency || 0,
        reconnects: data.reconnects || 0,
        errors: data.errors || 0,
        uptime: data.uptime || 0,
      })
      setActiveStreams(data.activeStreams || [])
    } catch (error) {
      console.error("Failed to fetch WebSocket status:", error)
      setWsStatus("error")
    }
  }, [])

  // Function to fetch cache statistics
  const fetchCacheStats = useCallback(async () => {
    try {
      const response = await fetch("/api/monitoring/cache-stats")
      const data = await response.json()
      setCacheStats({
        size: data.size || 0,
        hitRate: data.hitRate || 0,
        missRate: data.missRate || 0,
        evictions: data.evictions || 0,
        maxSize: data.maxSize || 1000,
      })
    } catch (error) {
      console.error("Failed to fetch cache statistics:", error)
    }
  }, [])

  // Function to fetch service status
  const fetchServiceStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/monitoring/service-status")
      const data = await response.json()
      setServiceStatus(data.status || "operational")
    } catch (error) {
      console.error("Failed to fetch service status:", error)
      setServiceStatus("down")
    }
  }, [])

  // Function to fetch metrics history
  const fetchMetricsHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/monitoring/metrics-history")
      const data = await response.json()
      setMetricsHistory(data.history || [])
    } catch (error) {
      console.error("Failed to fetch metrics history:", error)
    }
  }, [])

  // Function to fetch error history
  const fetchErrorHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/monitoring/error-history")
      const data = await response.json()
      setErrorHistory(data.errors || [])
    } catch (error) {
      console.error("Failed to fetch error history:", error)
    }
  }, [])

  // Function to refresh all data
  const refreshData = useCallback(async () => {
    setIsRefreshing(true)
    await Promise.all([
      fetchWsStatus(),
      fetchCacheStats(),
      fetchServiceStatus(),
      fetchMetricsHistory(),
      fetchErrorHistory(),
    ])
    setIsRefreshing(false)
  }, [fetchWsStatus, fetchCacheStats, fetchServiceStatus, fetchMetricsHistory, fetchErrorHistory])

  // Initialize data and set up subscriptions
  useEffect(() => {
    // Initial data fetch
    refreshData()

    // Set up interval for periodic refresh
    const intervalId = setInterval(refreshData, refreshInterval)

    // Set up WebSocket subscription for real-time updates
    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_BINANCE_API_BASE_URL?.replace("https", "wss") || "wss://api.binance.com"}/ws/monitoring`,
    )

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === "wsStatus") {
        setWsStatus(data.status)
        setWsMetrics((prev) => ({
          ...prev,
          ...data.metrics,
        }))
      } else if (data.type === "cacheStats") {
        setCacheStats((prev) => ({
          ...prev,
          ...data.stats,
        }))
      } else if (data.type === "serviceStatus") {
        setServiceStatus(data.status)
      } else if (data.type === "error") {
        setErrorHistory((prev) => [data.error, ...prev].slice(0, 100))
      }
    }

    ws.onerror = () => {
      console.error("WebSocket connection error")
    }

    // Clean up on unmount
    return () => {
      clearInterval(intervalId)
      ws.close()
    }
  }, [refreshData, refreshInterval])

  // Handle stream selection
  const handleStreamSelect = (stream: string) => {
    setSelectedStream(stream)
    // Fetch stream-specific data here
  }

  // Render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="w-4 h-4 mr-1" /> Connected
          </Badge>
        )
      case "connecting":
        return (
          <Badge className="bg-yellow-500">
            <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Connecting
          </Badge>
        )
      case "disconnected":
        return (
          <Badge className="bg-red-500">
            <WifiOff className="w-4 h-4 mr-1" /> Disconnected
          </Badge>
        )
      case "error":
        return (
          <Badge className="bg-red-500">
            <AlertCircle className="w-4 h-4 mr-1" /> Error
          </Badge>
        )
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>
    }
  }

  // Render service status badge
  const renderServiceStatus = (status: "operational" | "degraded" | "down") => {
    switch (status) {
      case "operational":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="w-4 h-4 mr-1" /> Operational
          </Badge>
        )
      case "degraded":
        return (
          <Badge className="bg-yellow-500">
            <AlertCircle className="w-4 h-4 mr-1" /> Degraded
          </Badge>
        )
      case "down":
        return (
          <Badge className="bg-red-500">
            <AlertCircle className="w-4 h-4 mr-1" /> Down
          </Badge>
        )
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Real-Time Monitoring Dashboard</h1>
        <Button onClick={refreshData} disabled={isRefreshing} className="flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="websocket">WebSocket</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>WebSocket Status</CardTitle>
                <CardDescription>Current connection status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-24">
                  {renderStatusBadge(wsStatus)}
                  <p className="mt-2 text-sm text-gray-500">
                    {wsMetrics.uptime > 0
                      ? `Uptime: ${Math.floor(wsMetrics.uptime / 60)}m ${wsMetrics.uptime % 60}s`
                      : "Not connected"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Service Status</CardTitle>
                <CardDescription>Overall system health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-24">
                  {renderServiceStatus(serviceStatus)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Cache Usage</CardTitle>
                <CardDescription>Current cache utilization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-24">
                  <Progress value={(cacheStats.size / cacheStats.maxSize) * 100} className="w-full" />
                  <p className="mt-2 text-sm text-gray-500">
                    {cacheStats.size} / {cacheStats.maxSize} entries (
                    {Math.round((cacheStats.size / cacheStats.maxSize) * 100)}%)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ChartContainer
                  config={{
                    messageRate: {
                      label: "Message Rate (msg/s)",
                      color: "hsl(var(--chart-1))",
                    },
                    latency: {
                      label: "Latency (ms)",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metricsHistory}>
                      <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="messageRate"
                        stroke="var(--color-messageRate)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="latency"
                        stroke="var(--color-latency)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WebSocket Tab */}
        <TabsContent value="websocket" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>WebSocket Metrics</CardTitle>
              <CardDescription>Real-time connection statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col items-center p-4 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-500">Message Rate</span>
                  <span className="text-2xl font-bold">{wsMetrics.messageRate.toFixed(2)}/s</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-500">Latency</span>
                  <span className="text-2xl font-bold">{wsMetrics.latency.toFixed(2)} ms</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-500">Reconnects</span>
                  <span className="text-2xl font-bold">{wsMetrics.reconnects}</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-500">Errors</span>
                  <span className="text-2xl font-bold">{wsMetrics.errors}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Streams</CardTitle>
              <CardDescription>Currently active WebSocket streams</CardDescription>
            </CardHeader>
            <CardContent>
              {activeStreams.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No active streams</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {activeStreams.map((stream) => (
                    <Button
                      key={stream}
                      variant={selectedStream === stream ? "default" : "outline"}
                      onClick={() => handleStreamSelect(stream)}
                      className="justify-start"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      {stream}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedStream && (
            <Card>
              <CardHeader>
                <CardTitle>Stream Details: {selectedStream}</CardTitle>
                <CardDescription>Detailed metrics for the selected stream</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-60">
                  <ChartContainer
                    config={{
                      messageRate: {
                        label: "Message Rate (msg/s)",
                        color: "hsl(var(--chart-1))",
                      },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metricsHistory.filter((m) => m.stream === selectedStream)}>
                        <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line
                          type="monotone"
                          dataKey="messageRate"
                          stroke="var(--color-messageRate)"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Cache Tab */}
        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cache Statistics</CardTitle>
              <CardDescription>Performance metrics for the data cache</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col items-center p-4 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-500">Hit Rate</span>
                  <span className="text-2xl font-bold">{cacheStats.hitRate.toFixed(2)}%</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-500">Miss Rate</span>
                  <span className="text-2xl font-bold">{cacheStats.missRate.toFixed(2)}%</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-500">Evictions</span>
                  <span className="text-2xl font-bold">{cacheStats.evictions}</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-500">Size</span>
                  <span className="text-2xl font-bold">
                    {cacheStats.size} / {cacheStats.maxSize}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cache Performance</CardTitle>
              <CardDescription>Hit/miss rates over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-60">
                <ChartContainer
                  config={{
                    hitRate: {
                      label: "Hit Rate (%)",
                      color: "hsl(var(--chart-1))",
                    },
                    missRate: {
                      label: "Miss Rate (%)",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metricsHistory}>
                      <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="hitRate"
                        stroke="var(--color-hitRate)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="missRate"
                        stroke="var(--color-missRate)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error History</CardTitle>
              <CardDescription>Recent errors and exceptions</CardDescription>
            </CardHeader>
            <CardContent>
              {errorHistory.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No errors recorded</p>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {errorHistory.map((error, index) => (
                    <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                          <span className="font-medium">{error.type || "Error"}</span>
                        </div>
                        <span className="text-xs text-gray-500">{new Date(error.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="mt-2 text-sm">{error.message}</p>
                      {error.context && (
                        <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono overflow-x-auto">
                          <pre>{JSON.stringify(error.context, null, 2)}</pre>
                        </div>
                      )}
                      {error.stack && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer">Stack Trace</summary>
                          <div className="mt-1 p-2 bg-gray-100 rounded text-xs font-mono overflow-x-auto">
                            <pre>{error.stack}</pre>
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default RealTimeDashboard
