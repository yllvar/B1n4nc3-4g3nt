import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { MarketDataProvider } from "@/features/market/providers/market-data-provider"
import TradingDashboard from "@/features/trading/components/trading-dashboard"

export default function TradingPage() {
  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8 bg-background">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-6">SOL/USDT Scalping Strategy</h1>

        <MarketDataProvider symbol="solusdt">
          <Suspense fallback={<Skeleton className="h-[600px] w-full rounded-xl" />}>
            <TradingDashboard />
          </Suspense>
        </MarketDataProvider>
      </div>
    </main>
  )
}
