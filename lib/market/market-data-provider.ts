import { BinanceWS } from "../websocket/binance-ws";
import { restApiService } from "./rest-api-service";
import { errorHandler } from "../error-handling";
import type { OrderBook, Trade, Kline, MarketTicker } from "./interfaces";

export interface MarketDataResult<T> {
  data: T | null
  error: Error | null
  source: string
  timestamp: number
}

export interface MarketDataProvider {
  getCurrentPrice(symbol: string): Promise<MarketDataResult<number>>;
  getOrderBook(symbol: string, limit?: number): Promise<MarketDataResult<OrderBook>>;
  getRecentTrades(symbol: string, limit?: number): Promise<MarketDataResult<Trade[]>>;
  getKlines(symbol: string, interval: string, limit?: number): Promise<MarketDataResult<Kline[]>>;
  get24hrTicker(symbol: string): Promise<MarketDataResult<MarketTicker>>;

  subscribeToPrice(symbol: string, callback: (result: MarketDataResult<number>) => void): () => void;
  subscribeToOrderBook(symbol: string, callback: (result: MarketDataResult<OrderBook>) => void): () => void;
  subscribeToTrades(symbol: string, callback: (result: MarketDataResult<Trade[]>) => void): () => void;
  subscribeToKlines(symbol: string, interval: string, callback: (result: MarketDataResult<Kline[]>) => void): () => void;
  subscribeTo24hrTicker(symbol: string, callback: (result: MarketDataResult<MarketTicker>) => void): () => void;

  getStatus(): "connected" | "connecting" | "disconnected" | "error" | "fallback" | "reconnecting";
  getActiveSubscriptions(): string[];
  unsubscribeAll(): void;
  startFallbackPolling(symbol: string, callback: (data: any) => void, interval?: number): void;
  stopFallbackPolling(symbol: string): void;
  isFallbackPolling(symbol: string): boolean;
}

interface BinanceMarketDataProviderOptions {
  cacheTTL?: number;
  preferWebSocket?: boolean;
  debug?: boolean;
}

export class BinanceMarketDataProvider implements MarketDataProvider {
  private static instance: BinanceMarketDataProvider;
  private activeSubscriptions: Set<string> = new Set();
  private cache: Map<string, { data: any; timestamp: number; source: string }> = new Map();
  private cacheTTL: number;
  private preferWebSocket: boolean;
  private debug: boolean;
  private connectionStatus: "connected" | "connecting" | "disconnected" | "error" | "fallback" | "reconnecting" = "disconnected";
  private connectionStatusListeners: Set<(status: string) => void> = new Set();
  private fallbackPollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private fallbackDataHandlers: Map<string, (data: any) => void> = new Map();

  private constructor(options: BinanceMarketDataProviderOptions = {}) {
    this.cacheTTL = options.cacheTTL || 30000;
    this.preferWebSocket = options.preferWebSocket !== false;
    this.debug = options.debug || false;
    this.monitorConnectionStatus();
  }

  public static getInstance(options?: BinanceMarketDataProviderOptions): BinanceMarketDataProvider {
    if (!BinanceMarketDataProvider.instance) {
      BinanceMarketDataProvider.instance = new BinanceMarketDataProvider(options);
    }
    return BinanceMarketDataProvider.instance;
  }

  private monitorConnectionStatus(): void {
    const ws = new BinanceWS({ 
      url: 'wss://fstream.binance.com/ws',
      reconnectDelay: 1000,
      maxReconnects: 10
    });

    ws.connect(() => {
      const status = ws.getStatus();
      this.connectionStatus = status.isConnected ? 'connected' : 'disconnected';
      this.notifyConnectionStatusListeners();
    });
  }

  private notifyConnectionStatusListeners(): void {
    this.connectionStatusListeners.forEach((listener) => {
      try {
        listener(this.connectionStatus);
      } catch (error) {
        console.error("Error in connection status listener:", error);
      }
    });
  }

  public subscribeToConnectionStatus(callback: (status: string) => void): () => void {
    this.connectionStatusListeners.add(callback);
    callback(this.connectionStatus);
    return () => {
      this.connectionStatusListeners.delete(callback);
    };
  }

  private formatSymbol(symbol: string): string {
    return symbol.replace(/\s+/g, "").toUpperCase();
  }

