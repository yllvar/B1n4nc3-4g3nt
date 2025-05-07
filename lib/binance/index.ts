/**
 * Binance API Module
 *
 * This module provides a comprehensive interface for interacting with the Binance API.
 * It includes services for account management, order execution, position tracking,
 * and low-level API access with proper rate limiting.
 *
 * @module BinanceModule
 *
 * @example
 * \`\`\`typescript
 * // Import the main service
 * import { binanceApiService } from '@/lib/binance';
 *
 * // Get account information
 * const accountInfo = await binanceApiService.getAccountInfo();
 *
 * // Place a market order
 * const order = await binanceApiService.placeOrder(
 *   'BTCUSDT',
 *   'BUY',
 *   'MARKET',
 *   0.001
 * );
 * \`\`\`
 */

// Export main service (primary entry point)
export { binanceApiService } from "./binance-api-service"

// Export specialized managers for advanced usage
export { binanceOrderManager } from "./binance-order-manager"
export { binanceAccountManager } from "./binance-account-manager"
export { binancePositionManager } from "./binance-position-manager"
export { binanceApiClient } from "./binance-api-client"
export { binanceRateLimiter } from "./binance-rate-limiter"

// Export utility functions
export {
  createSignature,
  createQueryString,
  generateClientOrderId,
  formatNumber,
  parseNumberString,
  calculatePrecision,
} from "./binance-utils"

// Re-export types from the centralized type system
// This allows consumers to import types directly from the binance module
export type {
  // Service interfaces
  BinanceApiServiceInterface,
  BinanceOrderManagerInterface,
  BinanceAccountManagerInterface,
  BinancePositionManagerInterface,
  // Order types
  OrderSide,
  OrderType,
  OrderOptions,
  OrderResponse,
  OrderStatus,
  CancelOrderOptions,
  TimeInForce,
  // Position types
  PositionSide,
  PositionRisk,
  MarginType,
  // Account types
  AccountInfo,
  AssetBalance,
  // Exchange info types
  ExchangeInfo,
  SymbolInfo,
  SymbolFilter,
  PriceFilter,
  LotSizeFilter,
  // Rate limiting
  RateLimitType,
  // Other types
  BinanceErrorResponse,
} from "../types"

import { binanceApiService } from "./binance-api-service"

/**
 * Convenience function to initialize the Binance module with test mode
 * @param testMode Whether to enable test mode (no real orders will be placed)
 */
export function initializeBinanceModule(testMode = false): void {
  const apiService = binanceApiService
  apiService.setTestMode(testMode)
  console.log(`Binance module initialized with test mode: ${testMode}`)
}
