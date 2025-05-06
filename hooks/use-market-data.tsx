"use client"

import { useContext } from "react"
import { MarketDataContext } from "@/lib/market/market-data-provider"

export function useMarketData() {
  const context = useContext(MarketDataContext)

  if (!context) {
    throw new Error("useMarketData must be used within a MarketDataProvider")
  }

  return context
}
