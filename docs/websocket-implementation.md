# WebSocket Implementation Documentation

This document details the implementation of WebSocket connections in our application, focusing on the architecture, error handling, and reconnection strategies.

## Architecture Overview

The WebSocket implementation follows a layered architecture:

1. **Low-level WebSocket Client** - Handles raw connections and messages
2. **WebSocket Monitor** - Tracks performance metrics and connection health
3. **Unified WebSocket Client** - Provides a unified interface with fallback mechanisms
4. **Market Data Service** - Business logic for specific market data streams

\`\`\`mermaid
graph TD
    A[Application] --> B[Market Data Service]
    A --> C[WebSocket Monitor UI]
    B --> D[Unified WebSocket Client]
    C --> D
    D --> E[WebSocket Client Implementation]
    D --> F[REST API Fallback]
    E --> G[Binance WebSocket API]
    F --> H[Binance REST API]
\`\`\`

## Core Components

### WebSocketConnectionManager

**File Location:** `/lib/websocket/websocket-connection-manager.ts`

**Purpose:**
The base WebSocket connection manager that handles:
- Connection establishment and maintenance
- Reconnection with exponential backoff
- Event subscription and publishing
- Heartbeat mechanism
- Circuit breaker pattern
- Performance monitoring

**Key Methods:**
- `connect()`: Establishes WebSocket connection
- `disconnect()`: Gracefully closes connection
- `send(data)`: Sends data through WebSocket
- `on(event, callback)`: Subscribe to connection events
- `reconnect()`: Force reconnection
- `getStats()`: Get connection statistics

**Reconnection Strategy:**
- Exponential backoff with jitter
- Maximum reconnection attempts
- Circuit breaker to prevent excessive reconnection attempts

**Example:**
\`\`\`typescript
const wsManager = new WebSocketConnectionManager({
  url: "wss://fstream.binance.com/ws",
  initialBackoffDelay: 1000,
  maxBackoffDelay: 30000,
  backoffFactor: 1.5,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  heartbeatTimeout: 5000,
  autoReconnect: true
});

wsManager.connect();

wsManager.on('connect', () => {
  console.log('Connected to WebSocket');
  wsManager.send(JSON.stringify({ method: "SUBSCRIBE", params: ["btcusdt@trade"] }));
});

wsManager.on('message', (data) => {
  console.log('Received message:', data);
});
\`\`\`

### UnifiedWebSocketClient

**File Location:** `/lib/websocket/unified-websocket-client.ts`

**Purpose:**
Provides a unified interface for WebSocket communication with:
- Automatic fallback to REST API
- Stream subscription management
- Connection monitoring
- Performance metrics

**Key Methods:**
- `connect(symbol)`: Connect to WebSocket for a specific symbol
- `disconnect()`: Close WebSocket connection
- `subscribe(callback)`: Subscribe to status updates
- `subscribeToStream(stream, callback)`: Subscribe to specific data stream
- `getStatus()`: Get current connection status
- `getMetrics()`: Get performance metrics
- `forceReconnect()`: Force WebSocket reconnection

**Fallback Mechanism:**
When WebSocket connection fails after multiple reconnection attempts, the client switches to REST API fallback mode, fetching data through HTTP requests instead.

**Example:**
\`\`\`typescript
const client = unifiedWebSocketClient.getInstance();

client.connect("btcusdt");

// Subscribe to status updates
client.subscribe((status, metrics) => {
  console.log(`WebSocket status: ${status}, message rate: ${metrics.messageRate}/s`);
});

// Subscribe to trade updates
const unsubscribe = client.subscribeToStream("btcusdt@aggTrade", (data) => {
  console.log(`New trade: ${data.p} @ ${data.q}`);
});

// Later, unsubscribe from the stream
unsubscribe();
\`\`\`

### BinanceMarketDataService

**File Location:** `/features/websocket/lib/market-data-service.ts`

**Purpose:**
Provides market-specific data streams and REST API methods for Binance, using the unified WebSocket client under the hood.

**Key Methods:**
- `get24hrTicker(symbol)`: Get 24hr ticker statistics
- `getKlines(symbol, interval)`: Get candlestick data
- `getOrderBook(symbol, limit)`: Get order book data
- `getRecentTrades(symbol, limit)`: Get recent trades
- `subscribeToPrice(symbol, callback)`: Subscribe to price updates
- `subscribeToKlines(symbol, interval, callback)`: Subscribe to candlestick updates

**Example:**
\`\`\`typescript
import { binanceMarketDataService } from "@/features/websocket/lib/market-data-service";

// Fetch data
const ticker = await binanceMarketDataService.get24hrTicker("btcusdt");

// Subscribe to price updates
const unsubscribe = binanceMarketDataService.subscribeToPrice("btcusdt", (price) => {
  console.log(`Current BTC price: ${price}`);
});
\`\`\`

### EnhancedMarketDataService

**File Location:** `/lib/market/enhanced-market-data-service.ts`

**Purpose:**
Advanced market data service with:
- Data caching
- Unified interface for WebSocket and REST
- Data validation
- Error handling
- Type safety

**Key Features:**
- Caches data with configurable TTL
- Automatic fallback between WebSocket and REST
- Standardized response format
- Comprehensive error handling

**Example:**
\`\`\`typescript
import { enhancedMarketDataService } from "@/lib/market/enhanced-market-data-service";

// Get current price (cached if available)
const priceResult = await enhancedMarketDataService.getCurrentPrice("btcusdt");
if (priceResult.data) {
  console.log(`BTC Price: ${priceResult.data}`);
}

// Subscribe to real-time updates with automatic fallback
const unsubscribe = enhancedMarketDataService.subscribeToPrice("btcusdt", (result) => {
  if (result.data) {
    console.log(`Updated price: ${result.data} (source: ${result.source})`);
  }
});
\`\`\`

## Error Handling Strategy

### Circuit Breaker Pattern

The WebSocket implementation uses a circuit breaker pattern to prevent excessive reconnection attempts:

1. When consecutive connection failures reach a threshold, the circuit breaker "trips"
2. Further connection attempts are blocked for a cooldown period
3. After the cooldown period, the circuit breaker resets
4. Connection attempts can resume

**Implementation:**
\`\`\`typescript
private tripCircuitBreaker(): void {
  this.circuitBreakerTripped = true;
  
  // Reset circuit breaker after 5 minutes
  this.circuitBreakerResetTimeout = setTimeout(() => {
    this.circuitBreakerTripped = false;
  }, 5 * 60 * 1000);
}
\`\`\`

### Error Reporting

Errors are reported through multiple channels:

1. **Console logging**: For development visibility
2. **Event listeners**: For component-level handling
3. **Toast notifications**: For user visibility
4. **Error tracking service**: For monitoring and alerting

**Implementation Example:**
\`\`\`typescript
// In WebSocketConnectionManager
private handleConnectionError(event: any): void {
  this.stats.errorCount++;
  this.emitEvent("error", event);
  
  errorHandler.handleError(event instanceof Error ? event : new Error("WebSocket connection error"), {
    context: { url: this.url, state: this.state },
    severity: "high",
    code: "WEBSOCKET_CONNECTION_ERROR",
  });
}
\`\`\`

## WebSocket Streams and Protocols

### Stream Naming Convention

Binance WebSocket streams follow this naming pattern:
`<symbol>@<streamType>[_<parameter>]`

**Examples:**
- `btcusdt@trade`: Individual trades for BTCUSDT
- `ethusdt@kline_1m`: 1-minute candlestick updates for ETHUSDT
- `solusdt@depth`: Order book updates for SOLUSDT
- `btcusdt@markPrice@1s`: Mark price updates every second for BTCUSDT

### Subscription Protocol

**Subscribe to streams:**
\`\`\`json
{
  "method": "SUBSCRIBE",
  "params": [
    "btcusdt@trade",
    "btcusdt@kline_1m",
    "ethusdt@depth"
  ],
  "id": 1
}
\`\`\`

**Unsubscribe from streams:**
\`\`\`json
{
  "method": "UNSUBSCRIBE",
  "params": [
    "btcusdt@trade"
  ],
  "id": 312
}
\`\`\`

**Response format:**
\`\`\`json
{
  "result": null,
  "id": 1
}
\`\`\`

### Heartbeat Mechanism

To maintain WebSocket connections, a heartbeat mechanism is implemented:

1. Client sends ping message every 30 seconds
2. Server responds with pong message
3. If no response is received within timeout period, connection is considered dead
4. Client initiates reconnection process

**Ping format:**
\`\`\`json
{
  "method": "PING",
  "id": 1234
}
\`\`\`

**Pong response:**
\`\`\`json
{
  "result": null,
  "id": 1234
}
\`\`\`

## Performance Considerations

### Connection Monitoring

The WebSocket monitor tracks several key metrics:

- **Message Rate**: Number of messages received per second
- **Latency**: Time between ping and pong messages
- **Uptime**: Duration of active connection
- **Reconnections**: Number of reconnection attempts
- **Error Count**: Number of errors encountered

These metrics are used to:
1. Display connection health to users
2. Trigger alerts for persistent issues
3. Guide fallback decisions
4. Provide diagnostic information

### Optimizations

The WebSocket implementation includes several optimizations:

1. **Connection Pooling**: Reuses connections for multiple streams
2. **Message Batching**: Combines subscription requests
3. **Binary Message Support**: Reduces bandwidth usage
4. **Data Validation**: Prevents processing invalid data
5. **Selective Updates**: Only processes relevant data changes

## Conclusion

This WebSocket implementation provides robust, fault-tolerant real-time data streaming with comprehensive error handling and fallback mechanisms. The layered architecture allows for separation of concerns while maintaining a unified interface for consumers.

For further details on specific implementation aspects, please refer to the source code and comments in the respective files.
\`\`\`

Now, let's write a documentation file on troubleshooting common WebSocket issues:
