"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MarketDataProvider } from "@/features/market/providers/market-data-provider"
import CurrentPriceCard from "@/features/market/components/current-price-card"
import MarketStats from "@/features/market/components/market-stats"
import TechnicalIndicators from "@/features/market/components/technical-indicators"
import { WebSocketConnectionStatus } from "@/components/websocket/connection-status"
import { useMarketData } from "@/features/market/hooks/use-market-data"
import { useKlineData } from "@/features/market/hooks/use-kline-data"
import ScalpingSignal from "@/features/trading/components/scalping-signal"
import TradingDashboard from "@/features/trading/components/trading-dashboard"
import WebSocketStatus from "@/components/monitoring/websocket-status"
import PerformanceMetrics from "@/features/monitoring/components/performance-metrics"
import { ResponsiveContainer } from "@/components/layout/responsive-container"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Settings, RefreshCw, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const TRADING_PAIRS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "ADAUSDT", "DOGEUSDT"]

interface MarketContentProps {
  symbol: string
}

function MarketContent({ symbol }: MarketContentProps) {
  const { currentPrice, priceChangePercent, highPrice, lowPrice, volume, isLoading, error } = useMarketData()
  const { klineData, isLoading: isLoadingKlines } = useKlineData({ interval: "1m", limit: 30 })

  if (error) {
    return (
      <div className="p-4 sm:p-8 text-center rounded-lg border border-destructive/20 bg-destructive/5">
        <h3 className="text-xl font-semibold text-destructive">Error connecting to Binance API</h3>
        <p className="text-muted-foreground mt-2">{error.message}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry Connection
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      <div className="col-span-full lg:col-span-2">
        <CurrentPriceCard price={currentPrice} priceChange={priceChangePercent} isLoading={isLoading} />
      </div>

      <div className="space-y-4 md:space-y-6 col-span-full md:col-span-1">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Market Stats</CardTitle>
            <CardDescription>24h statistics & indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <MarketStats
              symbol={symbol}
              highPrice={highPrice}
              lowPrice={lowPrice}
              volume={volume}
              priceChange={priceChangePercent}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        <ScalpingSignal klineData={klineData} isLoading={isLoadingKlines} />
      </div>

      <div className="col-span-full">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Technical Analysis</CardTitle>
            <CardDescription>Key indicators and signals</CardDescription>
          </CardHeader>
          <CardContent>
            <TechnicalIndicators symbol={symbol} interval="1h" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function UnifiedDashboard() {
  const [symbol, setSymbol] = useState("SOLUSDT")

  return (
    <ResponsiveContainer>
      <div className="space-y-6 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Binance Tracker</h1>
            <p className="text-muted-foreground">Real-time cryptocurrency market data and trading</p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  {symbol}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Select Trading Pair</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {TRADING_PAIRS.map((pair) => (
                  <DropdownMenuItem key={pair} onClick={() => setSymbol(pair)}>
                    {pair}
                    {pair === symbol && <Badge className="ml-2 bg-primary">Active</Badge>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <WebSocketConnectionStatus />

        <Tabs defaultValue="market" className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="trading">Trading</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="market" className="space-y-4">
            <MarketDataProvider symbol={symbol}>
              <MarketContent symbol={symbol} />
            </MarketDataProvider>
          </TabsContent>

          <TabsContent value="trading" className="space-y-4">
            <TradingDashboard symbol={symbol} />
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <WebSocketStatus />
              <PerformanceMetrics />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>WebSocket Configuration</CardTitle>
                <CardDescription>Configure WebSocket connection settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Environment Variables</h3>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="bg-muted p-2 rounded-md">
                        <p className="font-mono text-sm">BINANCE_WS_BASE_URL</p>
                      </div>
                      <div className="bg-muted p-2 rounded-md">
                        <p className="font-mono text-sm">wss://fstream.binance.com/ws</p>
                      </div>
                      <div className="bg-muted p-2 rounded-md">
                        <p className="font-mono text-sm">BINANCE_API_BASE_URL</p>
                      </div>
                      <div className="bg-muted p-2 rounded-md">
                        <p className="font-mono text-sm">https://fapi.binance.com</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveContainer>
  )
}
