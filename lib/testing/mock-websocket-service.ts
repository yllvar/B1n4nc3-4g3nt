/**
 * Mock WebSocket Service
 * Simulates WebSocket connections and data for testing purposes
 */

import { EventEmitter } from "events"

interface MockWebSocketOptions {
  simulateConnectionDelay?: number
  simulateDisconnects?: boolean
  disconnectInterval?: number
  simulateErrors?: boolean
  errorRate?: number
  mockDataInterval?: number
}

export class MockWebSocketService extends EventEmitter {
  private isConnected = false
  private options: MockWebSocketOptions
  private mockDataIntervals: Map<string, NodeJS.Timeout> = new Map()
  private disconnectInterval: NodeJS.Timeout | null = null
  private activeStreams: Set<string> = new Set()
  private mockDataGenerators: Map<string, () => any> = new Map()

  constructor(options: MockWebSocketOptions = {}) {
    super()
    this.options = {
      simulateConnectionDelay: options.simulateConnectionDelay ?? 500,
      simulateDisconnects: options.simulateDisconnects ?? false,
      disconnectInterval: options.disconnectInterval ?? 30000,
      simulateErrors: options.simulateErrors ?? false,
      errorRate: options.errorRate ?? 0.05, // 5% chance of error
      mockDataInterval: options.mockDataInterval ?? 1000,
    }

    // Set up mock data generators
    this.setupMockDataGenerators()

    // Set up random disconnects if enabled
    if (this.options.simulateDisconnects) {
      this.setupRandomDisconnects()
    }
  }

  private setupMockDataGenerators() {
    // Mock trade data generator
    this.mockDataGenerators.set("trade", () => {
      const price = 20000 + Math.random() * 2000
      const quantity = 0.001 + Math.random() * 0.1
      return {
        e: "trade",
        E: Date.now(),
        s: "BTCUSDT",
        t: Date.now(),
        p: price.toFixed(2),
        q: quantity.toFixed(6),
        b: Date.now() - 100000,
        a: Date.now() - 200000,
        T: Date.now(),
        m: Math.random() > 0.5,
        M: true,
      }
    })

    // Mock depth (order book) data generator
    this.mockDataGenerators.set("depth", () => {
      const basePrice = 20000 + Math.random() * 2000
      const bids = Array.from({ length: 10 }, (_, i) => {
        const price = (basePrice - i * 10 - Math.random() * 5).toFixed(2)
        const quantity = (0.1 + Math.random() * 2).toFixed(6)
        return [price, quantity]
      })

      const asks = Array.from({ length: 10 }, (_, i) => {
        const price = (basePrice + i * 10 + Math.random() * 5).toFixed(2)
        const quantity = (0.1 + Math.random() * 2).toFixed(6)
        return [price, quantity]
      })

      return {
        e: "depthUpdate",
        E: Date.now(),
        s: "BTCUSDT",
        U: Date.now() - 1000,
        u: Date.now(),
        b: bids,
        a: asks,
      }
    })

    // Mock kline data generator
    this.mockDataGenerators.set("kline", () => {
      const basePrice = 20000 + Math.random() * 2000
      const open = basePrice
      const high = open + Math.random() * 100
      const low = open - Math.random() * 100
      const close = low + Math.random() * (high - low)

      return {
        e: "kline",
        E: Date.now(),
        s: "BTCUSDT",
        k: {
          t: Date.now() - 60000,
          T: Date.now(),
          s: "BTCUSDT",
          i: "1m",
          f: Date.now() - 60000,
          L: Date.now(),
          o: open.toFixed(2),
          c: close.toFixed(2),
          h: high.toFixed(2),
          l: low.toFixed(2),
          v: (100 + Math.random() * 900).toFixed(6),
          n: 100 + Math.floor(Math.random() * 900),
          x: false,
          q: (2000000 + Math.random() * 8000000).toFixed(2),
          V: (50 + Math.random() * 450).toFixed(6),
          Q: (1000000 + Math.random() * 4000000).toFixed(2),
          B: "0",
        },
      }
    })

    // Mock ticker data generator
    this.mockDataGenerators.set("ticker", () => {
      const basePrice = 20000 + Math.random() * 2000
      const priceChange = -200 + Math.random() * 400
      const priceChangePercent = (priceChange / basePrice) * 100

      return {
        e: "24hrTicker",
        E: Date.now(),
        s: "BTCUSDT",
        p: priceChange.toFixed(2),
        P: priceChangePercent.toFixed(2),
        w: (basePrice - 50 + Math.random() * 100).toFixed(2),
        x: (basePrice - priceChange).toFixed(2),
        c: basePrice.toFixed(2),
        Q: (0.001 + Math.random() * 0.1).toFixed(6),
        b: (basePrice - 5).toFixed(2),
        B: (0.1 + Math.random() * 2).toFixed(6),
        a: (basePrice + 5).toFixed(2),
        A: (0.1 + Math.random() * 2).toFixed(6),
        o: (basePrice - priceChange).toFixed(2),
        h: (basePrice + 200).toFixed(2),
        l: (basePrice - 200).toFixed(2),
        v: (1000 + Math.random() * 9000).toFixed(6),
        q: (20000000 + Math.random() * 80000000).toFixed(2),
        O: Date.now() - 86400000,
        C: Date.now(),
        F: Date.now() - 86400000,
        L: Date.now(),
        n: 100000,
      }
    })

    // Mock bookTicker data generator
    this.mockDataGenerators.set("bookTicker", () => {
      const basePrice = 20000 + Math.random() * 2000
      return {
        u: Date.now(),
        s: "BTCUSDT",
        b: (basePrice - 5).toFixed(2),
        B: (0.1 + Math.random() * 2).toFixed(6),
        a: (basePrice + 5).toFixed(2),
        A: (0.1 + Math.random() * 2).toFixed(6),
      }
    })
  }

