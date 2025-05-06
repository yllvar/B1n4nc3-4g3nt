"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Clock, ArrowRight } from "lucide-react"
import { togetherAIService, type LLMAnalysisRequest, type LLMAnalysisResponse } from "@/lib/ai/together-ai-service"
import { Textarea } from "@/components/ui/textarea"

export function LLMAdvancedTest() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<LLMAnalysisResponse | null>(null)
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle")

  // Form state
  const [symbol, setSymbol] = useState("BTC/USDT")
  const [timeframe, setTimeframe] = useState("1h")
  const [currentPrice, setCurrentPrice] = useState(65000)
  const [technicalSignal, setTechnicalSignal] = useState("BUY")
  const [signalStrength, setSignalStrength] = useState(75)
  const [percentChange24h, setPercentChange24h] = useState(2.5)
  const [percentChange1h, setPercentChange1h] = useState(0.75)
  const [volumeChange24h, setVolumeChange24h] = useState(15)
  const [indicators, setIndicators] = useState(`{
  "EMA(20)": 64950.25,
  "EMA(50)": 63875.50,
  "RSI(14)": 62.5,
  "MACD": 125.75,
  "MACD Signal": 100.25,
  "MACD Histogram": 25.5,
  "ATR(14)": 450.25,
  "VWAP": 65100.75
}`)
  const [marketContext, setMarketContext] = useState(`{
  "btcCorrelation": 1.0,
  "marketSentiment": "Bullish",
  "volatilityRank": 0.65
}`)

  const runCustomTest = async () => {
    setIsLoading(true)
    setError(null)
    setTestStatus("idle")

    try {
      // Parse JSON inputs
      let parsedIndicators: Record<string, number | string>
      let parsedMarketContext:
        | {
            btcCorrelation?: number | null
            marketSentiment?: string | null
            volatilityRank?: number | null
          }
        | undefined

      try {
        parsedIndicators = JSON.parse(indicators)
      } catch (err) {
        throw new Error("Invalid indicators JSON format")
      }

      try {
        parsedMarketContext = marketContext ? JSON.parse(marketContext) : undefined
      } catch (err) {
        throw new Error("Invalid market context JSON format")
      }

      // Create request
      const request: LLMAnalysisRequest = {
        symbol,
        timeframe,
        currentPrice: Number(currentPrice),
        technicalSignal,
        signalStrength: Number(signalStrength),
        indicators: parsedIndicators,
        recentPriceAction: {
          percentChange24h: Number(percentChange24h),
          percentChange1h: Number(percentChange1h),
          volumeChange24h: Number(volumeChange24h),
        },
        marketContext: parsedMarketContext,
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
          <span>Advanced LLM Testing</span>
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
        <CardDescription>Test the Together AI integration with custom parameters</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="symbol">Symbol</Label>
              <Input id="symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 minute</SelectItem>
                  <SelectItem value="5m">5 minutes</SelectItem>
                  <SelectItem value="15m">15 minutes</SelectItem>
                  <SelectItem value="30m">30 minutes</SelectItem>
                  <SelectItem value="1h">1 hour</SelectItem>
                  <SelectItem value="4h">4 hours</SelectItem>
                  <SelectItem value="1d">1 day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="currentPrice">Current Price</Label>
              <Input
                id="currentPrice"
                type="number"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(Number(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="technicalSignal">Technical Signal</Label>
              <Select value={technicalSignal} onValueChange={setTechnicalSignal}>
                <SelectTrigger>
                  <SelectValue placeholder="Select signal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRONG_BUY">STRONG BUY</SelectItem>
                  <SelectItem value="BUY">BUY</SelectItem>
                  <SelectItem value="NEUTRAL">NEUTRAL</SelectItem>
                  <SelectItem value="SELL">SELL</SelectItem>
                  <SelectItem value="STRONG_SELL">STRONG SELL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex justify-between">
                <Label htmlFor="signalStrength">Signal Strength: {signalStrength}</Label>
              </div>
              <Slider
                id="signalStrength"
                min={0}
                max={100}
                step={1}
                value={[signalStrength]}
                onValueChange={(values) => setSignalStrength(values[0])}
                className="mt-2"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="percentChange24h">24h Price Change (%)</Label>
              <Input
                id="percentChange24h"
                type="number"
                value={percentChange24h}
                onChange={(e) => setPercentChange24h(Number(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="percentChange1h">1h Price Change (%)</Label>
              <Input
                id="percentChange1h"
                type="number"
                value={percentChange1h}
                onChange={(e) => setPercentChange1h(Number(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="volumeChange24h">24h Volume Change (%)</Label>
              <Input
                id="volumeChange24h"
                type="number"
                value={volumeChange24h}
                onChange={(e) => setVolumeChange24h(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <Label htmlFor="indicators">Technical Indicators (JSON)</Label>
            <Textarea
              id="indicators"
              value={indicators}
              onChange={(e) => setIndicators(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          <div>
            <Label htmlFor="marketContext">Market Context (JSON)</Label>
            <Textarea
              id="marketContext"
              value={marketContext}
              onChange={(e) => setMarketContext(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
          </div>
        </div>

        {result && (
          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-medium mb-4">LLM Analysis Result</h3>
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
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={runCustomTest} disabled={isLoading} className="w-full">
          {isLoading ? "Running Test..." : "Run Custom Test"}
        </Button>
      </CardFooter>
    </Card>
  )
}
