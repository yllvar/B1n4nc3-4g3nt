"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowUpCircle, ArrowDownCircle, CircleDot } from "lucide-react"
import {
  calculateEMA,
  calculateVWAP,
  calculateVWAPSlope,
  calculateATR,
  getAdaptiveEmaPeriod,
} from "@/lib/indicators/technical-indicators"
import type { KlineData } from "@/lib/websocket/lib/market-data-service"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPrice } from "@/lib/utils"

interface ScalpingSignalProps {
  klineData: KlineData[]
  higherTimeframeData?: KlineData[] // For higher timeframe confirmation
  isLoading: boolean
}

type SignalType = "BUY" | "SELL" | "NEUTRAL"

interface StrategyResult {
  signal: SignalType
  confidence: number
  stopLoss: number | null
  takeProfit: number | null
  reasoning: string
  indicators: Record<string, number>
  validationPassed: boolean
  validationDetails: {
    priceAboveEma: boolean
    priceAboveVwap: boolean
    vwapSlopePositive: boolean
    priceAboveHigherTimeframeEma: boolean
    volatilityInRange: boolean
    thresholdsPassed: boolean
  }
}

// Memoized component to prevent unnecessary re-renders
const ScalpingSignal = ({ klineData, higherTimeframeData, isLoading }: ScalpingSignalProps) => {
  const [signal, setSignal] = useState<SignalType>("NEUTRAL")
  const [signalStrength, setSignalStrength] = useState(0)
  const [stopLoss, setStopLoss] = useState<number | null>(null)
  const [takeProfit, setTakeProfit] = useState<number | null>(null)
  const [reasoning, setReasoning] = useState<string>("")
  const [indicators, setIndicators] = useState<Record<string, number>>({})
  const [validationDetails, setValidationDetails] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Memoize the analysis to prevent unnecessary recalculations
  const analyzeMarketData = useMemo(() => {
    if (!klineData || klineData.length === 0) {
      return null
    }

    try {
      return analyzeMarket(klineData, higherTimeframeData)
    } catch (err) {
      console.error("Error analyzing market data:", err)
      return null
    }
  }, [klineData, higherTimeframeData])

  useEffect(() => {
    if (!isLoading && analyzeMarketData) {
      setIsAnalyzing(true)

      // Simulate a small delay for analysis to show loading state
      const timer = setTimeout(() => {
        setSignal(analyzeMarketData.signal)
        setSignalStrength(Math.min(Math.abs(analyzeMarketData.confidence || 0) * 100, 100))
        setStopLoss(analyzeMarketData.stopLoss)
        setTakeProfit(analyzeMarketData.takeProfit)
        setReasoning(analyzeMarketData.reasoning)
        setIndicators(analyzeMarketData.indicators)
        setValidationDetails(analyzeMarketData.validationDetails)
        setIsAnalyzing(false)
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [analyzeMarketData, isLoading])

  const getSignalColor = () => {
    switch (signal) {
      case "BUY":
        return "bg-green-500"
      case "SELL":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getSignalIcon = () => {
    switch (signal) {
      case "BUY":
        return <ArrowUpCircle className="h-6 w-6 text-green-500" />
      case "SELL":
        return <ArrowDownCircle className="h-6 w-6 text-red-500" />
      default:
        return <CircleDot className="h-6 w-6 text-gray-500" />
    }
  }

  const getSignalBadge = () => {
    switch (signal) {
      case "BUY":
        return <Badge className="bg-green-500">BUY</Badge>
      case "SELL":
        return <Badge className="bg-red-500">SELL</Badge>
      default:
        return <Badge className="bg-gray-500">NEUTRAL</Badge>
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-6 rounded-full" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!klineData || klineData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Data Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load market data for analysis.</p>
          <button
            className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>EMA + VWAP Scalping Signal</span>
          {isAnalyzing ? (
            <div className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              <span className="text-sm font-normal text-muted-foreground">Analyzing...</span>
            </div>
          ) : (
            getSignalBadge()
          )}
        </CardTitle>
        <CardDescription>Real-time trading signals based on EMA + VWAP strategy</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {isAnalyzing ? <LoadingSpinner /> : getSignalIcon()}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Signal Strength</span>
                <span className="text-sm">{isAnalyzing ? "Calculating..." : `${Math.round(signalStrength)}%`}</span>
              </div>
              {isAnalyzing ? (
                <Progress value={undefined} className="bg-gray-200 dark:bg-gray-700">
                  <div className="h-full bg-primary/30 animate-pulse" style={{ width: "100%" }}></div>
                </Progress>
              ) : (
                <Progress value={signalStrength} className={getSignalColor()} />
              )}
            </div>
          </div>

          {!isAnalyzing && (stopLoss || takeProfit) && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {stopLoss && (
                <div className="rounded-md bg-red-500/10 p-2">
                  <p className="text-xs font-medium text-red-500">Stop Loss</p>
                  <p className="text-sm font-bold">{formatPrice(stopLoss)}</p>
                </div>
              )}
              {takeProfit && (
                <div className="rounded-md bg-green-500/10 p-2">
                  <p className="text-xs font-medium text-green-500">Take Profit</p>
                  <p className="text-sm font-bold">{formatPrice(takeProfit)}</p>
                </div>
              )}
            </div>
          )}

          {isAnalyzing ? (
            <div className="mt-2 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : reasoning ? (
            <div className="mt-2">
              <p className="text-xs font-medium mb-1">Signal Reasoning:</p>
              <p className="text-sm">{reasoning}</p>
            </div>
          ) : null}

          {!isAnalyzing && Object.keys(indicators).length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium mb-1">Key Indicators:</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(indicators).map(([key, value]) => (
                  <div key={key} className="rounded-md bg-gray-100 dark:bg-gray-800 p-2">
                    <p className="text-xs font-medium uppercase">{key}</p>
                    <p className="text-sm font-bold">{typeof value === "number" ? value.toFixed(2) : value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isAnalyzing && validationDetails && (
            <div className="mt-2">
              <p className="text-xs font-medium mb-1">Signal Validation:</p>
              <div className="grid grid-cols-1 gap-1 text-xs">
                <div className="flex justify-between">
                  <span>Price {`>`} EMA:</span>
                  <Badge variant={validationDetails.priceAboveEma ? "default" : "outline"} className="text-xs">
                    {validationDetails.priceAboveEma ? "✓" : "✗"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Price {`>`} VWAP:</span>
                  <Badge variant={validationDetails.priceAboveVwap ? "default" : "outline"} className="text-xs">
                    {validationDetails.priceAboveVwap ? "✓" : "✗"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>VWAP Slope {`>`} 0:</span>
                  <Badge variant={validationDetails.vwapSlopePositive ? "default" : "outline"} className="text-xs">
                    {validationDetails.vwapSlopePositive ? "✓" : "✗"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Higher TF Confirmation:</span>
                  <Badge
                    variant={validationDetails.priceAboveHigherTimeframeEma ? "default" : "outline"}
                    className="text-xs"
                  >
                    {validationDetails.priceAboveHigherTimeframeEma ? "✓" : "✗"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Volatility In Range:</span>
                  <Badge variant={validationDetails.volatilityInRange ? "default" : "outline"} className="text-xs">
                    {validationDetails.volatilityInRange ? "✓" : "✗"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Thresholds Passed:</span>
                  <Badge variant={validationDetails.thresholdsPassed ? "default" : "outline"} className="text-xs">
                    {validationDetails.thresholdsPassed ? "✓" : "✗"}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Analyze market data according to the EMA + VWAP scalping strategy
 */
function analyzeMarket(klineData: KlineData[], higherTimeframeData?: KlineData[]): StrategyResult {
  // Strategy parameters
  const baseEmaPeriod = 7
  const vwapPeriod = 20
  const atrPeriod = 14
  const emaThreshold = 0.001 // 0.1%
  const vwapThreshold = 0.0005 // 0.05%
  const stopLossPercent = 0.004 // 0.4%
  const takeProfitPercent = 0.008 // 0.8%

  // Extract price data
  const closes = klineData.map((k) => k.close)
  const highs = klineData.map((k) => k.high)
  const lows = klineData.map((k) => k.low)
  const volumes = klineData.map((k) => k.volume)
  const typicalPrices = klineData.map((k) => (k.high + k.low + k.close) / 3)

  // Get current price (last candle close)
  const lastIndex = klineData.length - 1
  const currentPrice = closes[lastIndex]

  // Calculate ATR for volatility measurement
  const atr = calculateATR(highs, lows, closes, atrPeriod)
  const currentAtr = atr[lastIndex]

  // Get adaptive EMA period based on volatility
  const adaptiveEmaPeriod = getAdaptiveEmaPeriod(currentPrice, currentAtr || 0, baseEmaPeriod)

  // Calculate EMA
  const ema = calculateEMA(closes, adaptiveEmaPeriod)
  const currentEma = ema[lastIndex]

  // Calculate VWAP
  const vwap = calculateVWAP(typicalPrices, volumes, vwapPeriod)
  const currentVwap = vwap[lastIndex]

  // Calculate VWAP slope
  const vwapSlope = calculateVWAPSlope(vwap)
  const currentVwapSlope = vwapSlope[lastIndex]

  // Calculate higher timeframe EMA if data is available
  let higherTimeframeEma = null
  if (higherTimeframeData && higherTimeframeData.length > 0) {
    const htfCloses = higherTimeframeData.map((k) => k.close)
    const htfEma = calculateEMA(htfCloses, 15) // Higher timeframe EMA (15)
    higherTimeframeEma = htfEma[htfEma.length - 1]
  }

  // Validation checks according to strategy
  const priceAboveEma = currentPrice > currentEma
  const priceAboveVwap = currentPrice > currentVwap
  const vwapSlopePositive = currentVwapSlope !== null && currentVwapSlope > 0
  const priceAboveHigherTimeframeEma = higherTimeframeEma === null || currentPrice > higherTimeframeEma

  // Volatility check
  const atrPercent = currentAtr / currentPrice
  const volatilityInRange = atrPercent > 0.001 && atrPercent < 0.01 // Between 0.1% and 1%

  // Threshold checks
  const emaThresholdValue = currentEma * emaThreshold
  const vwapThresholdValue = currentVwap * vwapThreshold
  const priceAboveEmaThreshold = currentPrice > currentEma + emaThresholdValue
  const priceAboveVwapThreshold = currentPrice > currentVwap + vwapThresholdValue
  const priceBelowEmaThreshold = currentPrice < currentEma - emaThresholdValue
  const priceBelowVwapThreshold = currentPrice < currentVwap - vwapThresholdValue

  const thresholdsPassed =
    (priceAboveEmaThreshold && priceAboveVwapThreshold) || (priceBelowEmaThreshold && priceBelowVwapThreshold)

  // Combine all validation checks
  const validationDetails = {
    priceAboveEma,
    priceAboveVwap,
    vwapSlopePositive,
    priceAboveHigherTimeframeEma,
    volatilityInRange,
    thresholdsPassed,
  }

  // Buy signal conditions
  const buySignalValid =
    priceAboveEma &&
    priceAboveVwap &&
    vwapSlopePositive &&
    priceAboveHigherTimeframeEma &&
    volatilityInRange &&
    priceAboveEmaThreshold &&
    priceAboveVwapThreshold

  // Sell signal conditions
  const sellSignalValid =
    !priceAboveEma &&
    !priceAboveVwap &&
    !vwapSlopePositive &&
    !priceAboveHigherTimeframeEma &&
    volatilityInRange &&
    priceBelowEmaThreshold &&
    priceBelowVwapThreshold

  // Generate signal
  let signal: SignalType = "NEUTRAL"
  let confidence = 0
  let stopLoss = null
  let takeProfit = null
  let reasoning = "No clear signal"

  if (buySignalValid) {
    signal = "BUY"
    confidence = 0.7 + (vwapSlopePositive ? 0.1 : 0) + (volatilityInRange ? 0.1 : 0)
    stopLoss = currentPrice * (1 - stopLossPercent)
    takeProfit = currentPrice * (1 + takeProfitPercent)
    reasoning = "Price above EMA and VWAP with positive VWAP slope and higher timeframe confirmation"
  } else if (sellSignalValid) {
    signal = "SELL"
    confidence = 0.7 + (!vwapSlopePositive ? 0.1 : 0) + (volatilityInRange ? 0.1 : 0)
    stopLoss = currentPrice * (1 + stopLossPercent)
    takeProfit = currentPrice * (1 - takeProfitPercent)
    reasoning = "Price below EMA and VWAP with negative VWAP slope and higher timeframe confirmation"
  } else {
    // Check if we're close to generating a signal
    if (priceAboveEma && priceAboveVwap) {
      reasoning = "Potential buy signal forming, waiting for confirmation"
      confidence = 0.3
    } else if (!priceAboveEma && !priceAboveVwap) {
      reasoning = "Potential sell signal forming, waiting for confirmation"
      confidence = 0.3
    } else {
      reasoning = "Mixed signals, no clear direction"
      confidence = 0.1
    }
  }

  return {
    signal,
    confidence,
    stopLoss,
    takeProfit,
    reasoning,
    indicators: {
      price: currentPrice,
      ema: currentEma,
      vwap: currentVwap,
      vwapSlope: currentVwapSlope,
      atr: currentAtr,
      emaPeriod: adaptiveEmaPeriod,
      htfEma: higherTimeframeEma,
    },
    validationPassed: buySignalValid || sellSignalValid,
    validationDetails,
  }
}

export default ScalpingSignal
