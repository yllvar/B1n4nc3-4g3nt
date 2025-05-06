/**
 * Binance WebSocket Client
 * Handles connection management, reconnection, and message parsing
 */
import { webSocketMonitorRegistry } from "./websocket-monitor"
import { v4 as uuidv4 } from "uuid"

type WebSocketMessage = {
  e?: string // Event type
  E?: number // Event time
  s?: string // Symbol
  p?: string // Price
  q?: string // Quantity
  T?: number // Trade time
  m?: boolean // Is buyer market maker
  a?: number // Aggregate trade ID
  [key: string]: any // Other fields
}

type WebSocketCallback = (data: any) => void

export class BinanceWebSocketClient {
  private socket: WebSocket | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private heartbeatTimeoutId: NodeJS.Timeout | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private callbacks: Map<string, WebSocketCallback[]> = new Map()
  private isClosing = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000 // Start with 3 seconds
  private lastHeartbeatSentTime = 0
  private lastPongTime = 0
  private activeStreams: Set<string> = new Set()
  private apiKey: string | undefined
  private listenKey: string | null = null

  constructor(private baseUrl = "wss://fstream.binance.com") {
    this.apiKey = process.env.BINANCE_API_KEY
  }

  /**
   * Connect to a single WebSocket stream
   */
  public connectToStream(streamName: string, callback: WebSocketCallback): () => void {
    const url = `${this.baseUrl}/ws/${streamName}`
    this.activeStreams.add(streamName)
    const monitor = webSocketMonitorRegistry.getMonitor(streamName)
    return this.connect(url, callback, streamName)
  }

  /**
   * Connect to multiple WebSocket streams
   */
  public connectToStreams(streams: string[], callback: WebSocketCallback): () => void {
    const streamsParam = streams.join("/")
    const url = `${this.baseUrl}/stream?streams=${streamsParam}`

    // Register all streams with the monitor registry
    streams.forEach((stream) => {
      this.activeStreams.add(stream)
      webSocketMonitorRegistry.getMonitor(stream)
    })

    return this.connect(url, callback, streams.join(","))
  }

