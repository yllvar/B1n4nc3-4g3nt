"\"use client"

import { useMemo } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"

interface ChartSeries {
  key: string
  name: string
  type: "line" | "area" | "bar"
  color: string
  strokeWidth?: number
  fillOpacity?: number
}

interface ChartConfig {
  xAxisKey: string
  xAxisFormatter?: (value: any) => string
  yAxisFormatter?: (value: any) => string
  tooltipFormatter?: (value: number, name: string) => string | number
  series: ChartSeries[]
  grid?: boolean
  brush?: boolean
  pan?: boolean
  zoom?: boolean
}

interface ResponsiveChartProps {
  data: any[]
  config: ChartConfig
  height?: number
  loading?: boolean
  className?: string
}

export function ResponsiveChart({ data, config, height = 300, loading = false, className }: ResponsiveChartProps) {
  const chartConfig = useMemo(() => {
    return config.series.reduce(
      (acc, series) => {
        acc[series.key] = {
          label: series.name,
          color: series.color,
        }
        return acc
      },
      {} as Record<string, { label: string; color: string }>,
    )
  }, [config.series])

  if (loading) {
    return <Skeleton className={`h-[${height}px] w-full`} />
  }

  // Determine chart type based on the first series
  const chartType = config.series[0]?.type || "line"

  return (
    <ChartContainer config={chartConfig} className={className}>
      <ResponsiveContainer width="100%" height={height}>
        {chartType === "line" ? (
          <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            {config.grid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis
              dataKey={config.xAxisKey}
              tickFormatter={config.xAxisFormatter}
              axisLine={false}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<ChartTooltipContent />} formatter={config.tooltipFormatter} />
            <Legend />
            {config.series.map((series) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                stroke={`var(--color-${series.key})`}
                strokeWidth={series.strokeWidth || 2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        ) : chartType === "area" ? (
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            {config.grid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis
              dataKey={config.xAxisKey}
              tickFormatter={config.xAxisFormatter}
              axisLine={false}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<ChartTooltipContent />} formatter={config.tooltipFormatter} />
            <Legend />
            {config.series.map((series) => (
              <Area
                key={series.key}
                type="monotone"
                dataKey={series.key}
                stroke={`var(--color-${series.key})`}
                fill={`var(--color-${series.key})`}
                fillOpacity={series.fillOpacity || 0.2}
                strokeWidth={series.strokeWidth || 2}
              />
            ))}
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            {config.grid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis
              dataKey={config.xAxisKey}
              tickFormatter={config.xAxisFormatter}
              axisLine={false}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<ChartTooltipContent />} formatter={config.tooltipFormatter} />
            <Legend />
            {config.series.map((series) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                fill={`var(--color-${series.key})`}
                fillOpacity={series.fillOpacity || 0.8}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </ChartContainer>
  )
}
