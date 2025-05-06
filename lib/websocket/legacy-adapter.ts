/**
 * Legacy WebSocket Client Adapter
 * Provides backward compatibility with the old WebSocket client interface
 */
import { binanceConnectionManager } from "./websocket-connection-manager"

// This adapter implements the old WebSocketClient interface
// to make migration easier
export class LegacyWebSocketAdapter {
  /**
   * Connect to a single WebSocket stream
   */
  public connectToStream(streamName: string, callback: (data: any) => void): () => void {
    return binanceConnectionManager.subscribe(streamName, callback)
  }

  /**
   * Connect to multiple WebSocket streams
   */
  public connectToStreams(streams: string[], callback: (data: any) => void): () => void {
    return binanceConnectionManager.connectToStreams(streams, callback)
  }

  /**
   * Check if the WebSocket is connected
   */
  public isConnected(): boolean {
    return binanceConnectionManager.isConnected()
  }

  /**
   * Force reconnection to the WebSocket
   */
  public forceReconnect(): void {
    binanceConnectionManager.forceReconnect()
  }

  /**
   * Get active streams
   */
  public getActiveStreams(): string[] {
    return binanceConnectionManager.getActiveStreams()
  }

  /**
   * Close WebSocket connection
   */
  public close(): void {
    binanceConnectionManager.disconnect()
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): void {
    binanceConnectionManager.connect()
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    binanceConnectionManager.disconnect()
  }
}

// Create singleton instance
export const binanceWebSocketClient = new LegacyWebSocketAdapter()
