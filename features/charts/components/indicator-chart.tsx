"use client"

import { useMemo } from "react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { calculateEMA, calculateVWAP, calculateATR } from "@/lib/indicators/technical-indicators"

interface IndicatorChartProps {
  data: {
    timestamp: number
    open: number
    high: number
    low: number
    close: number
    volume: number
  }[]
  indicators: {
    ema?: boolean
    vwap?: boolean
    atr?: boolean
    emaPeriod?: number
    vwapPeriod?: number
    atrPeriod?: number
  }
  height?: number
  loading?: boolean
  className?: string
}

export function IndicatorChart({
  data,
  indicators = {
    ema: true,
    vwap: true,
    atr: false,
    emaPeriod: 9,
    vwapPeriod: 20,
    atrPeriod: 14,
  },
  height = 300,
  loading = false,
  className,
}: IndicatorChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []

    // Extract price data
    const closes = data.map((d) => d.close)
    const highs = data.map((d) => d.high)
    const lows = data.map((d) => d.low)
    const volumes = data.map((d) => d.volume)

    // Calculate typical prices for VWAP
    const typicalPrices = data.map((d) => (d.high + d.low + d.close) / 3)

    // Calculate indicators
    const emaValues = indicators.ema ? calculateEMA(closes, indicators.emaPeriod || 9) : Array(data.length).fill(null)

    const vwapValues = indicators.vwap
      ? calculateVWAP(typicalPrices, volumes, indicators.vwapPeriod || 20)
      : Array(data.length).fill(null)

    const atrValues = indicators.atr
      ? calculateATR(highs, lows, closes, indicators.atrPeriod || 14)
      : Array(data.length).fill(null)

    // Combine data with indicators
    return data.map((d, i) => ({
      timestamp: d.timestamp,
      price: d.close,
      ema: emaValues[i],
      vwap: vwapValues[i],
      atr: atrValues[i],
    }))
  }, [data, indicators])

  const chartConfig = {
    price: {
      label: "Price",
      color: "hsl(var(--chart-1))",
    },
    ema: {
      label: `EMA(${indicators.emaPeriod || 9})`,
      color: "hsl(var(--chart-2))",
    },
    vwap: {
      label: `VWAP(${indicators.vwapPeriod || 20})`,
      color: "hsl(var(--chart-3))",
    },
    atr: {
      label: `ATR(${indicators.atrPeriod || 14})`,
      color: "hsl(var(--chart-4))",
    },
  }

  if (loading || chartData.length === 0) {
    return <Skeleton className={`h-[${height}px] w-full`} />
  }

  return (
    <ChartContainer config={chartConfig} className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(value) => new Date(value).toLocaleTimeString()}
            axisLine={false}
            tickLine={false}
            minTickGap={30}
          />
          <YAxis axisLine={false} tickLine={false} width={40} domain={["auto", "auto"]} />
          <Tooltip content={<ChartTooltipContent />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="price"
            stroke="var(--color-price)"
            dot={false}
            strokeWidth={2}
            activeDot={{ r: 4 }}
          />
          {indicators.ema && (
            <Line type="monotone" dataKey="ema" stroke="var(--color-ema)" dot={false} strokeWidth={2} />
          )}
          {indicators.vwap && (
            <Line type="monotone" dataKey="vwap" stroke="var(--color-vwap)" dot={false} strokeWidth={2} />
          )}
          {indicators.atr && (
            <Line type="monotone" dataKey="atr" stroke="var(--color-atr)" dot={false} strokeWidth={2} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
