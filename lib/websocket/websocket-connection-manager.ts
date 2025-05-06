/**
 * WebSocket Connection Manager
 * Manages WebSocket connections with advanced features like circuit breaker,
 * heartbeat monitoring, and connection pooling
 */
import {
  UnifiedWebSocketClient,
  type ConnectionState,
  type WebSocketEvent,
  type WebSocketMetrics,
} from "./unified-websocket-client"
import { toast } from "@/components/ui/use-toast"
import { env } from "../env"

export interface ConnectionManagerOptions {
  baseUrl: string
  reconnectOptions?: {
    initialDelay: number
    maxDelay: number
    factor: number
    maxAttempts: number
  }
  heartbeatOptions?: {
    interval: number
    timeout: number
  }
  debug?: boolean
}

export class WebSocketConnectionManager {
  private client: UnifiedWebSocketClient
  private readonly baseUrl: string
  private connectionId: string | null = null
  private activeStreams: Set<string> = new Set()
  private metricsInterval: NodeJS.Timeout | null = null
  private metricsListeners: Set<(metrics: WebSocketMetrics) => void> = new Set()
  private lastMetrics: WebSocketMetrics | null = null

  constructor(options: ConnectionManagerOptions) {
    this.baseUrl = options.baseUrl
    this.client = new UnifiedWebSocketClient({
      baseUrl: options.baseUrl,
      initialBackoffDelay: options.reconnectOptions?.initialDelay || env.WS_RECONNECT_INITIAL_DELAY,
      maxBackoffDelay: options.reconnectOptions?.maxDelay || env.WS_RECONNECT_MAX_DELAY,
      backoffFactor: options.reconnectOptions?.factor || env.WS_RECONNECT_FACTOR,
      maxReconnectAttempts: options.reconnectOptions?.maxAttempts || env.WS_RECONNECT_MAX_ATTEMPTS,
      heartbeatInterval: options.heartbeatOptions?.interval || env.WS_HEARTBEAT_INTERVAL,
      heartbeatTimeout: options.heartbeatOptions?.timeout || env.WS_HEARTBEAT_TIMEOUT,
      debug: options.debug || false,
      autoReconnect: true,
    })

    // Set up event listeners
    this.setupEventListeners()

    // Start metrics collection
    this.startMetricsCollection()
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): Promise<void> {
    return Promise.resolve(this.client.connect(this.baseUrl))
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(stream?: string): void {
    if (stream) {
      this.client.disconnect(stream)
    } else {
      this.client.disconnectAll()
    }
  }

  /**
   * Subscribe to a WebSocket stream
   */
  public subscribe(stream: string, callback: (data: any) => void): () => void {
    this.activeStreams.add(stream)
    return this.client.subscribeToStream(stream, callback)
  }

  /**
   * Connect to multiple streams with a single callback
   */
  public connectToStreams(streams: string[], callback: (data: any) => void): () => void {
    streams.forEach((stream) => this.activeStreams.add(stream))
    return this.client.connectToStreams(streams, callback)
  }

  /**
   * Force reconnection to the WebSocket
   */
  public forceReconnect(): void {
    this.client.forceReconnect()
  }

  /**
   * Check if the WebSocket is connected
   */
  public isConnected(): boolean {
    return this.client.getStatus() === "connected"
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.client.getStatus() as ConnectionState
  }

  /**
   * Get WebSocket metrics
   */
  public getMetrics(): WebSocketMetrics {
    return this.client.getMetrics()
  }

  /**
   * Get active streams
   */
  public getActiveStreams(): string[] {
    return Array.from(this.activeStreams)
  }

  /**
   * Reset circuit breaker
   */
  public resetCircuitBreaker(): void {
    this.client.resetCircuitBreaker()
  }

  /**
   * Add metrics listener
   */
  public addMetricsListener(listener: (metrics: WebSocketMetrics) => void): () => void {
    this.metricsListeners.add(listener)

    // Send current metrics immediately if available
    if (this.lastMetrics) {
      try {
        listener(this.lastMetrics)
      } catch (error) {
        console.error("Error in metrics listener:", error)
      }
    }

    // Return unsubscribe function
    return () => {
      this.metricsListeners.delete(listener)
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    this.connectionId = "manager"

    this.client.addEventListener(this.connectionId, (event: WebSocketEvent) => {
      switch (event.type) {
        case "state_change":
          this.handleStateChange(event.state ?? "disconnected" as ConnectionState)
          break
        case "error":
          this.handleError(event.error ?? new Error("Unknown error"))
          break
        case "heartbeat":
          this.handleHeartbeat(event.success ?? false, event.latency ?? 0)
          break
        case "reconnect":
          this.handleReconnect(event.attempt ?? 0, event.maxAttempts ?? 5)
          break
      }
    })
  }

  /**
   * Handle state change events
   */
  private handleStateChange(state: ConnectionState): void {
    console.log(`WebSocket state changed to: ${state}`)
    
    // When connection fails, start fallback polling for active streams
    if (state === "disconnected") {
      this.activeStreams.forEach(stream => {
        const callbacks = this.client.getCallbacksForStream(stream)
        callbacks?.forEach(callback => {
          this.client.startFallbackPolling(stream, callback)
        })
      })
    }
    
    // When reconnected, stop fallback polling
    if (state === "connected") {
      this.activeStreams.forEach(stream => {
        this.client.stopFallbackPolling(stream)
      })
    }
  }

  /**
   * Handle error events
   */
  private handleError(error: Error): void {
    console.error("WebSocket error:", error)

    // Show toast notification for critical errors
    toast({
      title: "WebSocket Error",
      description: error.message,
      variant: "destructive",
    })
  }

  /**
   * Handle heartbeat events
   */
  private handleHeartbeat(success: boolean, latency?: number): void {
    if (!success) {
      console.warn("WebSocket heartbeat failed")
    } else if (latency && latency > 1000) {
      console.warn(`WebSocket high latency: ${latency}ms`)
    }
  }

  /**
   * Handle reconnect events
   */
  private handleReconnect(attempt: number, maxAttempts: number): void {
    console.log(`WebSocket reconnect attempt ${attempt}/${maxAttempts}`)
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
    }

    this.metricsInterval = setInterval(() => {
      const metrics = this.client.getMetrics()
      this.lastMetrics = metrics

      // Notify all listeners
      this.metricsListeners.forEach((listener) => {
        try {
          listener(metrics)
        } catch (error) {
          console.error("Error in metrics listener:", error)
        }
      })
    }, 1000) // Update metrics every second
  }
}

// Use the singleton instance from unified-websocket-client.ts
const unifiedWebSocketClient = require("../websocket/unified-websocket-client").unifiedWebSocketClient

// Export the connection manager with the client instance
export const binanceConnectionManager = {
  subscribe: (stream: string, callback: (data: any) => void) => {
    return unifiedWebSocketClient.subscribeToStream(stream, callback)
  },

  connectToStreams: (streams: string[], callback: (data: any) => void) => {
    return unifiedWebSocketClient.connectToStreams(streams, callback)
  },

  disconnect: (stream: string) => {
    unifiedWebSocketClient.disconnect(stream)
  },

  disconnectAll: () => {
    unifiedWebSocketClient.disconnectAll()
  },

  getConnectionState: () => {
    return unifiedWebSocketClient.getStatus()
  },

  isConnected: () => {
    return unifiedWebSocketClient.getStatus() === "connected"
  },

  getActiveStreams: () => {
    return unifiedWebSocketClient.getActiveStreams()
  },

  forceReconnect: () => {
    unifiedWebSocketClient.forceReconnect()
  },

  resetCircuitBreaker: () => {
    unifiedWebSocketClient.resetCircuitBreaker()
  },

  getMetrics: () => {
    return unifiedWebSocketClient.getMetrics()
  },

  // Add the missing addMetricsListener method
  addMetricsListener: (listener: (metrics: WebSocketMetrics) => void) => {
    // Create a subscription to the unified client's status updates
    const unsubscribe = unifiedWebSocketClient.subscribe((status: ConnectionState, metrics: WebSocketMetrics) => {
      listener(metrics)
    })

    return unsubscribe
  },
}