  private getCacheKey(type: string, symbol: string, params?: Record<string, string>): string {
    const formattedSymbol = this.formatSymbol(symbol);
    let key = `${type}:${formattedSymbol}`;
    if (params) {
      const paramString = Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join("&");
      key += `:${paramString}`;
    }
    return key;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private storeInCache<T>(key: string, data: T, source: string): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      source,
    });
  }

  private log(...args: any[]): void {
    if (this.debug) {
      console.log("[BinanceMarketDataProvider]", ...args);
    }
  }

  public getStatus(): "connected" | "connecting" | "disconnected" | "error" | "fallback" | "reconnecting" {
    return this.connectionStatus;
  }

  public getActiveSubscriptions(): string[] {
    return Array.from(this.activeSubscriptions);
  }

  public unsubscribeAll(): void {
    this.activeSubscriptions.forEach(stream => {
      const ws = new BinanceWS({ url: `wss://fstream.binance.com/ws/${stream}` });
      ws.disconnect();
    });
    this.activeSubscriptions.clear();
    this.fallbackPollingIntervals.forEach((interval, symbol) => {
      clearInterval(interval);
      this.fallbackPollingIntervals.delete(symbol);
    });
  }

  public startFallbackPolling(symbol: string, callback: (data: any) => void, interval = 5000): void {
    const formattedSymbol = this.formatSymbol(symbol);
    this.fallbackDataHandlers.set(formattedSymbol, callback);

    if (this.fallbackPollingIntervals.has(formattedSymbol)) {
      this.stopFallbackPolling(formattedSymbol);
    }

    const pollingInterval = setInterval(async () => {
      try {
        const result = await this.getCurrentPrice(formattedSymbol);
        if (result.data !== null) {
          callback(result.data);
        }
      } catch (error) {
        console.error("Fallback polling error:", error);
      }
    }, interval);

    this.fallbackPollingIntervals.set(formattedSymbol, pollingInterval);
  }

  public stopFallbackPolling(symbol: string): void {
    const formattedSymbol = this.formatSymbol(symbol);
    const interval = this.fallbackPollingIntervals.get(formattedSymbol);
    if (interval) {
      clearInterval(interval);
      this.fallbackPollingIntervals.delete(formattedSymbol);
      this.fallbackDataHandlers.delete(formattedSymbol);
    }
  }

  public isFallbackPolling(symbol: string): boolean {
    return this.fallbackPollingIntervals.has(this.formatSymbol(symbol));
  }

  public async getCurrentPrice(symbol: string): Promise<MarketDataResult<number>> {
    const formattedSymbol = this.formatSymbol(symbol);
    const cacheKey = this.getCacheKey("price", formattedSymbol);
    const cachedData = this.getFromCache<number>(cacheKey);
    if (cachedData !== null) {
      return {
        data: cachedData,
        error: null,
        source: "cache",
        timestamp: Date.now(),
      };
    }

    try {
      const result = await restApiService.getCurrentPrice(formattedSymbol);
      if (result.data !== null) {
        this.storeInCache(cacheKey, result.data, "rest");
      }
      return result;
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "getCurrentPrice", symbol: formattedSymbol },
        severity: "medium",
      });
      return {
        data: null,
        error: error as Error,
        source: "rest",
        timestamp: Date.now(),
      };
    }
  }

  public async getOrderBook(symbol: string, limit = 100): Promise<MarketDataResult<OrderBook>> {
    const formattedSymbol = this.formatSymbol(symbol);
    const cacheKey = this.getCacheKey("orderbook", formattedSymbol, { limit: limit.toString() });
    const cachedData = this.getFromCache<OrderBook>(cacheKey);
    if (cachedData !== null) {
      return {
        data: cachedData,
        error: null,
        source: "cache",
        timestamp: Date.now(),
      };
    }

    try {
      const result = await restApiService.getOrderBook(formattedSymbol, limit);
      if (result.data !== null) {
        this.storeInCache(cacheKey, result.data, "rest");
      }
      return result;
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "getOrderBook", symbol: formattedSymbol, limit },
        severity: "medium",
      });
      return {
        data: null,
        error: error as Error,
        source: "rest",
        timestamp: Date.now(),
      };
    }
  }

  public async getRecentTrades(symbol: string, limit = 500): Promise<MarketDataResult<Trade[]>> {
    const formattedSymbol = this.formatSymbol(symbol);
    const cacheKey = this.getCacheKey("trades", formattedSymbol, { limit: limit.toString() });
    const cachedData = this.getFromCache<Trade[]>(cacheKey);
    if (cachedData !== null) {
      return {
        data: cachedData,
        error: null,
        source: "cache",
        timestamp: Date.now(),
      };
    }

    try {
      const result = await restApiService.getRecentTrades(formattedSymbol, limit);
      if (result.data && result.data.length > 0) {
        this.storeInCache(cacheKey, result.data, "rest");
      }
      return result;
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "getRecentTrades", symbol: formattedSymbol, limit },
        severity: "medium",
      });
      return {
        data: [],
        error: error as Error,
        source: "rest",
        timestamp: Date.now(),
      };
    }
  }

  public async getKlines(symbol: string, interval: string, limit = 500): Promise<MarketDataResult<Kline[]>> {
    const formattedSymbol = this.formatSymbol(symbol);
    const cacheKey = this.getCacheKey("klines", formattedSymbol, { interval, limit: limit.toString() });
    const cachedData = this.getFromCache<Kline[]>(cacheKey);
    if (cachedData !== null) {
      return {
        data: cachedData,
        error: null,
        source: "cache",
        timestamp: Date.now(),
      };
    }

    try {
      const result = await restApiService.getKlines(formattedSymbol, interval, limit);
      if (result.data && result.data.length > 0) {
        this.storeInCache(cacheKey, result.data, "rest");
      }
      return result;
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "getKlines", symbol: formattedSymbol, interval, limit },
        severity: "medium",
      });
      return {
        data: [],
        error: error as Error,
        source: "rest",
        timestamp: Date.now(),
      };
    }
  }

  public async get24hrTicker(symbol: string): Promise<MarketDataResult<MarketTicker>> {
    const formattedSymbol = this.formatSymbol(symbol);
    const cacheKey = this.getCacheKey("ticker", formattedSymbol);
    const cachedData = this.getFromCache<MarketTicker>(cacheKey);
    if (cachedData !== null) {
      return {
        data: cachedData,
        error: null,
        source: "cache",
        timestamp: Date.now(),
      };
    }

    try {
      const result = await restApiService.get24hrTicker(formattedSymbol);
      if (result.data !== null) {
        this.storeInCache(cacheKey, result.data, "rest");
      }
      return result;
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: { action: "get24hrTicker", symbol: formattedSymbol },
        severity: "medium",
      });
      return {
        data: null,
        error: error as Error,
        source: "rest",
        timestamp: Date.now(),
      };
    }
  }

  public subscribeToPrice(symbol: string, callback: (result: MarketDataResult<number>) => void): () => void {
    const formattedSymbol = this.formatSymbol(symbol);
    const streamName = `${formattedSymbol.toLowerCase()}@bookTicker`;
    this.activeSubscriptions.add(streamName);

    const ws = new BinanceWS({
      url: `wss://fstream.binance.com/ws/${streamName}`
    });

    const messageHandler = (data: any) => {
      try {
        const price = Number.parseFloat(data.b);
        if (!isNaN(price)) {
          const cacheKey = this.getCacheKey("price", formattedSymbol);
          this.storeInCache(cacheKey, price, "websocket");
          callback({
            data: price,
            error: null,
            source: "websocket",
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        errorHandler.handleError(error as Error, {
          context: { action: "subscribeToPrice", symbol: formattedSymbol, data },
          severity: "medium",
        });
        callback({
          data: null,
          error: error as Error,
          source: "websocket",
          timestamp: Date.now(),
        });
        this.getCurrentPrice(formattedSymbol)
          .then((result) => {
            if (result.data !== null) {
              callback(result);
            }
          })
          .catch((err) => console.error("Failed to get price via REST:", err));
      }
    };

    this.getCurrentPrice(formattedSymbol)
      .then((result) => {
        if (result.data !== null) {
          callback(result);
        }
      })
      .catch((err) => console.error("Failed to get initial price:", err));

    ws.connect(messageHandler);

    return () => {
      ws.disconnect();
      this.activeSubscriptions.delete(streamName);
    };
  }

  public subscribeToOrderBook(symbol: string, callback: (result: MarketDataResult<OrderBook>) => void): () => void {
    const formattedSymbol = this.formatSymbol(symbol);
    const streamName = `${formattedSymbol.toLowerCase()}@depth`;
    this.activeSubscriptions.add(streamName);

    const ws = new BinanceWS({
      url: `wss://fstream.binance.com/ws/${streamName}`
    });

    const messageHandler = (data: any) => {
      try {
        const orderBook: OrderBook = {
          bids: data.bids.map((bid: [string, string]) => ({
            price: Number.parseFloat(bid[0]),
            quantity: Number.parseFloat(bid[1])
          })),
          asks: data.asks.map((ask: [string, string]) => ({
            price: Number.parseFloat(ask[0]),
            quantity: Number.parseFloat(ask[1])
          })),
          lastUpdateId: data.lastUpdateId
        };

        const cacheKey = this.getCacheKey("orderbook", formattedSymbol);
        this.storeInCache(cacheKey, orderBook, "websocket");
        callback({
          data: orderBook,
          error: null,
          source: "websocket",
          timestamp: Date.now(),
        });
      } catch (error) {
        errorHandler.handleError(error as Error, {
          context: { action: "subscribeToOrderBook", symbol: formattedSymbol, data },
          severity: "medium",
        });
        callback({
          data: null,
          error: error as Error,
          source: "websocket",
          timestamp: Date.now(),
        });
        this.getOrderBook(formattedSymbol)
          .then((result) => {
            if (result.data !== null) {
              callback(result);
            }
          })
          .catch((err) => console.error("Failed to get order book via REST:", err));
      }
    };

    this.getOrderBook(formattedSymbol)
      .then((result) => {
        if (result.data !== null) {
          callback(result);
        }
      })
      .catch((err) => console.error("Failed to get initial order book:", err));

    ws.connect(messageHandler);

    return () => {
      ws.disconnect();
      this.activeSubscriptions.delete(streamName);
    };
  }

  public subscribeToTrades(symbol: string, callback: (result: MarketDataResult<Trade[]>) => void): () => void {
    const formattedSymbol = this.formatSymbol(symbol);
    const streamName = `${formattedSymbol.toLowerCase()}@trade`;
    this.activeSubscriptions.add(streamName);

    const ws = new BinanceWS({
      url: `wss://fstream.binance.com/ws/${streamName}`
    });

    const messageHandler = (data: any) => {
      try {
        const trade: Trade = {
          id: data.t,
          price: Number.parseFloat(data.p),
          quantity: Number.parseFloat(data.q),
          time: data.T,
          isBuyerMaker: data.m
        };

        const cacheKey = this.getCacheKey("trades", formattedSymbol);
        const cachedTrades = this.getFromCache<Trade[]>(cacheKey) || [];
        cachedTrades.unshift(trade);
        this.storeInCache(cacheKey, cachedTrades.slice(0, 100), "websocket");

        callback({
          data: [trade],
          error: null,
          source: "websocket",
          timestamp: Date.now(),
        });
      } catch (error) {
        errorHandler.handleError(error as Error, {
          context: { action: "subscribeToTrades", symbol: formattedSymbol, data },
          severity: "medium",
        });
        callback({
          data: [],
          error: error as Error,
          source: "websocket",
          timestamp: Date.now(),
        });
        this.getRecentTrades(formattedSymbol)
          .then((result) => {
            if (result.data !== null) {
              callback(result);
            }
          })
          .catch((err) => console.error("Failed to get trades via REST:", err));
      }
    };

    this.getRecentTrades(formattedSymbol)
      .then((result) => {
        if (result.data !== null) {
          callback(result);
        }
      })
      .catch((err) => console.error("Failed to get initial trades:", err));

    ws.connect(messageHandler);

    return () => {
      ws.disconnect();
      this.activeSubscriptions.delete(streamName);
    };
  }

  public subscribeToKlines(symbol: string, interval: string, callback: (result: MarketDataResult<Kline[]>) => void): () => void {
    const formattedSymbol = this.formatSymbol(symbol);
    const streamName = `${formattedSymbol.toLowerCase()}@kline_${interval}`;
    this.activeSubscriptions.add(streamName);

    const ws = new BinanceWS({
      url: `wss://fstream.binance.com/ws/${streamName}`
    });

    const messageHandler = (data: any) => {
      try {
        const kline: Kline = {
          openTime: data.k.t,
          open: Number.parseFloat(data.k.o),
          high: Number.parseFloat(data.k.h),
          low: Number.parseFloat(data.k.l),
          close: Number.parseFloat(data.k.c),
          volume: Number.parseFloat(data.k.v),
          closeTime: data.k.T,
          quoteAssetVolume: Number.parseFloat(data.k.q),
          trades: data.k.n,
          takerBuyBaseAssetVolume: Number.parseFloat(data.k.V),
          takerBuyQuoteAssetVolume: Number.parseFloat(data.k.Q),
          ignored: 0
        };

        const cacheKey = this.getCacheKey("klines", formattedSymbol, { interval });
        const cachedKlines = this.getFromCache<Kline[]>(cacheKey) || [];
        cachedKlines.unshift(kline);
        this.storeInCache(cacheKey, cachedKlines.slice(0, 100), "websocket");

        callback({
          data: [kline],
          error: null,
          source: "websocket",
          timestamp: Date.now(),
        });
      } catch (error) {
        errorHandler.handleError(error as Error, {
          context: { action: "subscribeToKlines", symbol: formattedSymbol, interval, data },
          severity: "medium",
        });
        callback({
          data: [],
          error: error as Error,
          source: "websocket",
          timestamp: Date.now(),
        });
        this.getKlines(formattedSymbol, interval)
          .then((result) => {
            if (result.data !== null) {
              callback(result);
            }
          })
          .catch((err) => console.error("Failed to get klines via REST:", err));
      }
    };

    this.getKlines(formattedSymbol, interval)
      .then((result) => {
        if (result.data !== null) {
          callback(result);
        }
      })
      .catch((err) => console.error("Failed to get initial klines:", err));

    ws.connect(messageHandler);

    return () => {
      ws.disconnect();
      this.activeSubscriptions.delete(streamName);
    };
  }

  public subscribeTo24hrTicker(symbol: string, callback: (result: MarketDataResult<MarketTicker>) => void): () => void {
    const formattedSymbol = this.formatSymbol(symbol);
    const streamName = `${formattedSymbol.toLowerCase()}@ticker`;
    this.activeSubscriptions.add(streamName);

    const ws = new BinanceWS({
      url: `wss://fstream.binance.com/ws/${streamName}`
    });

    const messageHandler = (data: any) => {
      try {
        const ticker: MarketTicker = {
          symbol: data.s,
          priceChange: Number.parseFloat(data.p),
          priceChangePercent: Number.parseFloat(data.P),
          weightedAvgPrice: Number.parseFloat(data.w),
          lastPrice: Number.parseFloat(data.c),
          lastQty: Number.parseFloat(data.Q),
          openPrice: Number.parseFloat(data.o),
          highPrice: Number.parseFloat(data.h),
          lowPrice: Number.parseFloat(data.l),
          volume: Number.parseFloat(data.v),
          quoteVolume: Number.parseFloat(data.q),
          openTime: data.O,
          closeTime: data.C,
          firstId: data.F,
          lastId: data.L,
          count: data.n
        };

        const cacheKey = this.getCacheKey("ticker", formattedSymbol);
        this.storeInCache(cacheKey, ticker, "websocket");

        callback({
          data: ticker,
          error: null,
          source: "websocket",
          timestamp: Date.now(),
        });
      } catch (error) {
        errorHandler.handleError(error as Error, {
          context: { action: "subscribeTo24hrTicker", symbol: formattedSymbol, data },
          severity: "medium",
        });
        callback({
          data: null,
          error: error as Error,
          source: "websocket",
          timestamp: Date.now(),
        });
        this.get24hrTicker(formattedSymbol)
          .then((result) => {
            if (result.data !== null) {
              callback(result);
            }
          })
          .catch((err) => console.error("Failed to get ticker via REST:", err));
      }
    };

    this.get24hrTicker(formattedSymbol)
      .then((result) => {
        if (result.data !== null) {
          callback(result);
        }
      })
      .catch((err) => console.error("Failed to get initial ticker:", err));

    ws.connect(messageHandler);

    return () => {
      ws.disconnect();
      this.activeSubscriptions.delete(streamName);
    };
  }
}
