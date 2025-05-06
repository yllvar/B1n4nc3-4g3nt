"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Clock, ArrowRight, RefreshCw } from "lucide-react"
import { togetherAIService, type LLMAnalysisRequest, type LLMAnalysisResponse } from "@/lib/ai/together-ai-service"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

// Import trading strategy and market data hooks
import { useEnhancedMarketData } from "@/hooks/use-enhanced-market-data"

export function LLMSignalTest() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<LLMAnalysisResponse | null>(null)
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle")
  const [symbol, setSymbol] = useState("BTC/USDT")

  // Get market data
  const { marketData, isLoading: isLoadingMarketData, error: marketDataError } = useEnhancedMarketData(symbol)

  const runLiveTest = async () => {
    if (!marketData) {
      setError("No market data available")
      setTestStatus("error")
      return
    }

    setIsLoading(true)
    setError(null)
    setTestStatus("idle")

    try {
      // Extract data from market data
      const currentPrice = marketData.lastPrice || 0
      const ema20 = marketData.indicators?.ema20 || 0
      const ema50 = marketData.indicators?.ema50 || 0
      const rsi = marketData.indicators?.rsi || 0
      const macd = marketData.indicators?.macd || 0
      const macdSignal = marketData.indicators?.macdSignal || 0
      const macdHistogram = marketData.indicators?.macdHistogram || 0
      const atr = marketData.indicators?.atr || 0
      const vwap = marketData.indicators?.vwap || 0

      // Determine technical signal
      let technicalSignal = "NEUTRAL"
      let signalStrength = 50

      if (currentPrice > ema20 && ema20 > ema50 && rsi > 50) {
        technicalSignal = "BUY"
        signalStrength = Math.min(100, 50 + Math.round((rsi - 50) * 1.5))
      } else if (currentPrice < ema20 && ema20 < ema50 && rsi < 50) {
        technicalSignal = "SELL"
        signalStrength = Math.min(100, 50 + Math.round((50 - rsi) * 1.5))
      }

      // Create request
      const request: LLMAnalysisRequest = {
        symbol,
        timeframe: "1h",
        currentPrice,
        technicalSignal,
        signalStrength,
        indicators: {
          "EMA(20)": ema20,
          "EMA(50)": ema50,
          "RSI(14)": rsi,
          MACD: macd,
          "MACD Signal": macdSignal,
          "MACD Histogram": macdHistogram,
          "ATR(14)": atr,
          VWAP: vwap,
        },
        recentPriceAction: {
          percentChange24h: marketData.priceChangePercent24h || 0,
          percentChange1h: marketData.priceChangePercent1h || 0,
          volumeChange24h: marketData.volumeChangePercent24h || 0,
        },
        marketContext: {
          btcCorrelation: symbol !== "BTC/USDT" ? 0.8 : 1.0, // Example correlation
          marketSentiment: rsi > 70 ? "Overbought" : rsi < 30 ? "Oversold" : "Neutral",
          volatilityRank: atr / currentPrice, // Normalized ATR as volatility rank
        },
      }

      const response = await togetherAIService.analyzeSignal(request)

      if (response) {
        setResult(response)
        setTestStatus("success")
      } else {
        throw new Error("No response received from Together AI service")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
      setTestStatus("error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Live Trading Signal Test</span>
          {testStatus === "success" && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Success
            </Badge>
          )}
          {testStatus === "error" && (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              <AlertCircle className="h-3.5 w-3.5 mr-1" />
              Failed
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Test the LLM analysis with real-time market data</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {marketDataError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Market Data Error</AlertTitle>
            <AlertDescription>{marketDataError.message}</AlertDescription>
          </Alert>
        )}

        <div className="mb-6">
          <Label htmlFor="symbol">Symbol</Label>
          <Select value={symbol} onValueChange={setSymbol}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select symbol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
              <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
              <SelectItem value="BNB/USDT">BNB/USDT</SelectItem>
              <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
              <SelectItem value="XRP/USDT">XRP/USDT</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {marketData && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Current Price</h3>
              <p className="text-base font-medium mt-1">{marketData.lastPrice?.toFixed(2) || "N/A"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">24h Change</h3>
              <p
                className={`text-base font-medium mt-1 ${(marketData.priceChangePercent24h || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {marketData.priceChangePercent24h?.toFixed(2) || "0"}%
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Volume (24h)</h3>
              <p className="text-base font-medium mt-1">{marketData.volume24h?.toLocaleString() || "N/A"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">RSI (14)</h3>
              <p className="text-base font-medium mt-1">{marketData.indicators?.rsi?.toFixed(2) || "N/A"}</p>
            </div>
          </div>
        )}

        {result && (
          <Tabs defaultValue="analysis" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="factors">Key Factors</TabsTrigger>
              <TabsTrigger value="recommendation">Recommendation</TabsTrigger>
            </TabsList>
            <TabsContent value="analysis" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Signal</h3>
                  <div className="flex items-center mt-1">
                    <Badge
                      className={
                        result.enhancedSignal === "STRONG_BUY" || result.enhancedSignal === "BUY"
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : result.enhancedSignal === "NEUTRAL"
                            ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                            : "bg-red-100 text-red-800 hover:bg-red-100"
                      }
                    >
                      {result.enhancedSignal}
                    </Badge>
                    <span className="ml-2 text-sm text-gray-500">Confidence: {result.confidence}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-medium">Time Horizon</h3>
                  <div className="flex items-center justify-end mt-1">
                    <Clock className="h-4 w-4 mr-1 text-gray-500" />
                    <span className="text-sm">{result.timeHorizon}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Reasoning</h3>
                <p className="text-sm text-gray-700 whitespace-pre-line">{result.reasoning}</p>
              </div>
            </TabsContent>

            <TabsContent value="factors">
              <div>
                <h3 className="text-lg font-medium mb-2">Key Factors</h3>
                <ul className="space-y-2">
                  {result.keyFactors.map((factor, index) => (
                    <li key={index} className="flex items-start">
                      <ArrowRight className="h-4 w-4 mr-2 mt-1 flex-shrink-0 text-blue-500" />
                      <span className="text-sm">{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="recommendation">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Risk Assessment</h3>
                  <p className="text-sm text-gray-700">{result.riskAssessment}</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Trading Recommendation</h3>
                  <p className="text-sm text-gray-700">{result.tradingRecommendation}</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={runLiveTest} disabled={isLoading || isLoadingMarketData} className="w-full">
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : isLoadingMarketData ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Loading Market Data...
            </>
          ) : (
            "Analyze Live Trading Signal"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
