"use client"

import { EventEmitter } from "events"

export type WebSocketStatus = "connected" | "connecting" | "disconnected" | "reconnecting" | "error" | "fallback"

export enum ConnectionState {
  CONNECTED = "connected",
  CONNECTING = "connecting",
  DISCONNECTED = "disconnected",
  RECONNECTING = "reconnecting",
  FAILED = "failed",
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
  private sockets: Map<string, WebSocket> = new Map()
  private status: WebSocketStatus = "disconnected"
  private reconnectInterval = 5000
  private maxReconnectAttempts = 10
  private heartbeatInterval = 30000
  private heartbeatTimeout = 10000
  private debug = false
  private autoReconnect = true
  private reconnectAttempts = 0
  private listeners: Array<(status: WebSocketStatus, metrics: WebSocketMetrics) => void> = []
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
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter((listener) => listener !== callback)
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
    this.listeners.forEach((listener) => {
      listener(this.status, { ...this.metrics })
    })
  }

  public emit(type: string, data: any = {}): void {
    super.emit(type, data)

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
      // Format the URL correctly - Binance requires the stream to be part of the path or as a parameter
      const url = stream.includes("/") ? `${this.baseUrl}${stream}` : `${this.baseUrl}/${stream}`

      this.log(`Connecting to WebSocket: ${url}`)
      const socket = new WebSocket(url)

      socket.onopen = () => {
        this.log(`Connected to ${stream}`)
        this.status = "connected"
        this.reconnectAttempts = 0
        this.metrics.errorCount = 0
        this.metrics.lastError = undefined
        this.notifyListeners()
        this.emit("connect", { stream })
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          messageHandler?.(data)
          this.messageCount++
          this.metrics.lastMessageTime = Date.now()
          this.emit("message", { stream, data })
        } catch (error) {
          this.log(`Error parsing message from ${stream}:`, error)
        }
      }

      socket.onerror = (error) => {
        this.handleSocketError(stream, error as Error)
      }

      socket.onclose = (event) => {
        this.log(
          `Disconnected from ${stream} with code ${event.code} and reason: ${event.reason || "No reason provided"}`,
        )
        this.sockets.delete(stream)
        this.status = "disconnected"
        this.notifyListeners()
        this.emit("disconnect", { stream, code: event.code, reason: event.reason })
        if (this.autoReconnect) {
          this.reconnect(stream, messageHandler)
        }
      }

      this.sockets.set(stream, socket)
    } catch (error) {
      this.log(`Error connecting to ${stream}:`, error)
      this.status = "error"
      this.metrics.errorCount = (this.metrics.errorCount || 0) + 1
      this.metrics.lastError = error as Error
      this.notifyListeners()
      this.emit("error", { stream, error })
      if (this.autoReconnect) {
        this.reconnect(stream, messageHandler)
      }
    }
  }

  private handleSocketError(stream: string, error: Error) {
    this.log(`WebSocket error for ${stream}:`, error)
    this.status = "error"
    this.metrics.errorCount = (this.metrics.errorCount || 0) + 1
    this.metrics.lastError = error
    this.notifyListeners()
    this.emit("error", { stream, error })
  }

  private reconnect(stream: string, messageHandler?: (data: any) => void): void {
    if (this.circuitBreakerTripped) {
      this.log("Circuit breaker is tripped, not reconnecting")
      return
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log(`Max reconnect attempts reached for ${stream}`)
      this.status = "fallback"
      this.notifyListeners()
      this.emit("state_change", { state: ConnectionState.FAILED })
      this.tripCircuitBreaker()
      return
    }

    this.reconnectAttempts++
    this.metrics.reconnects++
    this.status = "reconnecting"
    this.notifyListeners()
    this.emit("reconnect", { attempt: this.reconnectAttempts, maxAttempts: this.maxReconnectAttempts })

    this.log(`Reconnecting to ${stream} (attempt ${this.reconnectAttempts})...`)
    setTimeout(() => {
      if (messageHandler) {
        this.connect(stream, messageHandler)
      }
    }, this.reconnectInterval)
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
    return this.status === "fallback"
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
    this.connect(stream, callback)
    return () => this.disconnect(stream)
  }

  public connectToStreams(streams: string[], callback: (data: any) => void): () => void {
    streams.forEach((stream) => this.connect(stream, callback))
    return () => streams.forEach((stream) => this.disconnect(stream))
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
