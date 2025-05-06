/**
 * Global Test Helpers
 * Expose testing utilities to the global window object for console testing
 */

import { binanceConnectionManager } from "@/lib/websocket/websocket-connection-manager"
import { errorHandler } from "@/lib/error-handling"
import { testRunner, assert, assertEquals } from "./console-test-runner"
import { websocketTests } from "./websocket-tests"

// Register test suites
testRunner.registerSuite("WebSocket", websocketTests)

// Create a global testing namespace
const testing = {
  // Test runner
  runner: testRunner,

  // Assertion utilities
  assert,
  assertEquals,

  // Quick test functions
  testConnection: async () => {
    console.log("Testing WebSocket connection...")
    const manager = binanceConnectionManager

    console.log("Current status:", manager.getConnectionState())
    console.log("Is connected:", manager.isConnected())

    console.log("Forcing reconnect...")
    manager.forceReconnect()

    await new Promise((r) => setTimeout(r, 2000))

    console.log("New status:", manager.getConnectionState())
    console.log("Is connected:", manager.isConnected())

    return manager.isConnected() ? "PASS" : "FAIL"
  },

  testSubscription: async (symbol = "btcusdt", streamType = "trade") => {
    console.log(`Testing subscription to ${symbol}@${streamType}...`)

    let messageReceived = false
    const streamName = `${symbol}@${streamType}`

    const unsubscribe = binanceConnectionManager.subscribe(streamName, (data) => {
      console.log("Received message:", data)
      messageReceived = true
    })

    console.log("Waiting for message...")
    await new Promise((r) => setTimeout(r, 5000))

    unsubscribe()

    return messageReceived ? "PASS" : "FAIL"
  },

  testErrorHandling: () => {
    console.log("Testing error handling...")

    // Clear existing errors
    errorHandler.clearErrors()

    // Create test error
    const testError = new Error("Test WebSocket Error")
    errorHandler.handleError(testError, {
      context: { source: "WebSocket Test" },
      severity: "medium",
    })

    // Get errors
    const errors = errorHandler.getRecentErrors()
    console.log("Errors:", errors)

    return errors.length > 0 ? "PASS" : "FAIL"
  },
}

// Add to window object in browser environment
if (typeof window !== "undefined") {
  ;(window as any).testing = testing
  console.log("Testing utilities available at window.testing")
}

export default testing
