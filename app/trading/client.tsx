"use client"

import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { MarketDataProvider } from "@/features/market/providers/market-data-provider"
import dynamic from "next/dynamic"

// Import TradingDashboard with no SSR to prevent prerendering issues
const TradingDashboard = dynamic(() => import("@/features/trading/components/trading-dashboard"), { ssr: false })

export default function TradingClient({ symbol = "solusdt" }: { symbol?: string }) {
  return (
    <MarketDataProvider symbol={symbol}>
      <Suspense fallback={<Skeleton className="h-[600px] w-full rounded-xl" />}>
        <TradingDashboard symbol={symbol} />
      </Suspense>
    </MarketDataProvider>
  )
}
