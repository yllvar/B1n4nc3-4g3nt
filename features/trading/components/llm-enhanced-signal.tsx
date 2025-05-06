"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Brain, RefreshCw, TrendingDown, TrendingUp, Clock, BarChart3, Shield } from "lucide-react"
import { useLLMAnalysis } from "@/hooks/use-llm-analysis"
import type { KlineData } from "@/lib/websocket/lib/market-data-service"
import type { StrategySignal } from "@/lib/trading/scalping-strategy"
import { formatPrice } from "@/lib/utils"

interface LLMEnhancedSignalProps {
  symbol: string
  timeframe: string
  klineData: KlineData[]
  technicalSignal: StrategySignal | null
  isLoading?: boolean
}

export default function LLMEnhancedSignal({
  symbol,
  timeframe,
  klineData,
  technicalSignal,
  isLoading: externalLoading = false,
}: LLMEnhancedSignalProps) {
  const [activeTab, setActiveTab] = useState("analysis")

  const {
    analysis,
    isLoading: llmLoading,
    error,
    refreshAnalysis,
    lastUpdated,
  } = useLLMAnalysis({
    symbol,
    timeframe,
    klineData,
    technicalSignal,
    isEnabled: true,
  })

  const isLoading = externalLoading || llmLoading

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case "STRONG_BUY":
        return "text-green-600"
      case "BUY":
        return "text-green-500"
      case "STRONG_SELL":
        return "text-red-600"
      case "SELL":
        return "text-red-500"
      default:
        return "text-gray-500"
    }
  }

  const getSignalBadge = (signal: string) => {
    switch (signal) {
      case "STRONG_BUY":
        return <Badge className="bg-green-600">STRONG BUY</Badge>
      case "BUY":
        return <Badge className="bg-green-500">BUY</Badge>
      case "STRONG_SELL":
        return <Badge className="bg-red-600">STRONG SELL</Badge>
      case "SELL":
        return <Badge className="bg-red-500">SELL</Badge>
      default:
        return <Badge className="bg-gray-500">NEUTRAL</Badge>
    }
  }

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case "STRONG_BUY":
      case "BUY":
        return <TrendingUp className="h-6 w-6 text-green-500" />
      case "STRONG_SELL":
      case "SELL":
        return <TrendingDown className="h-6 w-6 text-red-500" />
      default:
        return <BarChart3 className="h-6 w-6 text-gray-500" />
    }
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span>AI Analysis Error</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">{error.message}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refreshAnalysis()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (isLoading || !analysis) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-4 w-full mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <span>AI-Enhanced Signal</span>
          </div>
          {getSignalBadge(analysis.enhancedSignal)}
        </CardTitle>
        <CardDescription>
          DeepSeek-V3 analysis of {symbol} on {timeframe} timeframe
          {lastUpdated && (
            <span className="ml-2 text-xs text-muted-foreground">• Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
        </CardDescription>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="factors">Key Factors</TabsTrigger>
            <TabsTrigger value="recommendation">Recommendation</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="analysis" className="pt-2">
          <CardContent>
            <div className="flex items-center gap-3 mb-3">
              {getSignalIcon(analysis.enhancedSignal)}
              <div>
                <div className="text-sm font-medium">Confidence</div>
                <div className="text-2xl font-bold">{analysis.confidence}%</div>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">AI Reasoning:</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{analysis.reasoning}</p>
            </div>
          </CardContent>
        </TabsContent>

        <TabsContent value="factors" className="pt-2">
          <CardContent>
            <h4 className="text-sm font-medium mb-2">Key Factors:</h4>
            <ul className="space-y-2">
              {analysis.keyFactors.map((factor, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Risk Assessment:</h4>
              <div className="flex items-start gap-2 mt-1">
                <Shield className="h-4 w-4 text-amber-500 mt-0.5" />
                <p className="text-sm text-muted-foreground">{analysis.riskAssessment}</p>
              </div>
            </div>
          </CardContent>
        </TabsContent>

        <TabsContent value="recommendation" className="pt-2">
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Trading Recommendation:</h4>
                <p className="text-sm text-muted-foreground">{analysis.tradingRecommendation}</p>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Suggested Time Horizon</div>
                  <div className="text-sm text-muted-foreground">{analysis.timeHorizon}</div>
                </div>
              </div>

              {technicalSignal && (technicalSignal.stopLoss || technicalSignal.takeProfit) && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {technicalSignal.stopLoss && (
                    <div className="rounded-md bg-red-500/10 p-2">
                      <p className="text-xs font-medium text-red-500">Stop Loss</p>
                      <p className="text-sm font-bold">{formatPrice(technicalSignal.stopLoss)}</p>
                    </div>
                  )}
                  {technicalSignal.takeProfit && (
                    <div className="rounded-md bg-green-500/10 p-2">
                      <p className="text-xs font-medium text-green-500">Take Profit</p>
                      <p className="text-sm font-bold">{formatPrice(technicalSignal.takeProfit)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </TabsContent>
      </Tabs>

      <CardFooter className="flex justify-between pt-2">
        <div className="text-xs text-muted-foreground">Powered by DeepSeek-V3</div>
        <Button variant="outline" size="sm" onClick={() => refreshAnalysis()} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardFooter>
    </Card>
  )
}
