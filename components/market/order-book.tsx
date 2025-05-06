import { formatPrice } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface OrderBookEntry {
  price: number
  quantity: number
}

interface OrderBookProps {
  data: {
    bids: OrderBookEntry[]
    asks: OrderBookEntry[]
  }
  isLoading: boolean
}

export default function OrderBook({ data, isLoading }: OrderBookProps) {
  if (isLoading || !data.bids.length || !data.asks.length) {
    return <Skeleton className="h-[120px] w-full" />
  }

  // Find the max quantity to calculate width percentages
  const maxQuantity = Math.max(...data.bids.map((bid) => bid.quantity), ...data.asks.map((ask) => ask.quantity))

  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Price</span>
          <span>Size</span>
        </div>
        {data.bids.slice(0, 5).map((bid, index) => (
          <div key={index} className="relative">
            <div
              className="absolute inset-0 bg-green-500/10 rounded-sm"
              style={{ width: `${(bid.quantity / maxQuantity) * 100}%` }}
            />
            <div className="relative flex justify-between z-10">
              <span className="font-medium text-green-500">{formatPrice(bid.price)}</span>
              <span className="tabular-nums">{bid.quantity.toFixed(3)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Price</span>
          <span>Size</span>
        </div>
        {data.asks.slice(0, 5).map((ask, index) => (
          <div key={index} className="relative">
            <div
              className="absolute inset-0 bg-red-500/10 rounded-sm"
              style={{ width: `${(ask.quantity / maxQuantity) * 100}%` }}
            />
            <div className="relative flex justify-between z-10">
              <span className="font-medium text-red-500">{formatPrice(ask.price)}</span>
              <span className="tabular-nums">{ask.quantity.toFixed(3)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
