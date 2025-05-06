# Market Data Service Migration Guide

This guide explains how to migrate from the old market data service implementations to the new enhanced market data service.

## Why Migrate?

The new `EnhancedMarketDataService` addresses several issues with the previous implementations:

1. **Consistent Method Signatures**: All methods now follow a consistent pattern with proper async/await support
2. **Comprehensive Error Handling**: All methods properly handle errors, including network timeouts
3. **Data Validation**: All data is validated before being returned to ensure integrity
4. **Integrated REST API Fallback**: WebSocket and REST API are fully integrated with automatic fallback
5. **Caching**: Data is cached to improve performance and reduce API calls
6. **Standardized Return Types**: All methods return a `MarketDataResult<T>` with consistent structure

## Migration Steps

### Step 1: Update Imports

Replace imports from the old services:

\`\`\`typescript
// Old imports
import { binanceMarketDataService } from "@/lib/binance/market-data-service"
import { unifiedMarketDataService } from "@/lib/market/unified-market-data-service"

// New imports
import { enhancedMarketDataService } from "@/lib/market/enhanced-market-data-service"
import { MarketDataResult } from "@/lib/market/interfaces"
\`\`\`

### Step 2: Update REST API Calls

Replace direct REST API calls:

\`\`\`typescript
// Old way
const ticker = await binanceMarketDataService.get24hrTicker(symbol)

// New way
const result = await enhancedMarketDataService.get24hrTicker(symbol)
if (result.data) {
  const ticker = result.data
  // Use ticker data
}
\`\`\`

### Step 3: Update WebSocket Subscriptions

Replace WebSocket subscriptions:

\`\`\`typescript
// Old way
const unsubscribe = binanceMarketDataService.subscribeToPrice(symbol, (price) => {
  // Use price
})

// New way
const unsubscribe = enhancedMarketDataService.subscribeToPrice(
  symbol, 
  (result) => {
    if (result.data !== null) {
      const price = result.data
      // Use price
    }
    
    if (result.error) {
      // Handle error
    }
  }
)
\`\`\`

### Step 4: Use the New Hook

For React components, use the new hook:

\`\`\`typescript
// Old way
import { useMarketData } from "@/hooks/use-market-data"

function MyComponent() {
  const { ticker, trades } = useMarketData()
  // ...
}

// New way
import { useEnhancedMarketData } from "@/hooks/use-enhanced-market-data"

function MyComponent() {
  const { 
    price, 
    ticker, 
    trades, 
    connectionStatus,
    isLoading,
    error,
    refresh 
  } = useEnhancedMarketData({
    symbol: "BTCUSDT",
    subscribeToTrades: true,
    subscribeTo24hrTicker: true
  })
  
  // ...
}
\`\`\`

### Step 5: Handle Errors Properly

Take advantage of the improved error handling:

\`\`\`typescript
const { error, isLoading, refresh } = useEnhancedMarketData({
  symbol: "BTCUSDT"
})

// In your component
if (error  refresh } = useEnhancedMarketData({
  symbol: "BTCUSDT"
})

// In your component
if (error) {
  return <div>Error: {error.message}</div>
}

if (isLoading) {
  return <div>Loading...</div>
}

// Add a refresh button
return (
  <div>
    <button onClick={refresh}>Refresh Data</button>
    {/* Rest of your component */}
  </div>
)
\`\`\`

## Best Practices

1. **Always Check for Errors**: The new service provides detailed error information
2. **Use the Refresh Function**: When you need to manually refresh data
3. **Monitor Connection Status**: Use the `connectionStatus` to show connection state to users
4. **Unsubscribe Properly**: Always use the returned unsubscribe function to clean up

## Advanced Usage

### Custom Subscription Options

\`\`\`typescript
const unsubscribe = enhancedMarketDataService.subscribeToPrice(
  symbol,
  callback,
  {
    reconnect: true,
    maxRetries: 3,
    retryInterval: 1000
  }
)
\`\`\`

### Accessing Data Source

\`\`\`typescript
const { priceResult } = useEnhancedMarketData({ symbol: "BTCUSDT" })

// Check if data came from WebSocket, REST API, or cache
if (priceResult && priceResult.source === 'websocket') {
  console.log('Real-time data from WebSocket')
} else if (priceResult && priceResult.source === 'rest') {
  console.log('Data from REST API')
} else if (priceResult && priceResult.source === 'cache') {
  console.log('Data from cache')
}
\`\`\`

### Customizing Cache TTL

\`\`\`typescript
// Set cache TTL to 10 seconds
enhancedMarketDataService.setCacheTTL(10000)
\`\`\`

## Need Help?

If you encounter any issues during migration, please refer to the API documentation or contact the development team.
