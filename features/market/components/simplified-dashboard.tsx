"use client"

import { useMarketData } from "@/features/market/hooks/use-market-data"
import { useKlineData } from "@/features/market/hooks/use-kline-data"
import CurrentPriceCard from "@/features/market/components/current-price-card"
import MarketStats from "@/features/market/components/market-stats"
import ScalpingSignal from "@/features/trading/components/scalping-signal"
import { Card, CardContent } from "@/components/ui/card"
import { ResponsiveContainer } from "@/components/layout/responsive-container"
import { ResponsiveGrid } from "@/components/layout/responsive-grid"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SimplifiedDashboard() {
  const { symbol, currentPrice, priceChangePercent, highPrice, lowPrice, volume, isLoading, error, refresh } =
    useMarketData()

  const { klineData, isLoading: isLoadingKlines } = useKlineData({ interval: "1m", limit: 30 })

  if (error) {
    return (
      <ResponsiveContainer>
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
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{symbol || "SOLUSDT"} Market</h1>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <LoadingSpinner size="sm" />
              <span className="text-sm">Updating...</span>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={refresh} className="gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}
        </div>

        <ResponsiveGrid cols={{ default: 1, md: 3 }} gap="lg">
          <div className="md:col-span-2">
            <CurrentPriceCard price={currentPrice} priceChange={priceChangePercent} isLoading={isLoading} />
          </div>
          <div>
            <ScalpingSignal klineData={klineData} isLoading={isLoadingKlines} />
          </div>
        </ResponsiveGrid>

        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="stats">Market Stats</TabsTrigger>
            <TabsTrigger value="indicators">Technical Indicators</TabsTrigger>
          </TabsList>
          <TabsContent value="stats">
            <Card>
              <CardContent className="pt-6">
                <MarketStats
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
          <TabsContent value="indicators">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Technical indicators will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveContainer>
  )
}
