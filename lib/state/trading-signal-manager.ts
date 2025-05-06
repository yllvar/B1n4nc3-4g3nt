"use client"

import { unifiedWebSocketClient } from "@/lib/websocket/unified-websocket-client"
import { enhancedMarketDataService } from "@/lib/market/enhanced-market-data-service"
import type { StrategyParameters, TradingSignal, Kline, SignalType } from "@/lib/types/market-types"
import { calculateEMA, calculateVWAP } from "@/lib/indicators/basic-indicators"

class TradingSignalManager {
  private static instance: TradingSignalManager
  private subscriptions: Map<string, () => void> = new Map()
  private signalCache: Map<string, TradingSignal> = new Map()

  private constructor() {}

  public static getInstance(): TradingSignalManager {
    if (!TradingSignalManager.instance) {
      TradingSignalManager.instance = new TradingSignalManager()
    }
    return TradingSignalManager.instance
  }

  public subscribeToSignal(
    symbol: string,
    interval: string,
    params: StrategyParameters,
    callback: (signal: TradingSignal) => void
  ): () => void {
    const cacheKey = `${symbol}-${interval}-${JSON.stringify(params)}`
    
    // Return cached signal immediately if available
    if (this.signalCache.has(cacheKey)) {
      callback(this.signalCache.get(cacheKey)!)
    }

    const stream = `${symbol.toLowerCase()}@kline_${interval}`
    const unsubscribe = unifiedWebSocketClient.subscribeToStream(stream, (data) => {
      const signal = this.processData(data, params)
      this.signalCache.set(cacheKey, signal)
      callback(signal)
    })

    this.subscriptions.set(cacheKey, unsubscribe)
    return () => {
      unsubscribe()
      this.subscriptions.delete(cacheKey)
    }
  }

  private determineSignalType(
    price: number,
    shortEMA: number,
    longEMA: number,
    vwap: number
  ): SignalType {
    const emaSignal = shortEMA > longEMA ? 'BUY' : 'SELL'
    const vwapSignal = price > vwap ? 'BUY' : 'SELL'
    
    if (emaSignal === 'BUY' && vwapSignal === 'BUY') {
      return 'STRONG_BUY'
    }
    if (emaSignal === 'SELL' && vwapSignal === 'SELL') {
      return 'STRONG_SELL'
    }
    if (Math.abs(price - vwap) < price * 0.001) {
      return 'NEUTRAL'
    }
    return emaSignal
  }

  private processData(data: any, params: StrategyParameters): TradingSignal {
    const klines: Kline[] = data.k // Convert to Kline format
    const prices = klines.map(k => parseFloat(k.close))
    const volumes = klines.map(k => parseFloat(k.volume))

    // Calculate indicators
    const shortEMA = calculateEMA(prices, params.shortEmaPeriod)
    const longEMA = calculateEMA(prices, params.longEmaPeriod)
    const vwap = calculateVWAP(klines.map(k => ({
      high: parseFloat(k.high),
      low: parseFloat(k.low),
      close: parseFloat(k.close),
      volume: parseFloat(k.volume)
    })), params.vwapPeriod)

    // Generate signal
    const currentPrice = parseFloat(data.k[data.k.length - 1].close)
    const signal: TradingSignal = {
      timestamp: Date.now(),
      symbol: data.s,
      interval: params.interval || '5m',
      type: this.determineSignalType(
        currentPrice,
        shortEMA[shortEMA.length - 1],
        longEMA[longEMA.length - 1],
        vwap[vwap.length - 1]
      ),
      price: currentPrice,
      confidence: 0.8, // Default confidence
      indicators: {
        shortEMA: shortEMA[shortEMA.length - 1],
        longEMA: longEMA[longEMA.length - 1],
        vwap: vwap[vwap.length - 1]
      },
      metadata: {
        strategy: 'EMA+VWAP Scalping',
        version: '1.0',
        params
      }
    }

    // Calculate signal confidence
    const emaDiff = signal.indicators.shortEMA - signal.indicators.longEMA
    const vwapDiff = currentPrice - signal.indicators.vwap
    signal.confidence = Math.min(0.95, 
      0.5 + (Math.abs(emaDiff)/currentPrice * 10) + 
      (Math.abs(vwapDiff)/currentPrice * 5)
    )

    return signal
  }
}

export const tradingSignalManager = TradingSignalManager.getInstance()