  private setupRandomDisconnects() {
    if (this.disconnectInterval) {
      clearInterval(this.disconnectInterval)
    }

    this.disconnectInterval = setInterval(() => {
      if (this.isConnected && Math.random() < 0.2) {
        // 20% chance of disconnect every interval
        this.simulateDisconnect()
      }
    }, this.options.disconnectInterval)
  }

  public connect(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.isConnected = true
        this.emit("open")
        resolve()
      }, this.options.simulateConnectionDelay)
    })
  }

  public disconnect(): void {
    this.isConnected = false
    this.stopAllMockData()
    this.emit("close", { code: 1000, reason: "Normal closure" })
  }

  public simulateDisconnect(): void {
    this.isConnected = false
    this.stopAllMockData()
    this.emit("close", { code: 1001, reason: "Going away" })

    // Auto reconnect after a delay
    setTimeout(() => {
      this.connect().then(() => {
        // Restart data for active streams
        this.activeStreams.forEach((stream) => {
          this.startMockData(stream)
        })
      })
    }, 2000)
  }

  public simulateError(message = "Mock WebSocket error"): void {
    this.emit("error", new Error(message))
  }

  public subscribe(stream: string): void {
    if (!this.isConnected) {
      throw new Error("Cannot subscribe when not connected")
    }

    this.activeStreams.add(stream)
    this.startMockData(stream)
  }

  public unsubscribe(stream: string): void {
    this.activeStreams.delete(stream)
    this.stopMockData(stream)
  }

  private startMockData(stream: string): void {
    if (this.mockDataIntervals.has(stream)) {
      return
    }

    const streamType = this.getStreamType(stream)
    const dataGenerator = this.mockDataGenerators.get(streamType)

    if (!dataGenerator) {
      console.warn(`No mock data generator for stream type: ${streamType}`)
      return
    }

    const interval = setInterval(() => {
      if (!this.isConnected) {
        return
      }

      // Simulate errors if enabled
      if (this.options.simulateErrors && Math.random() < this.options.errorRate) {
        this.simulateError(`Mock error for stream: ${stream}`)
        return
      }

      const mockData = dataGenerator()

      // For combined stream format
      const message = {
        stream,
        data: mockData,
      }

      this.emit("message", { data: JSON.stringify(message) })
    }, this.options.mockDataInterval)

    this.mockDataIntervals.set(stream, interval)
  }

  private stopMockData(stream: string): void {
    const interval = this.mockDataIntervals.get(stream)
    if (interval) {
      clearInterval(interval)
      this.mockDataIntervals.delete(stream)
    }
  }

  private stopAllMockData(): void {
    this.mockDataIntervals.forEach((interval) => {
      clearInterval(interval)
    })
    this.mockDataIntervals.clear()
  }

  private getStreamType(stream: string): string {
    // Parse stream name to get the type
    // Format is typically: <symbol>@<type>
    const parts = stream.split("@")
    if (parts.length < 2) {
      return "trade" // Default to trade
    }

    const type = parts[1]
    if (type.startsWith("kline")) {
      return "kline"
    }
    if (type.startsWith("depth")) {
      return "depth"
    }
    if (type === "ticker") {
      return "ticker"
    }
    if (type === "bookTicker") {
      return "bookTicker"
    }
    return "trade"
  }
}

// Export a singleton instance
export const mockWebSocketService = new MockWebSocketService()
