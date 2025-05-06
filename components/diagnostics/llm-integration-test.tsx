"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Clock, ArrowRight } from "lucide-react"
import { togetherAIService, type LLMAnalysisRequest, type LLMAnalysisResponse } from "@/lib/ai/together-ai-service"

export function LLMIntegrationTest() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<LLMAnalysisResponse | null>(null)
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle")

  const runBasicTest = async () => {
    setIsLoading(true)
    setError(null)
    setTestStatus("idle")

    try {
      // Sample request with realistic trading data
      const request: LLMAnalysisRequest = {
        symbol: "BTC/USDT",
        timeframe: "1h",
        currentPrice: 65432.1,
        technicalSignal: "BUY",
        signalStrength: 75,
        indicators: {
          "EMA(20)": 64950.25,
          "EMA(50)": 63875.5,
          "RSI(14)": 62.5,
          MACD: 125.75,
          "MACD Signal": 100.25,
          "MACD Histogram": 25.5,
          "ATR(14)": 450.25,
          VWAP: 65100.75,
        },
        recentPriceAction: {
          percentChange24h: 2.35,
          percentChange1h: 0.75,
          volumeChange24h: 15.2,
        },
        marketContext: {
          btcCorrelation: 1.0,
          marketSentiment: "Bullish",
          volatilityRank: 0.65,
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
          <span>Together AI Integration Test</span>
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
        <CardDescription>
          Tests the connection to Together AI and the DeepSeek-V3 model with sample trading data
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
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
        <Button onClick={runBasicTest} disabled={isLoading} className="w-full">
          {isLoading ? "Running Test..." : "Run Basic Test"}
        </Button>
      </CardFooter>
    </Card>
  )
}
