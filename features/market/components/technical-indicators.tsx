"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { useTechnicalIndicators } from "@/features/market/hooks/use-technical-indicators"
import { Card } from "@/components/ui/card"
import { useMediaQuery } from "@/hooks/use-media-query"
import { memo } from "react"

interface TechnicalIndicatorsProps {
  symbol: string
  interval?: string
}

function TechnicalIndicatorsComponent({ symbol, interval = "15m" }: TechnicalIndicatorsProps) {
  const { indicators, isLoading, error } = useTechnicalIndicators(symbol, { interval })
  const { rsi, ema20, sma50, macd, macdSignal } = indicators
  const isMobile = useMediaQuery("(max-width: 640px)")

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-32" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-muted-foreground rounded-md bg-muted/50">
        <p>Unable to load technical indicators</p>
        <p className="text-sm text-red-500 mt-1">{error.message}</p>
        <button
          className="mt-3 px-3 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    )
  }

  // Determine indicator signals
  const getRsiSignal = (value: number) => {
    if (value > 70) return { text: "Overbought", color: "text-red-500" }
    if (value < 30) return { text: "Oversold", color: "text-green-500" }
    return { text: "Neutral", color: "text-yellow-500" }
  }

  const getEmaSignal = (ema: number, sma: number) => {
    if (ema > sma) return { text: "Bullish", color: "text-green-500" }
    return { text: "Bearish", color: "text-red-500" }
  }

  const getMacdSignal = (macd: number, signal: number) => {
    if (macd > signal) return { text: "Bullish", color: "text-green-500" }
    return { text: "Bearish", color: "text-red-500" }
  }

  const rsiSignal = rsi !== null ? getRsiSignal(rsi) : { text: "N/A", color: "text-muted-foreground" }
  const emaSignal =
    ema20 !== null && sma50 !== null ? getEmaSignal(ema20, sma50) : { text: "N/A", color: "text-muted-foreground" }
  const macdSignal2 =
    macd !== null && macdSignal !== null
      ? getMacdSignal(macd, macdSignal)
      : { text: "N/A", color: "text-muted-foreground" }

  return (
    <div className="space-y-4">
      {!isMobile && <h2 className="text-xl font-semibold">Technical Indicators</h2>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">RSI (14)</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-base sm:text-lg font-medium tabular-nums">{rsi !== null ? rsi.toFixed(2) : "N/A"}</p>
            <span className={`text-xs ${rsiSignal.color}`}>{rsiSignal.text}</span>
          </div>
        </Card>

        <Card className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">EMA (20)</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-base sm:text-lg font-medium tabular-nums">{ema20 !== null ? ema20.toFixed(2) : "N/A"}</p>
            <span className={`text-xs ${emaSignal.color}`}>{emaSignal.text}</span>
          </div>
        </Card>

        <Card className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">SMA (50)</p>
          <p className="text-base sm:text-lg font-medium tabular-nums mt-1">
            {sma50 !== null ? sma50.toFixed(2) : "N/A"}
          </p>
        </Card>

        <Card className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">MACD</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-base sm:text-lg font-medium tabular-nums">{macd !== null ? macd.toFixed(2) : "N/A"}</p>
            <span className={`text-xs ${macdSignal2.color}`}>{macdSignal2.text}</span>
          </div>
        </Card>
      </div>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
const TechnicalIndicators = memo(TechnicalIndicatorsComponent)
export default TechnicalIndicators
