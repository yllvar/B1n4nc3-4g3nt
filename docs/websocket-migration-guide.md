# WebSocket Client Migration Guide

## Overview

We've standardized our WebSocket implementation to use the `unifiedWebSocketClient` throughout the application. This document provides guidance on migrating from the old `binanceWebSocketClient` or `binanceWebSocketManager` to the new unified approach.

## Why We're Standardizing

- **Consistent behavior**: One WebSocket management approach ensures consistent connection behavior
- **Simplified debugging**: Easier to track connection issues with a single source of truth
- **Improved reliability**: Better reconnection logic and fallback mechanisms
- **Reduced complexity**: Developers only need to learn one API

## Migration Steps

### 1. Replace Direct WebSocket Client Usage

**Before:**
\`\`\`typescript
import { binanceWebSocketClient } from "@/features/websocket/lib/websocket-client"

// Subscribe to a stream
const unsubscribe = binanceWebSocketClient.connectToStream("btcusdt@bookTicker", (data) => {
  // Handle data
})
\`\`\`

**After:**
\`\`\`typescript
import { unifiedWebSocketClient } from "@/lib/websocket/unified-websocket-client"

// Subscribe to a stream
const unsubscribe = unifiedWebSocketClient.subscribeToStream("btcusdt@bookTicker", (data) => {
  // Handle data
})
\`\`\`

### 2. Replace WebSocket Manager Usage

**Before:**
\`\`\`typescript
import { binanceWebSocketManager } from "@/lib/websocket/binance-websocket-manager"

// Get connection state
const state = binanceWebSocketManager.getConnectionState()

// Add state change listener
binanceWebSocketManager.addStateChangeListener("myComponent", (state) => {
  // Handle state change
})
\`\`\`

**After:**
\`\`\`typescript
import { unifiedWebSocketClient } from "@/lib/websocket/unified-websocket-client"

// Get connection state
const state = unifiedWebSocketClient.getStatus()

// Subscribe to status updates
const unsubscribe = unifiedWebSocketClient.subscribe((status, metrics) => {
  // Handle status and metrics updates
})
\`\`\`

### 3. Use Market Data Service

For most use cases, you should use the `binanceMarketDataService` which now uses the `unifiedWebSocketClient` internally:

\`\`\`typescript
import { binanceMarketDataService } from "@/features/websocket/lib/market-data-service"

// Subscribe to price updates
const unsubscribe = binanceMarketDataService.subscribeToPrice("BTCUSDT", (price) => {
  // Handle price updates
})
\`\`\`

## New Features

The `unifiedWebSocketClient` provides several new features:

- **Automatic fallback to REST API** when WebSocket connection fails
- **Connection metrics** including latency, message rate, and uptime
- **Better error handling** with integration to the application's error handling system
- **Simplified subscription management** with tracking of active streams

## Questions?

If you have any questions about the migration, please contact the development team.
