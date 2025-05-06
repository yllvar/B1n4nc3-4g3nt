"use client"

import { EventEmitter } from "events"
import { BinanceWS } from "./binance-ws"

export type WebSocketStatus = "connected" | "connecting" | "disconnected"

export enum ConnectionState {
  CONNECTED = "connected",
  CONNECTING = "connecting", 
  DISCONNECTED = "disconnected",
}

export interface WebSocketMetrics {
  latency: number
  messageRate: number
  uptime: number
  reconnects: number
  lastMessageTime: number | null
  connectionHealth?: number
  errorCount?: number
  lastError?: Error
  lastHeartbeatTime?: number | null
  averageLatency?: number
}

export interface WebSocketEvent {
  type: "connect" | "disconnect" | "message" | "error" | "state_change" | "heartbeat" | "reconnect"
  message?: string
  code?: number
  reason?: string
  data?: any
  state?: ConnectionState
  success?: boolean
  latency?: number
  attempt?: number
  maxAttempts?: number
  error?: Error
}

export interface WebSocketClientOptions {
  baseUrl: string
  initialBackoffDelay?: number
  maxBackoffDelay?: number
  backoffFactor?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
  heartbeatTimeout?: number
  debug?: boolean
  autoReconnect?: boolean
}

export class UnifiedWebSocketClient extends EventEmitter {
  private baseUrl: string
  private sockets: Map<string, BinanceWS> = new Map()
  private status: WebSocketStatus = "disconnected"
  private reconnectInterval = 5000
  private maxReconnectAttempts = 10
  private heartbeatInterval = 30000
  private heartbeatTimeout = 10000
  private debug = false
  private autoReconnect = true
  private reconnectAttempts = 0
  private statusListeners: Array<(status: WebSocketStatus, metrics: WebSocketMetrics) => void> = []
  private eventListeners: Map<string, Set<(event: WebSocketEvent) => void>> = new Map()
  private metrics: WebSocketMetrics = {
    latency: 0,
    messageRate: 0,
    uptime: 0,
    reconnects: 0,
    lastMessageTime: null,
    connectionHealth: 100,
    errorCount: 0,
    lastError: undefined,
    lastHeartbeatTime: null,
    averageLatency: 0,
  }
  private startTime: number = Date.now()
  private messageCount = 0
  private messageRateInterval: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private circuitBreakerTripped = false
  private circuitBreakerResetTimeout: NodeJS.Timeout | null = null
  private callbacks: Map<string, ((data: any) => void)[]> = new Map()

  constructor(options: WebSocketClientOptions) {
    super()
    this.baseUrl = options.baseUrl
    if (options.initialBackoffDelay) this.reconnectInterval = options.initialBackoffDelay
    if (options.maxReconnectAttempts) this.maxReconnectAttempts = options.maxReconnectAttempts
    if (options.heartbeatInterval) this.heartbeatInterval = options.heartbeatInterval
    if (options.heartbeatTimeout) this.heartbeatTimeout = options.heartbeatTimeout
    if (options.debug) this.debug = options.debug
    if (options.autoReconnect !== undefined) this.autoReconnect = options.autoReconnect

    this.startMetricsCollection()
    this.startHeartbeat()
  }

