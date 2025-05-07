/**
 * Binance WebSocket Client
 * Handles WebSocket connections to Binance API
 */
import { errorHandler } from "@/lib/error-handling"
import type { WebSocketClient } from "@/lib/types"

export interface WebSocketClientOptions {
  reconnectAttempts?: number
  reconnectDelay?: number
  debug?: boolean
}

class BinanceWebSocketClient implements WebSocketClient {
  private baseWsUrl = "wss://fstream.binance.com/ws"
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000 // Start with 1 second delay
  private subscriptions: Map<string, Set<(data: any) => void>> = new Map()
  private isReconnecting = false
  private pingInterval: NodeJS.Timeout | null = null
  private lastPongTime = 0
  private connectionId = 0
  private options: WebSocketClientOptions

  constructor(options: WebSocketClientOptions = {}) {
    // Initialize with no connection
    this.ws = null
    this.options = {
      reconnectAttempts: options.reconnectAttempts || 10,
      reconnectDelay: options.reconnectDelay || 1000,
      debug: options.debug || false,
    }

    // Add window beforeunload event to properly close connections
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.disconnect()
      })
    }
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.log("WebSocket already connected or connecting")
      return
    }

    try {
      this.log("Connecting to Binance WebSocket...")
      this.connectionId++
      const currentConnectionId = this.connectionId

      // Check if WebSocket is available in the environment
      if (typeof WebSocket === "undefined") {
        console.error("WebSocket is not supported in this environment")
        return
      }

      this.ws = new WebSocket(this.baseWsUrl)

      this.ws.onopen = () => {
        this.log("WebSocket connection established")
        this.reconnectAttempts = 0
        this.reconnectDelay = this.options.reconnectDelay || 1000
        this.isReconnecting = false
        this.lastPongTime = Date.now()

        // Resubscribe to all streams
        this.resubscribeAll()

        // Set up ping interval
        this.setupPingInterval()
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)

          // Handle pong messages
          if (message.pong) {
            this.lastPongTime = Date.now()
            return
          }

          // Handle regular messages
          if (message.stream && message.data) {
            const { stream, data } = message
            this.notifySubscribers(stream, data)
          } else if (message.e && message.s) {
            // Direct stream format (not combined)
            const streamName = `${message.s.toLowerCase()}@${message.e.toLowerCase()}`
            this.notifySubscribers(streamName, message)
          }
        } catch (error) {
          errorHandler.handleError(error as Error, "Error processing WebSocket message", {
            service: "BinanceWebSocketClient",
            method: "onmessage",
          })
        }
      }

      this.ws.onerror = (event) => {
        // Log the error with more context but avoid logging the entire event object
        this.log("WebSocket connection error occurred")
        errorHandler.handleError(new Error("WebSocket connection error"), {
          service: "BinanceWebSocketClient",
          method: "onerror",
        })

        // Check if the connection is still valid
        const isConnectionValid =
          this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)

        // Only attempt reconnect if this is still the current connection and it's invalid
        if (currentConnectionId === this.connectionId && !isConnectionValid) {
          this.attemptReconnect()
        }
      }

      this.ws.onclose = (event) => {
        this.log(`WebSocket connection closed: ${event.code} ${event.reason}`)
        if (this.pingInterval) {
          clearInterval(this.pingInterval)
          this.pingInterval = null
        }

        if (currentConnectionId === this.connectionId && !this.isReconnecting) {
          this.attemptReconnect()
        }
      }
    } catch (error) {
      errorHandler.handleError(error as Error, "Error connecting to WebSocket", {
        service: "BinanceWebSocketClient",
        method: "connect",
      })
      this.attemptReconnect()
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }

    // Clear all subscriptions
    this.subscriptions.clear()
  }

  /**
   * Check if the WebSocket is connected
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  /**
   * Subscribe to a WebSocket stream
   */
  public subscribe(stream: string, callback: (data: any) => void): void {
    // Add to local subscriptions
    if (!this.subscriptions.has(stream)) {
      this.subscriptions.set(stream, new Set())
    }
    this.subscriptions.get(stream)?.add(callback)

    // If connected, send subscription message
    if (this.isConnected()) {
      const subscribeMsg = {
        method: "SUBSCRIBE",
        params: [stream],
        id: Date.now(),
      }
      this.ws?.send(JSON.stringify(subscribeMsg))
    } else {
      // If not connected, connect first
      this.connect()
    }
  }

  /**
   * Unsubscribe from a WebSocket stream
   */
  public unsubscribe(stream: string): void {
    // If connected, send unsubscription message
    if (this.isConnected() && this.subscriptions.has(stream)) {
      const unsubscribeMsg = {
        method: "UNSUBSCRIBE",
        params: [stream],
        id: Date.now(),
      }
      this.ws?.send(JSON.stringify(unsubscribeMsg))
    }

    // Remove from local subscriptions
    this.subscriptions.delete(stream)
  }

  /**
   * Force reconnection to the WebSocket server
   */
  public forceReconnect(): void {
    this.log("Forcing WebSocket reconnection...")
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }

    // Reset reconnection parameters
    this.reconnectAttempts = 0
    this.reconnectDelay = this.options.reconnectDelay || 1000
    this.isReconnecting = false

    // Connect again
    setTimeout(() => this.connect(), 100)
  }

  /**
   * Connect to a single stream with callback
   * Returns an unsubscribe function
   */
  public connectToStream(stream: string, callback: (data: any) => void): () => void {
    this.subscribe(stream, callback)
    return () => {
      // Get the subscription set
      const callbacks = this.subscriptions.get(stream)
      if (callbacks) {
        // Remove this specific callback
        callbacks.delete(callback)

        // If no callbacks left, unsubscribe from the stream
        if (callbacks.size === 0) {
          this.unsubscribe(stream)
        }
      }
    }
  }

  /**
   * Connect to multiple streams with a single callback
   * Returns an unsubscribe function
   */
  public connectToStreams(streams: string[], callback: (data: any) => void): () => void {
    // Subscribe to each stream
    streams.forEach((stream) => this.subscribe(stream, callback))

    // Return function to unsubscribe from all streams
    return () => {
      streams.forEach((stream) => {
        const callbacks = this.subscriptions.get(stream)
        if (callbacks) {
          callbacks.delete(callback)
          if (callbacks.size === 0) {
            this.unsubscribe(stream)
          }
        }
      })
    }
  }

  /**
   * Attempt to reconnect to the WebSocket server
   */
  private attemptReconnect(): void {
    if (this.isReconnecting) return

    this.isReconnecting = true
    this.reconnectAttempts++

    if (this.reconnectAttempts <= this.options.reconnectAttempts!) {
      // Exponential backoff with jitter
      const jitter = Math.random() * 0.5 + 0.75 // Random value between 0.75 and 1.25
      const delay = Math.min(30000, this.reconnectDelay * jitter) // Cap at 30 seconds

      this.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.options.reconnectAttempts}) in ${Math.round(delay)}ms...`,
      )

      setTimeout(() => {
        this.isReconnecting = false

        // Check if we're already connected before attempting to reconnect
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.log("Already reconnected, skipping reconnection attempt")
          return
        }

        // Close any existing connection before creating a new one
        if (this.ws) {
          try {
            this.ws.close()
          } catch (err) {
            this.log("Error while closing existing connection:", err)
          }
          this.ws = null
        }

        this.connect()
        this.reconnectDelay *= 2 // Exponential backoff
      }, delay)
    } else {
      this.log(`Failed to reconnect after ${this.options.reconnectAttempts} attempts`)
      this.isReconnecting = false

      // Reset reconnection parameters for next manual reconnection attempt
      setTimeout(() => {
        this.reconnectAttempts = 0
        this.reconnectDelay = this.options.reconnectDelay || 1000
      }, 60000) // Wait 1 minute before allowing reconnection attempts again
    }
  }

  /**
   * Resubscribe to all streams after reconnection
   */
  private resubscribeAll(): void {
    if (!this.isConnected() || this.subscriptions.size === 0) return

    const streams = Array.from(this.subscriptions.keys())
    if (streams.length > 0) {
      this.log(`Resubscribing to ${streams.length} streams...`)

      const subscribeMsg = {
        method: "SUBSCRIBE",
        params: streams,
        id: Date.now(),
      }

      this.ws?.send(JSON.stringify(subscribeMsg))
    }
  }

  /**
   * Check WebSocket health and reconnect if needed
   */
  private checkConnectionHealth(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log("WebSocket not connected, attempting to reconnect...")
      this.attemptReconnect()
      return
    }

    // Check if we've received a pong recently
    const now = Date.now()
    if (now - this.lastPongTime > 30000) {
      // No pong for 30 seconds
      this.log("No pong received for 30 seconds, reconnecting...")
      this.forceReconnect()
    }
  }

  /**
   * Set up ping interval to keep connection alive
   */
  private setupPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
    }

    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        // Send ping
        try {
          this.ws?.send(JSON.stringify({ ping: Date.now() }))
        } catch (error) {
          errorHandler.handleError(error as Error, "Error sending ping", {
            service: "BinanceWebSocketClient",
            method: "setupPingInterval",
          })
          this.forceReconnect()
          return
        }

        // Check connection health
        this.checkConnectionHealth()
      } else {
        // Connection lost, try to reconnect
        this.attemptReconnect()
      }
    }, 15000) // Send ping every 15 seconds
  }

  /**
   * Notify all subscribers of a stream about new data
   */
  private notifySubscribers(stream: string, data: any): void {
    const callbacks = this.subscriptions.get(stream)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data)
        } catch (error) {
          errorHandler.handleError(error as Error, `Error in WebSocket callback for stream ${stream}`, {
            service: "BinanceWebSocketClient",
            method: "notifySubscribers",
            stream,
          })
        }
      })
    }
  }

  /**
   * Get active streams
   */
  public getActiveStreams(): string[] {
    return Array.from(this.subscriptions.keys())
  }

  /**
   * Log messages if debug is enabled
   */
  private log(...args: any[]): void {
    if (this.options.debug) {
      console.log("[BinanceWebSocketClient]", ...args)
    }
  }
}

// Create singleton instance
export const binanceWebSocketClient = new BinanceWebSocketClient({ debug: true })
