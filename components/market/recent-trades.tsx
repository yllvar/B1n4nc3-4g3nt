import { formatPrice, formatTime } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface Trade {
  id: number
  price: number
  quantity: number
  time: number
  isBuyerMaker: boolean
}

interface RecentTradesProps {
  data: Trade[]
  isLoading: boolean
}

export default function RecentTrades({ data, isLoading }: RecentTradesProps) {
  if (isLoading || !data.length) {
    return <Skeleton className="h-[300px] w-full" />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="pb-2 text-left font-medium">Price</th>
            <th className="pb-2 text-right font-medium">Amount</th>
            <th className="pb-2 text-right font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {data.map((trade) => (
            <tr key={trade.id} className="border-b border-muted/20 last:border-0">
              <td className={`py-2 text-left ${trade.isBuyerMaker ? "text-red-500" : "text-green-500"}`}>
                {formatPrice(trade.price)}
              </td>
              <td className="py-2 text-right tabular-nums">{trade.quantity.toFixed(4)}</td>
              <td className="py-2 text-right text-muted-foreground">{formatTime(trade.time)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
