/**
 * Binance WebSocket Manager
 * Manages WebSocket connections to Binance API with advanced reconnection logic
 */
import { binanceWebSocketClient } from "@/features/websocket/lib/websocket-client"

// Connection states
export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting" | "error"

// Connection metrics
export interface ConnectionMetrics {
  connectionState: ConnectionState
  reconnectAttempts: number
  lastConnectedAt: number | null
  lastDisconnectedAt: number | null
  messageCount: number
  errorCount: number
  latency: number | null
}

class BinanceWebSocketManager {
  private connectionState: ConnectionState = "disconnected"
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000
  private lastConnectedAt: number | null = null
  private lastDisconnectedAt: number | null = null
  private messageCount = 0
  private errorCount = 0
  private latency: number | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private healthCheckTimer: NodeJS.Timeout | null = null
  private circuitBreakerTimer: NodeJS.Timeout | null = null
  private circuitBreakerOpen = false
  private listeners: Map<string, Set<(state: ConnectionState) => void>> = new Map()

  constructor() {
    this.setupEventListeners()
    this.startHealthCheck()
  }

  /**
   * Get the current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * Get connection metrics
   */
  public getMetrics(): ConnectionMetrics {
    return {
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      lastConnectedAt: this.lastConnectedAt,
      lastDisconnectedAt: this.lastDisconnectedAt,
      messageCount: this.messageCount,
      errorCount: this.errorCount,
      latency: this.latency,
    }
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): void {
    if (this.circuitBreakerOpen) {
      console.log("Circuit breaker is open, connection attempt blocked")
      return
    }

    if (this.connectionState === "connected" || this.connectionState === "connecting") {
      console.log("Already connected or connecting")
      return
    }

    this.setConnectionState("connecting")
    binanceWebSocketClient.connect()
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    binanceWebSocketClient.disconnect()
    this.setConnectionState("disconnected")
    this.lastDisconnectedAt = Date.now()

    // Clear any pending reconnect timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  /**
   * Reconnect to the WebSocket server
   */
  public async reconnect(): Promise<void> {
    if (this.circuitBreakerOpen) {
      console.log("Circuit breaker is open, reconnection attempt blocked")
      return
    }

    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.setConnectionState("reconnecting")

    // Disconnect first
    binanceWebSocketClient.disconnect()

    // Increment reconnect attempts
    this.reconnectAttempts++

    // Check if we've exceeded max reconnect attempts
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      console.error(`Failed to reconnect after ${this.maxReconnectAttempts} attempts`)
      this.setConnectionState("error")
      this.openCircuitBreaker()
      return
    }

    // Calculate delay with exponential backoff and jitter
    const jitter = Math.random() * 0.5 + 0.75 // Random value between 0.75 and 1.25
    const delay = Math.min(30000, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1) * jitter)

    console.log(
      `Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    )

    // Wait for the delay
    await new Promise((resolve) => {
      this.reconnectTimer = setTimeout(resolve, delay)
    })

    // Connect again
    binanceWebSocketClient.connect()
  }

  /**
   * Reset connection metrics
   */
  public resetMetrics(): void {
    this.reconnectAttempts = 0
    this.messageCount = 0
    this.errorCount = 0
    this.latency = null
  }

  /**
   * Add a connection state change listener
   */
  public addStateChangeListener(id: string, listener: (state: ConnectionState) => void): void {
    if (!this.listeners.has(id)) {
      this.listeners.set(id, new Set())
    }
    this.listeners.get(id)?.add(listener)
  }

  /**
   * Remove a connection state change listener
   */
  public removeStateChangeListener(id: string, listener?: (state: ConnectionState) => void): void {
    if (!this.listeners.has(id)) return

    if (listener) {
      this.listeners.get(id)?.delete(listener)
    } else {
      this.listeners.delete(id)
    }
  }

  /**
   * Set up event listeners for the WebSocket client
   */
  private setupEventListeners(): void {
    // We would ideally listen to WebSocket events directly
    // For now, we'll use a polling approach to check connection status
    setInterval(() => {
      const isConnected = binanceWebSocketClient.isConnected()

      if (isConnected && this.connectionState !== "connected") {
        this.setConnectionState("connected")
        this.lastConnectedAt = Date.now()
        this.reconnectAttempts = 0
      } else if (!isConnected && this.connectionState === "connected") {
        this.setConnectionState("disconnected")
        this.lastDisconnectedAt = Date.now()
        this.attemptReconnect()
      }
    }, 1000)
  }

  /**
   * Start health check timer
   */
  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }

    this.healthCheckTimer = setInterval(() => {
      if (this.connectionState === "connected") {
        // Measure latency by sending a ping
        const startTime = Date.now()

        // This is a simplified approach - in a real implementation,
        // we would send a ping and wait for a pong response
        setTimeout(() => {
          if (binanceWebSocketClient.isConnected()) {
            this.latency = Date.now() - startTime
          }
        }, 100)
      }
    }, 30000) // Check every 30 seconds
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.connectionState === "reconnecting") return

    this.reconnect().catch((error) => {
      console.error("Error during reconnection:", error)
      this.errorCount++
      this.setConnectionState("error")
    })
  }

  /**
   * Set connection state and notify listeners
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState === state) return

    this.connectionState = state

    // Notify all listeners
    this.listeners.forEach((listeners) => {
      listeners.forEach((listener) => {
        try {
          listener(state)
        } catch (error) {
          console.error("Error in connection state listener:", error)
        }
      })
    })
  }

  /**
   * Open circuit breaker to prevent reconnection attempts
   */
  private openCircuitBreaker(): void {
    this.circuitBreakerOpen = true
    console.log("Circuit breaker opened - reconnection attempts paused")

    // Reset circuit breaker after a timeout
    this.circuitBreakerTimer = setTimeout(() => {
      this.circuitBreakerOpen = false
      this.reconnectAttempts = 0
      console.log("Circuit breaker reset - reconnection attempts allowed")
    }, 60000) // 1 minute timeout
  }
}

// Create singleton instance
export const binanceWebSocketManager = new BinanceWebSocketManager()
