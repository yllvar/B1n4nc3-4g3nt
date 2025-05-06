/**
 * WebSocket Client Tests
 *
 * These tests verify the functionality of the BinanceWebSocketClient
 */
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest"
import { BinanceWebSocketClient } from "../lib/binance/websocket-client"
import { webSocketMonitorRegistry } from "../lib/binance/websocket-monitor"

// Mock WebSocket
class MockWebSocket {
  url: string
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: ((event: { code: number; reason: string }) => void) | null = null
  onerror: ((error: Error) => void) | null = null
  readyState = 0
  OPEN = 1

  constructor(url: string) {
    this.url = url
    this.readyState = this.OPEN
    // Simulate connection
    setTimeout(() => {
      if (this.onopen) this.onopen()
    }, 0)
  }

  send(data: string): void {}
  close(): void {
    if (this.onclose) this.onclose({ code: 1000, reason: "Normal closure" })
  }
}

// Mock the global WebSocket
vi.stubGlobal("WebSocket", MockWebSocket)

// Mock the monitor registry
vi.mock("../lib/binance/websocket-monitor", () => {
  return {
    webSocketMonitorRegistry: {
      getMonitor: vi.fn().mockReturnValue({
        setConnectionStatus: vi.fn(),
        recordMessage: vi.fn(),
        recordError: vi.fn(),
        recordPingLatency: vi.fn(),
        recordStaleData: vi.fn(),
        recordDataGap: vi.fn(),
      }),
      removeMonitor: vi.fn(),
    },
  }
})

describe("BinanceWebSocketClient", () => {
  let client: BinanceWebSocketClient
  let mockCallback: Mock

  beforeEach(() => {
    client = new BinanceWebSocketClient("wss://test.example.com")
    mockCallback = vi.fn()
    vi.clearAllMocks()
  })

  afterEach(() => {
    client.close()
  })

  it("should connect to a single stream", () => {
    const unsubscribe = client.connectToStream("btcusdt@aggTrade", mockCallback)

    expect(unsubscribe).toBeInstanceOf(Function)
    expect(webSocketMonitorRegistry.getMonitor).toHaveBeenCalledWith("btcusdt@aggTrade")
  })

  it("should connect to multiple streams", () => {
    const streams = ["btcusdt@aggTrade", "ethusdt@aggTrade"]
    const unsubscribe = client.connectToStreams(streams, mockCallback)

    expect(unsubscribe).toBeInstanceOf(Function)
    streams.forEach((stream) => {
      expect(webSocketMonitorRegistry.getMonitor).toHaveBeenCalledWith(stream)
    })
  })

  it("should handle messages from the WebSocket", () => {
    client.connectToStream("btcusdt@aggTrade", mockCallback)

    // Get the WebSocket instance
    const ws = (client as any).socket as MockWebSocket

    // Simulate a message
    const message = {
      e: "aggTrade",
      s: "BTCUSDT",
      p: "50000",
      q: "1",
      T: Date.now(),
      m: false,
    }

    ws.onmessage?.({ data: JSON.stringify(message) })

    expect(mockCallback).toHaveBeenCalledWith(message)
    expect(webSocketMonitorRegistry.getMonitor("btcusdt@aggTrade").recordMessage).toHaveBeenCalled()
  })

  it("should handle combined stream messages", () => {
    client.connectToStreams(["btcusdt@aggTrade", "ethusdt@aggTrade"], mockCallback)

    // Get the WebSocket instance
    const ws = (client as any).socket as MockWebSocket

    // Simulate a combined stream message
    const message = {
      stream: "btcusdt@aggTrade",
      data: {
        e: "aggTrade",
        s: "BTCUSDT",
        p: "50000",
        q: "1",
        T: Date.now(),
        m: false,
      },
    }

    ws.onmessage?.({ data: JSON.stringify(message) })

    expect(mockCallback).toHaveBeenCalledWith(message.data)
    expect(webSocketMonitorRegistry.getMonitor("btcusdt").recordMessage).toHaveBeenCalled()
  })

  it("should handle WebSocket errors", () => {
    client.connectToStream("btcusdt@aggTrade", mockCallback)

    // Get the WebSocket instance
    const ws = (client as any).socket as MockWebSocket

    // Simulate an error
    const error = new Error("WebSocket error")
    ws.onerror?.(error)

    expect(webSocketMonitorRegistry.getMonitor("btcusdt@aggTrade").recordError).toHaveBeenCalledWith(error)
  })

  it("should handle WebSocket closure", () => {
    client.connectToStream("btcusdt@aggTrade", mockCallback)

    // Get the WebSocket instance
    const ws = (client as any).socket as MockWebSocket

    // Simulate closure
    ws.onclose?.({ code: 1000, reason: "Normal closure" })

    expect(webSocketMonitorRegistry.getMonitor("btcusdt@aggTrade").setConnectionStatus).toHaveBeenCalledWith(
      "disconnected",
    )
  })

  it("should unsubscribe correctly", () => {
    const unsubscribe = client.connectToStream("btcusdt@aggTrade", mockCallback)

    // Unsubscribe
    unsubscribe()

    // Should have removed the callback
    expect((client as any).callbacks.size).toBe(0)
  })
})
