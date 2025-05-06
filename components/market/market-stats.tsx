import { formatPrice, formatValue } from "@/lib/utils"
import { ArrowDown, ArrowUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface MarketStatsProps {
  highPrice: number | null
  lowPrice: number | null
  volume: number | null
  priceChange: number | null
  isLoading: boolean
}

export default function MarketStats({ highPrice, lowPrice, volume, priceChange, isLoading }: MarketStatsProps) {
  if (isLoading || highPrice === null || lowPrice === null || volume === null || priceChange === null) {
    return <Skeleton className="h-[180px] w-full rounded-xl" />
  }

  const isPositive = priceChange >= 0

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Market Statistics</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">24h High</p>
              <p className="text-lg font-medium tabular-nums">{formatPrice(highPrice)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">24h Low</p>
              <p className="text-lg font-medium tabular-nums">{formatPrice(lowPrice)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">24h Volume</p>
              <p className="text-lg font-medium tabular-nums">{formatValue(volume)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">24h Change</p>
              <p
                className={`text-lg font-medium flex items-center gap-1 ${isPositive ? "text-green-500" : "text-red-500"}`}
              >
                {isPositive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                <span className="tabular-nums">{Math.abs(priceChange).toFixed(2)}%</span>
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
