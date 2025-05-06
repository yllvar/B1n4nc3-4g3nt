"use client"

import { useMarketData } from "@/features/market/hooks/use-market-data"
import { useKlineData } from "@/features/market/hooks/use-kline-data"
import MarketStats from "@/features/market/components/market-stats"
import ScalpingSignal from "@/features/trading/components/scalping-signal"
import { Card, CardContent } from "@/components/ui/card"
import CurrentPriceCard from "@/features/market/components/current-price-card"
import { useMediaQuery } from "@/hooks/use-media-query"
import TechnicalIndicators from "@/features/market/components/technical-indicators"
import { memo, useMemo } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Memoized sub-components to prevent unnecessary re-renders
const MemoizedCurrentPriceCard = memo(CurrentPriceCard)
const MemoizedMarketStats = memo(MarketStats)
const MemoizedScalpingSignal = memo(ScalpingSignal)

interface MarketDashboardProps {
  symbol: string
}

export function MarketDashboard({ symbol }: MarketDashboardProps) {
  const { price, ticker, isLoading, error, refreshData } = useMarketData({ symbol })
  const priceChangePercent = ticker?.priceChangePercent || null
  const highPrice = ticker?.highPrice || null
  const lowPrice = ticker?.lowPrice || null
  const volume = ticker?.volume || null

  const { klineData: rawKlineData, isLoading: isLoadingKlines } = useKlineData({ symbol, interval: "1m", limit: 30 })
  const klineData = rawKlineData?.map(k => ({
    ...k,
    quoteVolume: 0,
    takerBuyBaseVolume: 0,
    takerBuyQuoteVolume: 0
  })) || []
  const isMobile = useMediaQuery("(max-width: 640px)")

  // Memoize the error component to prevent re-renders
  const errorComponent = useMemo(() => {
    if (!error) return null

    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive opacity-80" />
          <div>
            <h3 className="text-xl font-semibold text-destructive">Connection Error</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">{error.message}</p>
          </div>
          <Button onClick={() => window.location.reload()} className="mt-2">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Connection
          </Button>
        </CardContent>
      </Card>
    )
  }, [error])

  if (error) {
    return errorComponent
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{symbol || "SOLUSDT"} Market</h1>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <LoadingSpinner size="sm" />
            <span className="text-sm">Updating...</span>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={refreshData} className="gap-1">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        )}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MemoizedCurrentPriceCard price={price} priceChange={priceChangePercent} isLoading={isLoading} />
        </div>

        <div>
          <MemoizedScalpingSignal klineData={klineData} isLoading={isLoadingKlines} />
        </div>
      </div>

      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="stats">Market Stats</TabsTrigger>
          <TabsTrigger value="technical">Technical Analysis</TabsTrigger>
        </TabsList>
        <TabsContent value="stats">
          <Card>
            <CardContent className="pt-6">
              <MemoizedMarketStats
                symbol={symbol || "SOLUSDT"}
                highPrice={highPrice}
                lowPrice={lowPrice}
                volume={volume}
                priceChange={priceChangePercent}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="technical">
          <Card>
            <CardContent className="pt-6">
              <TechnicalIndicators symbol={symbol || "SOLUSDT"} interval={isMobile ? "15m" : "1h"} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
