/**
 * WebSocket Types
 * Types related to WebSocket connections and data
 */

// WebSocket connection states
export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting" | "error"

// WebSocket status
export type WebSocketStatus = "connected" | "connecting" | "disconnected" | "reconnecting" | "error" | "fallback"

/**
 * Metrics for a single WebSocket connection
 */
export interface ConnectionMetrics {
  connectionState: ConnectionState
  reconnectAttempts: number
  lastConnectedAt: number | null
  lastDisconnectedAt: number | null
  messageCount: number
  errorCount: number
  latency: number | null
}

/**
 * Aggregated metrics for the WebSocket client
 */
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

/**
 * WebSocket event information
 */
export interface WebSocketEvent {
  type: "connect" | "disconnect" | "message" | "error" | "state_change" | "heartbeat" | "reconnect"
  timestamp: number
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

/**
 * WebSocket client configuration options
 */
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

/**
 * WebSocket subscription response
 */
export interface SubscriptionResponse {
  id: string | number
  result: any | null
  error: any | null
}

/**
 * WebSocket client interface
 * Defines methods for managing WebSocket connections
 */
export interface WebSocketClientInterface {
  connect(stream: string, messageHandler?: (data: any) => void): void
  disconnect(stream: string): void
  disconnectAll(): void
  getStatus(): WebSocketStatus
  getMetrics(): WebSocketMetrics
  getActiveStreams(): string[]
  forceReconnect(): void
  isFallbackMode(): boolean
  resetCircuitBreaker(): void
  subscribeToStream(stream: string, callback: (data: any) => void): () => void
  connectToStreams(streams: string[], callback: (data: any) => void): () => void
  subscribe(callback: (status: WebSocketStatus, metrics: WebSocketMetrics) => void): () => void
  addEventListener(id: string, callback: (event: WebSocketEvent) => void): () => void
}
