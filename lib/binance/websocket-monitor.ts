/**
 * WebSocket Monitoring Service
 * Tracks connection status, performance metrics, and data quality
 */

export interface WebSocketMetrics {
  // Connection metrics
  connectionStatus: "connected" | "disconnecting" | "disconnected" | "connecting" | "reconnecting"
  connectionUptime: number // milliseconds
  lastConnectedAt: number | null // timestamp
  reconnectAttempts: number
  reconnectSuccesses: number

  // Performance metrics
  messageCount: number
  messageRate: number // messages per second
  averageMessageSize: number // bytes
  lastMessageReceivedAt: number | null // timestamp

  // Latency metrics
  pingLatency: number // milliseconds
  averageLatency: number // milliseconds

  // Error metrics
  errorCount: number
  lastError: Error | null
  lastErrorAt: number | null // timestamp

  // Data quality metrics
  dataGaps: number // detected gaps in data
  staleDataEvents: number // stale data events

  // Resource usage
  estimatedMemoryUsage: number // bytes
}

export class WebSocketMonitor {
  private metrics: WebSocketMetrics
  private startTime: number
  private messageRateInterval: NodeJS.Timeout | null = null
  private messageCountInWindow = 0
  private messageSizeSum = 0
  private latencySum = 0
  private latencyCount = 0
  private subscribers: Set<(metrics: WebSocketMetrics) => void> = new Set()
  private streamName: string

  constructor(streamName: string) {
    this.streamName = streamName
    this.startTime = Date.now()
    this.metrics = {
      connectionStatus: "disconnected",
      connectionUptime: 0,
      lastConnectedAt: null,
      reconnectAttempts: 0,
      reconnectSuccesses: 0,
      messageCount: 0,
      messageRate: 0,
      averageMessageSize: 0,
      lastMessageReceivedAt: null,
      pingLatency: 0,
      averageLatency: 0,
      errorCount: 0,
      lastError: null,
      lastErrorAt: null,
      dataGaps: 0,
      staleDataEvents: 0,
      estimatedMemoryUsage: 0,
    }

    // Start calculating message rate (messages per second)
    this.messageRateInterval = setInterval(() => {
      this.metrics.messageRate = this.messageCountInWindow
      this.messageCountInWindow = 0
      this.notifySubscribers()
    }, 1000)
  }

  /**
   * Update connection status
   */
  public setConnectionStatus(status: WebSocketMetrics["connectionStatus"]): void {
    const previousStatus = this.metrics.connectionStatus
    this.metrics.connectionStatus = status

    if (status === "connected") {
      if (previousStatus !== "connected") {
        this.metrics.lastConnectedAt = Date.now()
        if (previousStatus === "reconnecting") {
          this.metrics.reconnectSuccesses++
        }
      }
    } else if (status === "reconnecting") {
      this.metrics.reconnectAttempts++
    }

    this.notifySubscribers()
  }

  /**
   * Record a received message
   */
  public recordMessage(messageSize: number): void {
    this.metrics.messageCount++
    this.messageCountInWindow++
    this.metrics.lastMessageReceivedAt = Date.now()

    // Update average message size
    this.messageSizeSum += messageSize
    this.metrics.averageMessageSize = this.messageSizeSum / this.metrics.messageCount

    // Update connection uptime if connected
    if (this.metrics.connectionStatus === "connected" && this.metrics.lastConnectedAt) {
      this.metrics.connectionUptime = Date.now() - this.metrics.lastConnectedAt
    }

    // Estimate memory usage (very rough approximation)
    this.metrics.estimatedMemoryUsage = this.messageSizeSum * 2 // Rough estimate: 2x the total message size

    this.notifySubscribers()
  }

  /**
   * Record ping latency
   */
  public recordPingLatency(latency: number): void {
    this.metrics.pingLatency = latency

    // Update average latency
    this.latencySum += latency
    this.latencyCount++
    this.metrics.averageLatency = this.latencySum / this.latencyCount

    this.notifySubscribers()
  }

  /**
   * Record an error
   */
  public recordError(error: Error): void {
    this.metrics.errorCount++
    this.metrics.lastError = error
    this.metrics.lastErrorAt = Date.now()

    this.notifySubscribers()
  }

  /**
   * Record a data gap
   */
  public recordDataGap(): void {
    this.metrics.dataGaps++
    this.notifySubscribers()
  }

  /**
   * Record stale data
   */
  public recordStaleData(): void {
    this.metrics.staleDataEvents++
    this.notifySubscribers()
  }

  /**
   * Get current metrics
   */
  public getMetrics(): WebSocketMetrics {
    return { ...this.metrics }
  }

  /**
   * Subscribe to metrics updates
   */
  public subscribe(callback: (metrics: WebSocketMetrics) => void): () => void {
    this.subscribers.add(callback)

    // Immediately call with current metrics
    callback(this.getMetrics())

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback)
    }
  }

  /**
   * Notify all subscribers of metrics update
   */
  private notifySubscribers(): void {
    const metrics = this.getMetrics()
    this.subscribers.forEach((callback) => {
      try {
        callback(metrics)
      } catch (error) {
        console.error("Error in WebSocketMonitor subscriber:", error)
      }
    })
  }

  /**
   * Get stream name
   */
  public getStreamName(): string {
    return this.streamName
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.messageRateInterval) {
      clearInterval(this.messageRateInterval)
      this.messageRateInterval = null
    }
    this.subscribers.clear()
  }
}

/**
 * Global WebSocket monitoring registry
 */
class WebSocketMonitorRegistry {
  private monitors: Map<string, WebSocketMonitor> = new Map()

  /**
   * Get or create a monitor for a stream
   */
  public getMonitor(streamName: string): WebSocketMonitor {
    if (!this.monitors.has(streamName)) {
      this.monitors.set(streamName, new WebSocketMonitor(streamName))
    }
    return this.monitors.get(streamName)!
  }

  /**
   * Get all monitors
   */
  public getAllMonitors(): WebSocketMonitor[] {
    return Array.from(this.monitors.values())
  }

  /**
   * Remove a monitor
   */
  public removeMonitor(streamName: string): void {
    const monitor = this.monitors.get(streamName)
    if (monitor) {
      monitor.dispose()
      this.monitors.delete(streamName)
    }
  }
}

// Create singleton instance
export const webSocketMonitorRegistry = new WebSocketMonitorRegistry()
