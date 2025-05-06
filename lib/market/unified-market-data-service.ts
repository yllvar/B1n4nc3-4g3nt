import { unifiedWebSocketClient } from "../websocket/unified-websocket-client"
import { errorHandler } from "../error-handling"

export interface MarketTicker {
  symbol: string
  price: string
  priceChange: string
  priceChangePercent: string
  volume: string
  quoteVolume: string
  high: string
  low: string
}

export interface Trade {
  id: number
  price: string
  qty: string
  time: number
  isBuyerMaker: boolean
}

export interface OrderBookEntry {
  price: string
  quantity: string
}

export interface OrderBook {
  lastUpdateId: number
  bids: OrderBookEntry[]
  asks: OrderBookEntry[]
}

export interface Kline {
  openTime: number
  open: string
  high: string
  low: string
  close: string
  volume: string
  closeTime: number
  quoteAssetVolume: string
  trades: number
  takerBuyBaseAssetVolume: string
  takerBuyQuoteAssetVolume: string
}

export class UnifiedMarketDataService {
  private static instance: UnifiedMarketDataService
  private currentSymbol = ""
  private tickerListeners: Set<(ticker: MarketTicker) => void> = new Set()
  private tradesListeners: Set<(trades: Trade[]) => void> = new Set()
  private orderBookListeners: Set<(orderBook: OrderBook) => void> = new Set()
  private klineListeners: Set<(klines: Kline[]) => void> = new Set()

  private constructor() {
    // Initialize WebSocket message handlers
    this.setupWebSocketHandlers()
  }

  public static getInstance(): UnifiedMarketDataService {
    if (!UnifiedMarketDataService.instance) {
      UnifiedMarketDataService.instance = new UnifiedMarketDataService()
    }
    return UnifiedMarketDataService.instance
  }

  public async initialize(symbol: string): Promise<void> {
    try {
      this.currentSymbol = symbol
      unifiedWebSocketClient.connect(symbol)

      // Fetch initial data using REST API to populate immediately
      await this.fetchInitialData(symbol)
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "initialize", symbol },
        severity: "high",
      })
    }
  }

  public subscribeToTicker(callback: (ticker: MarketTicker) => void): () => void {
    this.tickerListeners.add(callback)
    return () => this.tickerListeners.delete(callback)
  }

  public subscribeToTrades(callback: (trades: Trade[]) => void): () => void {
    this.tradesListeners.add(callback)
    return () => this.tradesListeners.delete(callback)
  }

  public subscribeToOrderBook(callback: (orderBook: OrderBook) => void): () => void {
    this.orderBookListeners.add(callback)
    return () => this.orderBookListeners.delete(callback)
  }

  public subscribeToKlines(callback: (klines: Kline[]) => void): () => void {
    this.klineListeners.add(callback)
    return () => this.klineListeners.delete(callback)
  }

  public async getKlines(symbol: string, interval: string, limit = 500): Promise<Kline[]> {
    try {
      if (unifiedWebSocketClient.isFallbackMode()) {
        return await this.fetchKlinesViaRest(symbol, interval, limit)
      }

      // If we're not in fallback mode but we don't have kline data yet,
      // fetch it via REST API as a one-time operation
      return await this.fetchKlinesViaRest(symbol, interval, limit)
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "getKlines", symbol, interval, limit },
        severity: "medium",
      })
      return []
    }
  }

  public async getTicker(symbol: string): Promise<MarketTicker | null> {
    try {
      return await unifiedWebSocketClient.fetchFallbackData<MarketTicker>("/api/v3/ticker/24hr", { symbol })
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "getTicker", symbol },
        severity: "medium",
      })
      return null
    }
  }

  public async getOrderBook(symbol: string, limit = 100): Promise<OrderBook | null> {
    try {
      return await unifiedWebSocketClient.fetchFallbackData<OrderBook>("/api/v3/depth", {
        symbol,
        limit: limit.toString(),
      })
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "getOrderBook", symbol, limit },
        severity: "medium",
      })
      return null
    }
  }

  public async getTrades(symbol: string, limit = 500): Promise<Trade[] | null> {
    try {
      return await unifiedWebSocketClient.fetchFallbackData<Trade[]>("/api/v3/trades", {
        symbol,
        limit: limit.toString(),
      })
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "getTrades", symbol, limit },
        severity: "medium",
      })
      return null
    }
  }

  private async fetchInitialData(symbol: string): Promise<void> {
    try {
      // Fetch initial ticker data
      const ticker = await this.getTicker(symbol)
      if (ticker) {
        this.notifyTickerListeners(ticker)
      }

      // Fetch initial order book
      const orderBook = await this.getOrderBook(symbol)
      if (orderBook) {
        this.notifyOrderBookListeners(orderBook)
      }

      // Fetch initial trades
      const trades = await this.getTrades(symbol)
      if (trades) {
        this.notifyTradesListeners(trades)
      }

      // Fetch initial klines
      const klines = await this.getKlines(symbol, "1m")
      if (klines.length > 0) {
        this.notifyKlineListeners(klines)
      }
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "fetchInitialData", symbol },
        severity: "medium",
      })
    }
  }

  private async fetchKlinesViaRest(symbol: string, interval: string, limit: number): Promise<Kline[]> {
    try {
      const klines = await unifiedWebSocketClient.fetchFallbackData<any[]>("/api/v3/klines", {
        symbol,
        interval,
        limit: limit.toString(),
      })

      // Transform the raw kline data into our Kline interface format
      return klines.map((k) => ({
        openTime: k[0],
        open: k[1],
        high: k[2],
        low: k[3],
        close: k[4],
        volume: k[5],
        closeTime: k[6],
        quoteAssetVolume: k[7],
        trades: k[8],
        takerBuyBaseAssetVolume: k[9],
        takerBuyQuoteAssetVolume: k[10],
      }))
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "fetchKlinesViaRest", symbol, interval, limit },
        severity: "medium",
      })
      return []
    }
  }

  private setupWebSocketHandlers(): void {
    // This would be implemented to handle the WebSocket messages
    // and notify the appropriate listeners
  }

  private notifyTickerListeners(ticker: MarketTicker): void {
    this.tickerListeners.forEach((listener) => {
      try {
        listener(ticker)
      } catch (error) {
        console.error("Error in ticker listener:", error)
      }
    })
  }

  private notifyTradesListeners(trades: Trade[]): void {
    this.tradesListeners.forEach((listener) => {
      try {
        listener(trades)
      } catch (error) {
        console.error("Error in trades listener:", error)
      }
    })
  }

  private notifyOrderBookListeners(orderBook: OrderBook): void {
    this.orderBookListeners.forEach((listener) => {
      try {
        listener(orderBook)
      } catch (error) {
        console.error("Error in order book listener:", error)
      }
    })
  }

  private notifyKlineListeners(klines: Kline[]): void {
    this.klineListeners.forEach((listener) => {
      try {
        listener(klines)
      } catch (error) {
        console.error("Error in kline listener:", error)
      }
    })
  }
}

export const unifiedMarketDataService = UnifiedMarketDataService.getInstance()
