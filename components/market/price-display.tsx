import { formatPrice } from "@/lib/utils"
import { ArrowDown, ArrowUp } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface PriceDisplayProps {
  price: number | null
  priceChange: number | null
  isLoading: boolean
}

export default function PriceDisplay({ price, priceChange, isLoading }: PriceDisplayProps) {
  if (isLoading || price === null || priceChange === null) {
    return <Skeleton className="h-10 w-32" />
  }

  const isPositive = priceChange >= 0

  return (
    <div className="flex items-center gap-2">
      <div className="text-2xl font-bold tabular-nums">{formatPrice(price)}</div>
      <div className={`flex items-center ${isPositive ? "text-green-500" : "text-red-500"}`}>
        {isPositive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
        <span className="font-medium tabular-nums">{Math.abs(priceChange).toFixed(2)}%</span>
      </div>
    </div>
  )
}
