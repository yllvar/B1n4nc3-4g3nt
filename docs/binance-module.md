# Binance Module Documentation

The Binance module provides a comprehensive interface for interacting with the Binance API. It includes services for account management, order execution, position tracking, and low-level API access with proper rate limiting.

## Installation

The Binance module is part of the project and doesn't require separate installation. However, you need to set up the required environment variables:

\`\`\`env
BINANCE_API_KEY=your_api_key
BINANCE_API_SECRET=your_api_secret
BINANCE_API_BASE_URL=https://fapi.binance.com
\`\`\`

## Basic Usage

\`\`\`typescript
import { binanceApiService, initializeBinanceModule } from '@/lib/binance';

// Initialize with test mode (no real orders will be placed)
initializeBinanceModule(true);

// Get account information
const accountInfo = await binanceApiService.getAccountInfo();
console.log(`Account status: ${accountInfo.canTrade ? 'Active' : 'Inactive'}`);

// Place a market order
const order = await binanceApiService.placeOrder(
  'BTCUSDT',
  'BUY',
  'MARKET',
  0.001
);
console.log(`Order placed: ${order.orderId}`);
\`\`\`

## Module Structure

The Binance module is organized into several specialized services:

- **binanceApiService**: Main entry point for most operations
- **binanceOrderManager**: Specialized service for order operations
- **binanceAccountManager**: Specialized service for account operations
- **binancePositionManager**: Specialized service for position operations
- **binanceApiClient**: Low-level API client with rate limiting
- **binanceRateLimiter**: Handles rate limiting for API requests

## Features

### Account Management

\`\`\`typescript
// Get account information
const accountInfo = await binanceApiService.getAccountInfo();

// Get specific asset balance
const btcBalance = await binanceApiService.getAssetBalance('BTC');

// Get trading fees
const tradingFees = await binanceAccountManager.getTradingFee('BTCUSDT');
\`\`\`

### Order Management

\`\`\`typescript
// Place a market order
const marketOrder = await binanceApiService.placeOrder(
  'BTCUSDT',
  'BUY',
  'MARKET',
  0.001
);

// Place a limit order
const limitOrder = await binanceApiService.placeOrder(
  'BTCUSDT',
  'BUY',
  'LIMIT',
  0.001,
  {
    price: 20000,
    timeInForce: 'GTC'
  }
);

// Get order status
const orderStatus = await binanceApiService.getOrderStatus(
  'BTCUSDT',
  { orderId: limitOrder.orderId }
);

// Cancel an order
const cancelResult = await binanceApiService.cancelOrder(
  'BTCUSDT',
  { orderId: limitOrder.orderId }
);

// Get all open orders
const openOrders = await binanceApiService.getOpenOrders('BTCUSDT');
\`\`\`

### Position Management

\`\`\`typescript
// Change leverage
await binanceApiService.changeLeverage('BTCUSDT', 5);

// Change margin type
await binanceApiService.changeMarginType('BTCUSDT', 'ISOLATED');

// Check if position exists
const hasPosition = await binanceApiService.hasPosition('BTCUSDT');

// Get position size
const positionSize = await binanceApiService.getPositionSize('BTCUSDT');

// Place take profit and stop loss orders
const [tpOrder, slOrder] = await binanceApiService.placeTpSlOrders(
  'BTCUSDT',
  'LONG',
  21000, // Take profit price
  19000, // Stop loss price
  0.001  // Position size
);
\`\`\`

### Test Mode

The module supports a test mode where no real orders are placed:

\`\`\`typescript
// Enable test mode
binanceApiService.setTestMode(true);

// Check if test mode is enabled
const isTestMode = binanceApiService.isTestMode();
\`\`\`

## Error Handling

All API calls are properly error-handled. Errors are logged and include context information for debugging.

\`\`\`typescript
try {
  const order = await binanceApiService.placeOrder(
    'BTCUSDT',
    'BUY',
    'MARKET',
    0.001
  );
} catch (error) {
  console.error('Failed to place order:', error);
  // Error will include context information like symbol, side, type, etc.
}
\`\`\`

## Rate Limiting

The module includes built-in rate limiting to prevent exceeding Binance API limits:

\`\`\`typescript
// Get current rate limit status
const rateLimitStatus = binanceApiClient.getRateLimitStatus();
console.log('Rate limit status:', rateLimitStatus);
\`\`\`

## Advanced Usage

For advanced usage, you can access the specialized managers directly:

\`\`\`typescript
import {
  binanceOrderManager,
  binanceAccountManager,
  binancePositionManager,
  binanceApiClient
} from '@/lib/binance';

// Use specialized managers for advanced operations
const symbolInfo = await binanceAccountManager.getSymbolInfo('BTCUSDT');
\`\`\`

## Types

The module exports all necessary types for TypeScript integration:

\`\`\`typescript
import {
  OrderSide,
  OrderType,
  OrderOptions,
  PositionSide,
  MarginType
} from '@/lib/binance';

// Use types in your code
const side: OrderSide = 'BUY';
const type: OrderType = 'LIMIT';
\`\`\`
