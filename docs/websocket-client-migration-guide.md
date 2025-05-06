# WebSocket Client Migration Guide

This guide will help you migrate from the old WebSocket client to the new unified WebSocket client.

## Why Migrate?

The new unified WebSocket client offers several advantages:

- Improved connection stability with better reconnection logic
- Proper state management with a state machine
- Enhanced heartbeat mechanism for better connection monitoring
- Circuit breaker pattern to prevent excessive reconnection attempts
- Comprehensive metrics and diagnostics
- Better error handling and logging

## Migration Options

### Option 1: Use the Legacy Adapter (Easiest)

For the easiest migration path, you can use the legacy adapter which implements the old WebSocket client interface:

\`\`\`typescript
// Replace this import:
import { binanceWebSocketClient } from "@/lib/binance/websocket-client"

// With this import:
import { binanceWebSocketClient } from "@/lib/websocket/legacy-adapter"
\`\`\`

This allows you to keep using the same API while benefiting from the improved implementation.

### Option 2: Migrate to the New API (Recommended)

For new code or when you're ready to update existing code, use the new WebSocket connection manager:

\`\`\`typescript
// Replace this import:
import { binanceWebSocketClient } from "@/lib/binance/websocket-client"

// With this import:
import { binanceConnectionManager } from "@/lib/websocket/websocket-connection-manager"

// Then update your code:

// Old code:
const unsubscribe = binanceWebSocketClient.connectToStream("btcusdt@trade", handleTrade)

// New code:
const unsubscribe = binanceConnectionManager.subscribe("btcusdt@trade", handleTrade)
\`\`\`

## API Comparison

| Old API | New API | Notes |
|---------|---------|-------|
| `connectToStream(stream, callback)` | `subscribe(stream, callback)` | Both return an unsubscribe function |
| `connectToStreams(streams, callback)` | `connectToStreams(streams, callback)` | Same behavior |
| `isConnected()` | `isConnected()` | Same behavior |
| `forceReconnect()` | `forceReconnect()` | Same behavior |
| `getActiveStreams()` | `getActiveStreams()` | Same behavior |
| `close()` | `disconnect()` | Renamed for clarity |
| N/A | `getConnectionState()` | New method to get detailed state |
| N/A | `getMetrics()` | New method to get connection metrics |
| N/A | `addMetricsListener(listener)` | Subscribe to metrics updates |
| N/A | `resetCircuitBreaker()` | Reset the circuit breaker |

## Accessing WebSocket Metrics

The new client provides detailed metrics about the WebSocket connection:

\`\`\`typescript
import { binanceConnectionManager } from "@/lib/websocket/websocket-connection-manager"

// Get current metrics
const metrics = binanceConnectionManager.getMetrics()

// Subscribe to metrics updates
const unsubscribe = binanceConnectionManager.addMetricsListener((metrics) => {
  console.log("Connection health:", metrics.connectionHealth)
  console.log("Message rate:", metrics.messageRate)
  console.log("Latency:", metrics.averageLatency)
})

// Don't forget to unsubscribe when done
unsubscribe()
\`\`\`

## Environment-Specific Configuration

The new client supports environment-specific configuration. You can modify the configuration in `lib/websocket/websocket-connection-manager.ts`:

\`\`\`typescript
export const binanceConnectionManager = new WebSocketConnectionManager({
  baseUrl: process.env.BINANCE_WS_BASE_URL || "wss://fstream.binance.com/ws",
  reconnectOptions: {
    initialDelay: parseInt(process.env.WS_RECONNECT_INITIAL_DELAY || "1000"),
    maxDelay: parseInt(process.env.WS_RECONNECT_MAX_DELAY || "30000"),
    factor: parseFloat(process.env.WS_RECONNECT_FACTOR || "1.5"),
    maxAttempts: parseInt(process.env.WS_RECONNECT_MAX_ATTEMPTS || "10"),
  },
  heartbeatOptions: {
    interval: parseInt(process.env.WS_HEARTBEAT_INTERVAL || "30000"),
    timeout: parseInt(process.env.WS_HEARTBEAT_TIMEOUT || "10000"),
  },
  debug: process.env.NODE_ENV !== "production",
})
