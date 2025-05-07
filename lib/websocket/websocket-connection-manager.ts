/**
 * WebSocket Connection Manager
 * Manages WebSocket connections with advanced reconnection and error handling
 */
import { LegacyWebSocketAdapter } from "./legacy-adapter"

class BinanceWebSocketManager {
  private legacyAdapter: LegacyWebSocketAdapter

  constructor() {
    this.legacyAdapter = new LegacyWebSocketAdapter()
  }

  /**
   * Connect to a single stream with callback
   * Returns an unsubscribe function
   */
  public subscribe(stream: string, callback: (data: any) => void): () => void {
    return this.legacyAdapter.connectToStream(stream, callback)
  }

  /**
   * Connect to multiple streams with a single callback
   * Returns an unsubscribe function
   */
  public connectToStreams(streams: string[], callback: (data: any) => void): () => void {
    return this.legacyAdapter.connectToStreams(streams, callback)
  }

  /**
   * Check if the WebSocket is connected
   */
  public isConnected(): boolean {
    return this.legacyAdapter.isConnected()
  }

  /**
   * Force reconnection to the WebSocket
   */
  public forceReconnect(): void {
    this.legacyAdapter.forceReconnect()
  }

  /**
   * Get active streams
   */
  public getActiveStreams(): string[] {
    return this.legacyAdapter.getActiveStreams()
  }

  /**
   * Close WebSocket connection
   */
  public disconnect(): void {
    this.legacyAdapter.close()
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): void {
    this.legacyAdapter.connect()
  }

  /**
   * Get metrics
   */
  public getMetrics(): any {
    return {
      connectionHealth: 100,
      messageRate: 0,
      latency: 0,
      uptime: 0,
      reconnects: 0,
      lastMessageTime: null,
    }
  }

  public addMetricsListener(callback: any): any {
    return () => {}
  }

  public resetCircuitBreaker(): void {}
}

// Create singleton instance
export const binanceConnectionManager = new BinanceWebSocketManager()
