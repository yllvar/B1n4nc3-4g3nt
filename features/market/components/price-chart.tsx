"use client"

import { useState, useMemo } from "react"
import { ResponsiveChart } from "@/features/charts/components/responsive-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPrice } from "@/lib/utils"

interface PriceChartProps {
  data: any[]
  isLoading: boolean
  symbol?: string
}

export function PriceChart({ data, isLoading, symbol = "SOLUSDT" }: PriceChartProps) {
  const [timeframe, setTimeframe] = useState<"1h" | "4h" | "1d" | "1w">("1h")

  const chartConfig = useMemo(
    () => ({
      xAxisKey: "time",
      xAxisFormatter: (value: number) => {
        const date = new Date(value)
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      },
      yAxisFormatter: (value: number) => formatPrice(value),
      tooltipFormatter: (value: number) => formatPrice(value),
      series: [
        {
          key: "price",
          name: "Price",
          type: "area",
          color: "#3b82f6",
          strokeWidth: 2,
          fillOpacity: 0.1,
        },
      ],
      grid: true,
    }),
    [],
  )

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Price Chart</span>
            <Skeleton className="h-8 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{symbol} Price Chart</CardTitle>
          <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="1h" className="text-xs px-2">
                1H
              </TabsTrigger>
              <TabsTrigger value="4h" className="text-xs px-2">
                4H
              </TabsTrigger>
              <TabsTrigger value="1d" className="text-xs px-2">
                1D
              </TabsTrigger>
              <TabsTrigger value="1w" className="text-xs px-2">
                1W
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveChart data={data} config={chartConfig} height={300} />
      </CardContent>
    </Card>
  )
}
