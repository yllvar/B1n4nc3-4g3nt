/**
 * WebSocket Tests
 * Tests for the WebSocket client functionality
 */

import { assert, assertEquals } from "./console-test-runner"
import { binanceConnectionManager } from "@/lib/websocket/websocket-connection-manager"

export const websocketTests = {
  "should connect to WebSocket server": async () => {
    // Force reconnect to ensure we're testing a fresh connection
    binanceConnectionManager.forceReconnect()

    // Wait for connection to establish
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Check connection status
    const isConnected = binanceConnectionManager.isConnected()
    assert(isConnected, "WebSocket should be connected")
  },

  "should get connection metrics": () => {
    const metrics = binanceConnectionManager.getMetrics()

    assert(metrics !== null, "Metrics should not be null")
    assert(typeof metrics === "object", "Metrics should be an object")
    assert(typeof metrics.uptime === "number", "Uptime should be a number")
    assert(typeof metrics.messageRate === "number", "Message rate should be a number")
  },

  "should subscribe to a stream": async () => {
    let messageReceived = false
    const symbol = "btcusdt"
    const streamName = `${symbol}@trade`

    const unsubscribe = binanceConnectionManager.subscribe(streamName, () => {
      messageReceived = true
    })

    // Wait for message
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Clean up
    unsubscribe()

    assert(messageReceived, `Should receive message from ${streamName}`)
  },

  "should handle multiple streams": async () => {
    const receivedMessages: Record<string, boolean> = {
      trade: false,
      bookTicker: false,
    }

    const symbol = "btcusdt"
    const streams = [`${symbol}@trade`, `${symbol}@bookTicker`]

    const unsubscribe = binanceConnectionManager.connectToStreams(streams, (data) => {
      if (data.e === "trade") {
        receivedMessages.trade = true
      } else if (data.a && data.b) {
        // bookTicker has ask and bid prices
        receivedMessages.bookTicker = true
      }
    })

    // Wait for messages
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // Clean up
    unsubscribe()

    assert(receivedMessages.trade, "Should receive trade message")
    assert(receivedMessages.bookTicker, "Should receive bookTicker message")
  },

  "should handle reconnection": async () => {
    // First ensure we're connected
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const initialStatus = binanceConnectionManager.getConnectionState()

    // Force reconnect
    binanceConnectionManager.forceReconnect()

    // Wait for reconnection
    await new Promise((resolve) => setTimeout(resolve, 3000))

    const finalStatus = binanceConnectionManager.getConnectionState()
    const isConnected = binanceConnectionManager.isConnected()

    assert(isConnected, "Should be connected after reconnection")
    assertEquals(finalStatus, "connected", "Status should be 'connected' after reconnection")
  },

  "should reset circuit breaker": () => {
    binanceConnectionManager.resetCircuitBreaker()

    // This is more of a smoke test since we can't easily verify the internal state
    // But we can check that the connection is still working
    const isConnected = binanceConnectionManager.isConnected()
    assert(isConnected, "Should still be connected after circuit breaker reset")
  },
}
