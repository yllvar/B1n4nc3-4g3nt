/**
 * Mock WebSocket Client
 * A drop-in replacement for the real WebSocket client for testing
 */

import { mockWebSocketService } from "./mock-websocket-service"

export class MockWebSocketClient {
  private callbacks: Map<string, Set<(data: any) => void>> = new Map()
  private _isConnected = false

  constructor() {
    // Set up event listeners for the mock service
    mockWebSocketService.on("open", () => {
      this._isConnected = true
      console.log("[MockWebSocketClient] Connected")
    })

    mockWebSocketService.on("close", () => {
      this._isConnected = false
      console.log("[MockWebSocketClient] Disconnected")
    })

    mockWebSocketService.on("error", (error) => {
      console.error("[MockWebSocketClient] Error:", error)
    })

    mockWebSocketService.on("message", (event) => {
      try {
        const message = JSON.parse(event.data)

        if (message.stream && message.data) {
          // Handle combined stream format
          const { stream, data } = message
          this.notifyCallbacks(stream, data)
        } else {
          // Handle direct format
          const streamName = this.getStreamNameFromData(message)
          if (streamName) {
            this.notifyCallbacks(streamName, message)
          }
        }
      } catch (error) {
        console.error("[MockWebSocketClient] Error parsing message:", error)
      }
    })
  }

  private getStreamNameFromData(data: any): string | null {
    // Try to determine stream name from data
    if (data.s && data.e) {
      return `${data.s.toLowerCase()}@${data.e.toLowerCase()}`
    }
    return null
  }

  private notifyCallbacks(stream: string, data: any): void {
    // Notify all callbacks for this stream
    const callbacks = this.callbacks.get(stream)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data)
        } catch (error) {
          console.error(`[MockWebSocketClient] Error in callback for ${stream}:`, error)
        }
      })
    }
  }

  public connect(): void {
    mockWebSocketService.connect()
  }

  public disconnect(): void {
    mockWebSocketService.disconnect()
  }

  public isConnected(): boolean {
    return this._isConnected
  }

  public subscribe(stream: string, callback: (data: any) => void): void {
    if (!this.callbacks.has(stream)) {
      this.callbacks.set(stream, new Set())
      mockWebSocketService.subscribe(stream)
    }

    this.callbacks.get(stream)?.add(callback)
  }

  public unsubscribe(stream: string): void {
    if (this.callbacks.has(stream)) {
      this.callbacks.delete(stream)
      mockWebSocketService.unsubscribe(stream)
    }
  }

  public connectToStream(stream: string, callback: (data: any) => void): () => void {
    if (!this.isConnected) {
      mockWebSocketService.connect()
    }

    this.subscribe(stream, callback)

    return () => {
      this.unsubscribe(stream)
    }
  }

  public connectToStreams(streams: string[], callback: (data: any) => void): () => void {
    if (!this.isConnected) {
      mockWebSocketService.connect()
    }

    streams.forEach((stream) => {
      this.subscribe(stream, callback)
    })

    return () => {
      streams.forEach((stream) => {
        this.unsubscribe(stream)
      })
    }
  }

  public forceReconnect(): void {
    mockWebSocketService.disconnect()
    setTimeout(() => {
      mockWebSocketService.connect().then(() => {
        // Resubscribe to all streams
        this.callbacks.forEach((_, stream) => {
          mockWebSocketService.subscribe(stream)
        })
      })
    }, 500)
  }

  public getActiveStreams(): string[] {
    return Array.from(this.callbacks.keys())
  }
}

// Export a singleton instance
export const mockWebSocketClient = new MockWebSocketClient()
