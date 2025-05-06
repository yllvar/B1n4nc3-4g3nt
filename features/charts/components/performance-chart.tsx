"use client"

import { useMemo } from "react"
import { ResponsiveChart } from "@/features/charts/components/responsive-chart"
import type { WebSocketMetrics } from "@/features/websocket/lib/websocket-monitor"

interface PerformanceChartProps {
  data: Array<WebSocketMetrics & { timestamp: number }>
  type: "messageRate" | "latency" | "errors"
  isLoading?: boolean
  height?: number
  className?: string
}

export function PerformanceChart({ data, type, isLoading = false, height = 200, className }: PerformanceChartProps) {
  const chartConfig = useMemo(() => {
    if (type === "messageRate") {
      return {
        xAxisKey: "timestamp",
        xAxisFormatter: (value: number) => new Date(value).toLocaleTimeString(),
        series: [
          {
            key: "messageRate",
            name: "Message Rate",
            type: "area",
            color: "hsl(var(--chart-1))",
          },
        ],
        grid: true,
      }
    } else if (type === "latency") {
      return {
        xAxisKey: "timestamp",
        xAxisFormatter: (value: number) => new Date(value).toLocaleTimeString(),
        series: [
          {
            key: "pingLatency",
            name: "Ping Latency",
            type: "line",
            color: "hsl(var(--chart-2))",
          },
          {
            key: "averageLatency",
            name: "Avg Latency",
            type: "line",
            color: "hsl(var(--chart-3))",
          },
        ],
        grid: true,
      }
    } else {
      return {
        xAxisKey: "timestamp",
        xAxisFormatter: (value: number) => new Date(value).toLocaleTimeString(),
        series: [
          {
            key: "errorCount",
            name: "Errors",
            type: "bar",
            color: "hsl(var(--destructive))",
          },
          {
            key: "dataGaps",
            name: "Data Gaps",
            type: "bar",
            color: "hsl(var(--amber-500))",
          },
          {
            key: "staleDataEvents",
            name: "Stale Data",
            type: "bar",
            color: "hsl(var(--chart-4))",
          },
        ],
        grid: true,
      }
    }
  }, [type])

  return (
    <ResponsiveChart
      data={data}
      config={chartConfig as any}
      height={height}
      loading={isLoading || !data.length}
      className={className}
    />
  )
}
