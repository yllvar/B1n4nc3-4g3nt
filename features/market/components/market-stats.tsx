import { formatPrice, formatValue } from "@/lib/utils"
import { ArrowDown, ArrowUp, TrendingDown, TrendingUp, BarChart3 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface MarketStatsProps {
  symbol: string
  highPrice: number | null
  lowPrice: number | null
  volume: number | null
  priceChange: number | null
  isLoading: boolean
}

export default function MarketStats({ symbol, highPrice, lowPrice, volume, priceChange, isLoading }: MarketStatsProps) {
  if (isLoading || highPrice === null || lowPrice === null || volume === null || priceChange === null) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg border bg-card/50">
            <Skeleton className="h-5 w-16 mb-3" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    )
  }

  const isPositive = priceChange >= 0
  const changeColor = isPositive ? "text-green-500" : "text-red-500"
  const TrendIcon = isPositive ? TrendingUp : TrendingDown

  const stats = [
    {
      label: "24h High",
      value: formatPrice(highPrice),
      icon: <ArrowUp className="h-4 w-4 text-green-500" />,
    },
    {
      label: "24h Low",
      value: formatPrice(lowPrice),
      icon: <ArrowDown className="h-4 w-4 text-red-500" />,
    },
    {
      label: "24h Volume",
      value: formatValue(volume),
      icon: <BarChart3 className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "24h Change",
      value: `${Math.abs(priceChange).toFixed(2)}%`,
      icon: <TrendIcon className={`h-4 w-4 ${changeColor}`} />,
      valueClass: changeColor,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="p-4 rounded-lg border bg-card/50">
          <div className="flex items-center gap-1.5 mb-2">
            {stat.icon}
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
          </div>
          <p className={`text-2xl font-semibold tabular-nums ${stat.valueClass || ""}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