  private startMetricsCollection() {
    this.messageRateInterval = setInterval(() => {
      this.metrics.uptime = Date.now() - this.startTime
      this.metrics.messageRate = this.messageCount
      this.messageCount = 0
      this.notifyListeners()
    }, 1000)
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      // Send heartbeat to all active connections
      this.sockets.forEach((socket, stream) => {
        if (socket.readyState === WebSocket.OPEN) {
          try {
            // Send ping frame
            socket.send(JSON.stringify({ type: "ping" }))
            this.metrics.lastHeartbeatTime = Date.now()
          } catch (error) {
            this.log("Error sending heartbeat:", error)
            this.handleSocketError(stream, error as Error)
          }
        }
      })

      // Check for stale connections
      const now = Date.now()
      const staleThreshold = 60000 // 1 minute without messages is considered stale

      this.sockets.forEach((socket, stream) => {
        const lastMessageTime = this.metrics.lastMessageTime
        if (lastMessageTime && now - lastMessageTime > staleThreshold) {
          this.log(`Stale connection detected for ${stream}, reconnecting...`)
          this.reconnect(stream)
        }
      })
    }, this.heartbeatInterval)
  }

  private log(...args: any[]) {
    if (this.debug) {
      console.log(`[WebSocketClient]`, ...args)
    }
  }

  public subscribe(callback: (status: WebSocketStatus, metrics: WebSocketMetrics) => void): () => void {
    this.statusListeners.push(callback)
    return () => {
      const index = this.statusListeners.indexOf(callback)
      this.statusListeners.splice(index, 1)
    }
  }

  public addEventListener(id: string, callback: (event: WebSocketEvent) => void): () => void {
    if (!this.eventListeners.has(id)) {
      this.eventListeners.set(id, new Set())
    }

    const listeners = this.eventListeners.get(id)!
    listeners.add(callback)

    return () => {
      const listeners = this.eventListeners.get(id)
      if (listeners) {
        listeners.delete(callback)
        if (listeners.size === 0) {
          this.eventListeners.delete(id)
        }
      }
    }
  }

  private notifyListeners() {
    this.statusListeners.forEach((listener) => listener(this.status, { ...this.metrics }))
  }

  public emit(type: string, data: any = {}): boolean {
    const result = super.emit(type, data)

    // Create event object
    const event: WebSocketEvent = {
      type: type as any,
      ...data,
    }

    // Notify all listeners
    this.eventListeners.forEach((listeners) => {
      listeners.forEach((listener) => {
        try {
          listener(event)
        } catch (error) {
          console.error("Error in event listener:", error)
        }
      })
    })
    
    return result
  }

  public connect(stream: string, messageHandler?: (data: any) => void): void {
    if (this.sockets.has(stream)) {
      this.log(`Already connected to ${stream}`)
      return
    }

    if (this.circuitBreakerTripped) {
      this.log("Circuit breaker is tripped, not connecting")
      return
    }

    this.status = "connecting"
    this.notifyListeners()

    try {
      // Format the URL correctly for Binance Futures API
      const isCombinedStream = stream.includes(',') || stream.includes('&')
      const url = isCombinedStream 
        ? `${this.baseUrl}/stream?streams=${encodeURIComponent(stream)}`
        : `${this.baseUrl}/ws/${stream}`

      this.log(`Connecting to WebSocket: ${url}`)
      const socket = new BinanceWS({ url })

      const handleError = (error: Error) => {
        this.handleSocketError(stream, error)
        if (this.isFallbackMode()) {
          this.startFallbackPolling(stream, messageHandler || (() => {}))
        }
      }

      socket.on('open', () => {
        this.log(`Connected to ${stream}`)
        this.status = "connected"
        this.reconnectAttempts = 0
        this.metrics.errorCount = 0
        this.metrics.lastError = undefined
        this.notifyListeners()
        this.emit("connect", { stream })
        this.stopFallbackPolling(stream)
      })

      socket.on('close', (event) => {
        this.log(
          `Disconnected from ${stream} with code ${event.code} and reason: ${event.reason || "No reason provided"}`,
        )
        this.sockets.delete(stream)
        this.status = "disconnected"
        this.notifyListeners()
        
        this.emit("disconnect", { 
          stream, 
          code: event.code, 
          reason: event.reason,
          isNormalClosure: event.code === 1000
        })
        
        if (this.autoReconnect && event.code !== 1000) {
          this.reconnect(stream, messageHandler)
        } else if (event.code === 1000) {
          this.log(`Normal WebSocket closure for ${stream}, not attempting reconnect`)
        }
      })

      socket.on('error', handleError)

      const messageCallback = messageHandler || (() => {})
      socket.connect(
        (data) => {
          try {
            messageCallback(data)
            this.messageCount++
            this.metrics.lastMessageTime = Date.now()
            this.emit("message", { stream, data })
          } catch (error) {
            this.log(`Error handling message from ${stream}:`, error)
            handleError(new Error(`Message handling error: ${error instanceof Error ? error.message : String(error)}`))
          }
        },
        handleError
      )

      this.sockets.set(stream, socket)
    } catch (error) {
      this.log(`Error connecting to ${stream}:`, error)
      this.status = "disconnected"
      this.metrics.errorCount = (this.metrics.errorCount || 0) + 1
      this.metrics.lastError = error as Error
      this.notifyListeners()
      this.emit("error", { stream, error })
      if (this.autoReconnect) {
        this.reconnect(stream, messageHandler)
      }
    }
  }

  private async cleanupSocket(stream: string): Promise<void> {
    const socket = this.sockets.get(stream)
    if (socket) {
    return new Promise((resolve) => {
      const onClose = () => {
        socket.off('close', onClose)
        resolve()
      }
      socket.on('close', onClose)
      try {
        socket.close()
      } catch (e) {
        this.log("Error closing socket:", e)
      }
      this.sockets.delete(stream)
    })
    }
  }

  private handleSocketError(stream: string, error: Error) {
    this.log(`WebSocket error for ${stream}:`, error)
    this.metrics.errorCount = (this.metrics.errorCount || 0) + 1
    this.metrics.lastError = error
    this.notifyListeners()
    this.emit("error", { stream, error })
    
    // Explicitly trigger reconnection
    if (this.autoReconnect) {
      this.reconnect(stream)
    }
  }

  private async reconnect(stream: string, messageHandler?: (data: any) => void): Promise<void> {
    if (this.circuitBreakerTripped) {
      this.log("Circuit breaker is tripped, not reconnecting")
      return
    }

    // Calculate backoff delay with jitter
    const baseDelay = Math.min(
      this.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectAttempts * 1000
    )
    const jitter = Math.random() * 0.2 + 0.9 // 0.9-1.1 multiplier
    const delay = Math.floor(baseDelay * jitter)

    this.reconnectAttempts++
    this.metrics.reconnects++
    this.status = "connecting"
    this.notifyListeners()
    this.emit("reconnect", { 
      attempt: this.reconnectAttempts, 
      maxAttempts: this.maxReconnectAttempts,
      delay
    })

    this.log(`Reconnecting to ${stream} in ${delay}ms (attempt ${this.reconnectAttempts})...`)
    
    // Clean up existing socket
    await this.cleanupSocket(stream)

    // Wait for delay period
    await new Promise(resolve => setTimeout(resolve, delay))

    try {
      await this.connect(stream, messageHandler)
    } catch (error) {
      this.log(`Reconnection attempt ${this.reconnectAttempts} failed:`, error)
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnect(stream, messageHandler)
      } else {
        this.log(`Max reconnection attempts (${this.maxReconnectAttempts}) reached`)
        this.tripCircuitBreaker()
        this.emit("max_reconnects", { stream })
      }
    }
  }

  public disconnect(stream: string): void {
    const socket = this.sockets.get(stream)
    if (socket) {
      socket.close()
      this.sockets.delete(stream)
      this.log(`Manually disconnected from ${stream}`)
    }
  }

  public disconnectAll(): void {
    this.sockets.forEach((socket, stream) => {
      socket.close()
      this.log(`Disconnected from ${stream}`)
    })
    this.sockets.clear()
    this.status = "disconnected"
    this.notifyListeners()
  }

  public getStatus(): WebSocketStatus {
    return this.status
  }

  public getMetrics(): WebSocketMetrics {
    return { ...this.metrics }
  }

  public getActiveStreams(): string[] {
    return Array.from(this.sockets.keys())
  }

  public forceReconnect(): void {
    this.sockets.forEach((socket, stream) => {
      this.log(`Force reconnecting stream ${stream}`)
      socket.close()
    })
  }

  public isFallbackMode(): boolean {
    return this.circuitBreakerTripped
  }

  public resetCircuitBreaker(): void {
    this.circuitBreakerTripped = false
    if (this.circuitBreakerResetTimeout) {
      clearTimeout(this.circuitBreakerResetTimeout)
      this.circuitBreakerResetTimeout = null
    }
    this.log("Circuit breaker reset")
  }

  private tripCircuitBreaker(): void {
    this.circuitBreakerTripped = true
    this.log("Circuit breaker tripped")

    // Reset circuit breaker after 5 minutes
    this.circuitBreakerResetTimeout = setTimeout(
      () => {
        this.circuitBreakerTripped = false
        this.log("Circuit breaker reset")
      },
      5 * 60 * 1000,
    )
  }

  public subscribeToStream(stream: string, callback: (data: any) => void): () => void {
    if (!this.callbacks.has(stream)) {
      this.callbacks.set(stream, [])
    }
    this.callbacks.get(stream)?.push(callback)
    this.connect(stream, callback)
    
    return () => {
      const callbacks = this.callbacks.get(stream)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index !== -1) {
          callbacks.splice(index, 1)
        }
        if (callbacks.length === 0) {
          this.callbacks.delete(stream)
          this.disconnect(stream)
        }
      }
    }
  }

  public connectToStreams(streams: string[], callback: (data: any) => void): () => void {
    streams.forEach(stream => {
      if (!this.callbacks.has(stream)) {
        this.callbacks.set(stream, [])
      }
      this.callbacks.get(stream)?.push(callback)
      this.connect(stream, callback)
    })
    
    return () => {
      streams.forEach(stream => {
        const callbacks = this.callbacks.get(stream)
        if (callbacks) {
          const index = callbacks.indexOf(callback)
          if (index !== -1) {
            callbacks.splice(index, 1)
          }
          if (callbacks.length === 0) {
            this.callbacks.delete(stream)
            this.disconnect(stream)
          }
        }
      })
    }
  }

  private fallbackPollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private fallbackDataHandlers: Map<string, (data: any) => void> = new Map();

  public async fetchFallbackData<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    try {
      // Use REST API fallback
      const baseUrl = process.env.BINANCE_API_BASE_URL || "https://fapi.binance.com";
      let url = `${baseUrl}${endpoint}`;

      if (params) {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          queryParams.append(key, value);
        });
        url += `?${queryParams.toString()}`;
      }

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      // Add API key if available
      const apiKey = process.env.BINANCE_API_KEY;
      if (apiKey) {
        headers["X-MBX-APIKEY"] = apiKey;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      this.log(`Error in fetchFallbackData: ${error}`);
      this.emit("error", { error });
      throw error;
    }
  }

  /**
   * Start fallback polling for a stream
   */
  public startFallbackPolling(stream: string, callback: (data: any) => void, interval = 5000): void {
    // Stop any existing polling for this stream
    this.stopFallbackPolling(stream);

    // Store the callback
    this.fallbackDataHandlers.set(stream, callback);

    // Extract symbol from stream name (e.g. btcusdt@ticker -> BTCUSDT)
    const symbol = stream.split("@")[0].toUpperCase();
    
    // Determine the appropriate REST endpoint based on stream type
    let endpoint = "/fapi/v1/ticker/24hr";
    let params: Record<string, string> = { symbol };

    if (stream.includes("@bookTicker")) {
      endpoint = "/fapi/v1/ticker/bookTicker";
    } else if (stream.includes("@ticker")) {
      endpoint = "/fapi/v1/ticker/price";
    } else if (stream.includes("@depth")) {
      endpoint = "/fapi/v1/depth";
      params.limit = "20"; // Default depth limit
    }

    // Initial fetch
    this.fetchFallbackData(endpoint, params)
      .then((data) => callback(data))
      .catch((error) => this.log(`Fallback polling error for ${stream}:`, error));

    // Set up interval
    const pollingInterval = setInterval(() => {
      this.fetchFallbackData(endpoint, params)
        .then((data) => callback(data))
        .catch((error) => this.log(`Fallback polling error for ${stream}:`, error));
    }, interval);

    this.fallbackPollingIntervals.set(stream, pollingInterval);
    this.log(`Started fallback polling for ${stream} (${interval}ms)`);
  }

  /**
   * Stop fallback polling for a stream
   */
  public stopFallbackPolling(stream: string): void {
    const interval = this.fallbackPollingIntervals.get(stream);
    if (interval) {
      clearInterval(interval);
      this.fallbackPollingIntervals.delete(stream);
      this.fallbackDataHandlers.delete(stream);
      this.log(`Stopped fallback polling for ${stream}`);
    }
  }

  /**
   * Check if fallback polling is active for a stream
   */
  public isFallbackPolling(stream: string): boolean {
    return this.fallbackPollingIntervals.has(stream);
  }

  /**
   * Get all callbacks registered for a stream
   */
  public getCallbacksForStream(stream: string): ((data: any) => void)[] | undefined {
    return this.callbacks.get(stream)
  }

}

// Create and export the singleton instance
export const unifiedWebSocketClient = new UnifiedWebSocketClient({
  baseUrl: process.env.BINANCE_WS_BASE_URL || "wss://fstream.binance.com/ws",
  initialBackoffDelay: Number(process.env.WS_RECONNECT_INITIAL_DELAY) || 5000,
  maxBackoffDelay: Number(process.env.WS_RECONNECT_MAX_DELAY) || 60000,
  backoffFactor: Number(process.env.WS_RECONNECT_FACTOR) || 2,
  maxReconnectAttempts: Number(process.env.WS_RECONNECT_MAX_ATTEMPTS) || 10,
  heartbeatInterval: Number(process.env.WS_HEARTBEAT_INTERVAL) || 30000,
  heartbeatTimeout: Number(process.env.WS_HEARTBEAT_TIMEOUT) || 10000,
  debug: true,
  autoReconnect: true,
})
