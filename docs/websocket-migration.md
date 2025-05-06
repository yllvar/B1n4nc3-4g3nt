# WebSocket Client Migration Guide

## Overview
This document outlines the migration from UnifiedWebSocketClient to BinanceWS implementation.

## Key Changes
1. Simplified WebSocket client focused on Binance-specific needs
2. Removed complex features not needed for our use case:
   - Circuit breaker
   - Combined streams
   - Advanced metrics
3. Improved reconnection logic tailored for Binance API

## Migration Steps

### Phase 1: Core Implementation
1. Replace all `unifiedWebSocketClient.subscribeToStream` calls with:
```typescript
const ws = new BinanceWS({ 
  url: `wss://fstream.binance.com/ws/${streamName}`
});
ws.connect(callback);
```

2. Update error handling to use BinanceWS status methods:
```typescript
const status = ws.getStatus();
if (!status.isConnected) {
  // Handle disconnection
}
```

### Phase 2: Feature Rollout
1. Add feature flag to `.env.local`:
```ini
NEXT_PUBLIC_WS_IMPL=v2
```

2. Wrap new implementation in feature flag check:
```typescript
const useNewWS = process.env.NEXT_PUBLIC_WS_IMPL === 'v2';

if (useNewWS) {
  // Use BinanceWS
} else {
  // Fallback to unified client
}
```

### Phase 3: Cleanup
1. Remove old files:
```bash
rm lib/websocket/unified-websocket-client.ts
rm lib/websocket/websocket-connection-manager.ts
```

2. Update imports in affected files.

## Testing Strategy
1. Unit tests for BinanceWS core functionality
2. Integration tests with market data provider
3. Monitor connection stability and performance

## Rollback Procedure
1. Set feature flag back to v1:
```ini
NEXT_PUBLIC_WS_IMPL=v1
```

2. Revert migration commit:
```bash
git revert HEAD --no-edit
```

## Monitoring
Add these metrics to track:
- Connection duration
- Reconnect count
- Message throughput
- Error rates

## Known Limitations
1. No support for combined streams
2. Simpler reconnection strategy
3. No circuit breaker

## Timeline
1. Development: 2 days
2. Testing: 1 day
3. Rollout: 1 day (canary release)
4. Full migration: 1 week
