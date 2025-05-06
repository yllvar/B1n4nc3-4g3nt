import { formatPrice } from "@/lib/utils"
import { ArrowDown, ArrowUp, TrendingDown, TrendingUp } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

interface CurrentPriceCardProps {
  price: number | null
  priceChange: number | null
  isLoading: boolean
}

export default function CurrentPriceCard({ price, priceChange, isLoading }: CurrentPriceCardProps) {
  if (isLoading || price === null || priceChange === null) {
    return (
      <Card className="overflow-hidden border bg-card text-card-foreground shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-32" />
            <div className="flex items-end gap-4 mt-2">
              <Skeleton className="h-12 w-40" />
              <Skeleton className="h-8 w-20 mb-1" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isPositive = priceChange >= 0
  const changeColor = isPositive ? "text-green-500" : "text-red-500"
  const changeColorBg = isPositive ? "bg-green-500/10" : "bg-red-500/10"
  const TrendIcon = isPositive ? TrendingUp : TrendingDown

  return (
    <Card className="overflow-hidden border bg-card text-card-foreground shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-muted-foreground">Current Price</h2>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${changeColorBg} ${changeColor}`}>
              {isPositive ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
              <span className="text-sm font-medium">{Math.abs(priceChange).toFixed(2)}%</span>
            </div>
          </div>

          <div className="flex items-end gap-3 mt-2">
            <div className="text-4xl font-bold tracking-tight tabular-nums">{formatPrice(price)}</div>
            <TrendIcon className={`h-6 w-6 mb-1 ${changeColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