  /**
   * Connect to WebSocket and set up event handlers
   */
  private connect(url: string, callback: WebSocketCallback, streamKey: string): () => void {
    try {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        // Update connection status for all active streams
        this.activeStreams.forEach((stream) => {
          const monitor = webSocketMonitorRegistry.getMonitor(stream)
          monitor.setConnectionStatus("connecting")
        })

        this.socket = new WebSocket(url)
        this.setupSocketHandlers()
      }

      // Register callback
      if (!this.callbacks.has(streamKey)) {
        this.callbacks.set(streamKey, [])
      }
      this.callbacks.get(streamKey)?.push(callback)

      // Return unsubscribe function
      return () => {
        const callbackList = this.callbacks.get(streamKey) || []
        const index = callbackList.indexOf(callback)
        if (index !== -1) {
          callbackList.splice(index, 1)
        }
        if (callbackList.length === 0) {
          this.callbacks.delete(streamKey)

          // Remove from active streams and cleanup monitor
          if (streamKey.includes(",")) {
            // For combined streams, split and handle each
            streamKey.split(",").forEach((stream) => {
              this.activeStreams.delete(stream)
              if (!this.isStreamActive(stream)) {
                webSocketMonitorRegistry.removeMonitor(stream)
              }
            })
          } else {
            this.activeStreams.delete(streamKey)
            if (!this.isStreamActive(streamKey)) {
              webSocketMonitorRegistry.removeMonitor(streamKey)
            }
          }
        }

        // If no more callbacks, close the socket
        if (this.callbacks.size === 0) {
          this.close()
        }
      }
    } catch (error) {
      console.error("Error connecting to WebSocket:", error)

      // Record error in monitors
      this.activeStreams.forEach((stream) => {
        const monitor = webSocketMonitorRegistry.getMonitor(stream)
        monitor.recordError(error instanceof Error ? error : new Error(String(error)))
        monitor.setConnectionStatus("disconnected")
      })

      throw error
    }
  }

  /**
   * Check if a stream is still active in any combined stream
   */
  private isStreamActive(streamName: string): boolean {
    for (const activeStream of this.activeStreams) {
      if (activeStream === streamName || activeStream.includes(streamName)) {
        return true
      }
    }
    return false
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupSocketHandlers() {
    if (!this.socket) return

    this.socket.onopen = () => {
      console.log("WebSocket connection established")
      this.isClosing = false
      this.reconnectAttempts = 0
      this.setupHeartbeat()

      // Update connection status for all active streams
      this.activeStreams.forEach((stream) => {
        const monitor = webSocketMonitorRegistry.getMonitor(stream)
        monitor.setConnectionStatus("connected")
      })
    }

    this.socket.onmessage = (event) => {
      try {
        const messageSize = event.data.length
        const data = JSON.parse(event.data)

        // Handle ping/pong responses
        if (data.result !== undefined && data.id) {
          // This is likely a response to our ping
          if (this.lastHeartbeatSentTime > 0) {
            const latency = Date.now() - this.lastHeartbeatSentTime
            this.lastPongTime = Date.now()

            // Clear the timeout since we got a response
            if (this.heartbeatTimeoutId) {
              clearTimeout(this.heartbeatTimeoutId)
              this.heartbeatTimeoutId = null
            }

            // Record ping latency in all active monitors
            this.activeStreams.forEach((stream) => {
              const monitor = webSocketMonitorRegistry.getMonitor(stream)
              monitor.recordPingLatency(latency)
            })

            // If we received a listenKey in the response, store it
            if (data.result && data.result.listenKey) {
              this.listenKey = data.result.listenKey
            }

            return
          }
        }

        // Handle combined stream format
        if (data.stream && data.data) {
          const streamName = data.stream.split("@")[0]
          this.dispatchMessage(streamName, data.data)

          // Record message in monitor
          const monitor = webSocketMonitorRegistry.getMonitor(streamName)
          monitor.recordMessage(messageSize)
          return
        }

        // Handle single stream format
        if (data.e) {
          const streamName = data.s?.toLowerCase() || ""
          this.dispatchMessage(streamName, data)

          // Record message in monitor
          const monitor = webSocketMonitorRegistry.getMonitor(streamName)
          monitor.recordMessage(messageSize)
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error)

        // Record error in all active monitors
        this.activeStreams.forEach((stream) => {
          const monitor = webSocketMonitorRegistry.getMonitor(stream)
          monitor.recordError(error instanceof Error ? error : new Error(String(error)))
        })
      }
    }

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error)

      // Record error in all active monitors
      this.activeStreams.forEach((stream) => {
        const monitor = webSocketMonitorRegistry.getMonitor(stream)
        monitor.recordError(error instanceof Error ? error : new Error("WebSocket error"))
      })
    }

    this.socket.onclose = (event) => {
      console.log(`WebSocket connection closed: ${event.code} ${event.reason}`)
      this.clearHeartbeat()

      // Update connection status for all active streams
      this.activeStreams.forEach((stream) => {
        const monitor = webSocketMonitorRegistry.getMonitor(stream)
        monitor.setConnectionStatus("disconnected")
      })

      // Only attempt to reconnect if not intentionally closed
      if (!this.isClosing) {
        this.attemptReconnect()
      }
    }
  }

  /**
   * Dispatch message to registered callbacks
   */
  private dispatchMessage(streamName: string, data: any) {
    // Check for stale data
    if (data.E && Date.now() - data.E > 10000) {
      // Data is more than 10 seconds old
      const monitor = webSocketMonitorRegistry.getMonitor(streamName)
      monitor.recordStaleData()
    }

    // Dispatch to specific stream callbacks
    const callbacks = this.callbacks.get(streamName)
    if (callbacks) {
      callbacks.forEach((callback) => callback(data))
    }

    // Dispatch to all callbacks that registered for multiple streams
    this.callbacks.forEach((callbackList, key) => {
      if (key.includes(",") && key.includes(streamName)) {
        callbackList.forEach((callback) => callback(data))
      }
    })
  }

  /**
   * Set up heartbeat mechanism to keep connection alive
   * Uses Binance-specific ping format and handles responses
   */
  private setupHeartbeat(): void {
    this.clearHeartbeat()

    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        console.warn("Heartbeat failed - connection not open")
        return
      }

      try {
        this.lastHeartbeatSentTime = Date.now()

        // Create a unique ID for this ping request
        const pingId = uuidv4()

        // Format ping based on Binance WebSocket API
        const pingMessage = {
          id: pingId,
          method: "ping",
          params: {},
        }

        // If we have a user data stream with a listen key, use that format instead
        if (this.listenKey && this.apiKey) {
          pingMessage.method = "userDataStream.ping"
          pingMessage.params = {
            apiKey: this.apiKey,
            listenKey: this.listenKey,
          }
        }

        // Send the ping
        this.socket.send(JSON.stringify(pingMessage))

        // Set timeout to check for response
        this.heartbeatTimeoutId = setTimeout(() => {
          const elapsed = Date.now() - this.lastHeartbeatSentTime
          console.warn(`No heartbeat response received after ${elapsed}ms`)

          // If we haven't received a response in 10 seconds, reconnect
          if (elapsed > 10000) {
            console.error("Heartbeat timeout - forcing reconnection")
            this.forceReconnect()
          }
        }, 10000) // 10 second timeout for heartbeat response
      } catch (error) {
        console.error("Error sending heartbeat:", error)
        this.forceReconnect()
      }
    }, 30000) // 30 second interval
  }

  /**
   * Clear heartbeat interval and timeout
   */
  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId)
      this.heartbeatTimeoutId = null
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Maximum reconnection attempts reached")
      return
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    const delay = Math.min(30000, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts))
    console.log(`Attempting to reconnect in ${delay}ms...`)

    // Update connection status for all active streams
    this.activeStreams.forEach((stream) => {
      const monitor = webSocketMonitorRegistry.getMonitor(stream)
      monitor.setConnectionStatus("reconnecting")
    })

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++

      // Recreate all subscriptions
      const streams: string[] = []
      this.callbacks.forEach((_, key) => {
        if (!key.includes(",")) {
          streams.push(key)
        }
      })

      if (streams.length > 0) {
        this.socket = new WebSocket(`${this.baseUrl}/stream?streams=${streams.join("/")}`)
        this.setupSocketHandlers()
      }
    }, delay)
  }

  /**
   * Force reconnection to the WebSocket
   */
  public forceReconnect(): void {
    console.log("Forcing WebSocket reconnection...")

    // Clear all intervals and timeouts
    this.clearHeartbeat()

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    // Close existing connection if any
    if (this.socket) {
      try {
        // Mark as intentionally closing to prevent auto-reconnect in onclose
        const wasClosing = this.isClosing
        this.isClosing = true

        this.socket.close()

        // Restore closing state
        this.isClosing = wasClosing
      } catch (err) {
        console.error("Error closing socket during force reconnect:", err)
      }

      this.socket = null
    }

    // Reset reconnection parameters
    this.reconnectAttempts = 0

    // Update connection status for all active streams
    this.activeStreams.forEach((stream) => {
      const monitor = webSocketMonitorRegistry.getMonitor(stream)
      monitor.setConnectionStatus("reconnecting")
    })

    // Recreate all subscriptions after a short delay
    setTimeout(() => {
      const streams: string[] = []
      this.callbacks.forEach((_, key) => {
        if (!key.includes(",")) {
          streams.push(key)
        }
      })

      if (streams.length > 0) {
        const url = `${this.baseUrl}/stream?streams=${streams.join("/")}`
        this.socket = new WebSocket(url)
        this.setupSocketHandlers()
      } else if (this.activeStreams.size > 0) {
        // If we have active streams but no callbacks, reconnect to the first stream
        const firstStream = Array.from(this.activeStreams)[0]
        const url = `${this.baseUrl}/ws/${firstStream}`
        this.socket = new WebSocket(url)
        this.setupSocketHandlers()
      }
    }, 100) // Short delay before reconnecting
  }

  /**
   * Close WebSocket connection
   */
  public close() {
    this.isClosing = true
    this.clearHeartbeat()

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    // Update connection status for all active streams
    this.activeStreams.forEach((stream) => {
      const monitor = webSocketMonitorRegistry.getMonitor(stream)
      monitor.setConnectionStatus("disconnecting")
    })

    if (this.socket) {
      this.socket.close()
      this.socket = null
    }

    this.callbacks.clear()
    this.activeStreams.clear()
  }

  /**
   * Get active streams
   */
  public getActiveStreams(): string[] {
    return Array.from(this.activeStreams)
  }

  /**
   * Check if the WebSocket is connected
   */
  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN
  }

  /**
   * Get the time of the last successful heartbeat response
   */
  public getLastPongTime(): number {
    return this.lastPongTime
  }

  /**
   * Get the current connection health as a percentage (0-100)
   * Based on heartbeat responses and reconnection attempts
   */
  public getConnectionHealth(): number {
    if (!this.isConnected()) {
      return 0
    }

    // If we've never received a pong, return a low health
    if (this.lastPongTime === 0) {
      return 20
    }

    // Calculate health based on time since last pong
    const timeSinceLastPong = Date.now() - this.lastPongTime

    // If we've received a pong in the last 30 seconds, we're healthy
    if (timeSinceLastPong < 30000) {
      return 100
    }

    // If it's been between 30-60 seconds, health decreases
    if (timeSinceLastPong < 60000) {
      return 75
    }

    // If it's been between 1-2 minutes, health is poor
    if (timeSinceLastPong < 120000) {
      return 50
    }

    // If it's been over 2 minutes, health is critical
    return 25
  }
}

// Create singleton instance
export const binanceWebSocketClient = new BinanceWebSocketClient()
