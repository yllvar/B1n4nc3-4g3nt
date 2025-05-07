/**
 * Binance API Types
 * Types related to Binance API interactions
 */

// Order types
export type OrderSide = "BUY" | "SELL"
export type OrderType =
  | "LIMIT"
  | "MARKET"
  | "STOP"
  | "STOP_MARKET"
  | "TAKE_PROFIT"
  | "TAKE_PROFIT_MARKET"
  | "TRAILING_STOP_MARKET"

export type TimeInForce = "GTC" | "IOC" | "FOK" | "GTX"
export type PositionSide = "BOTH" | "LONG" | "SHORT"
export type WorkingType = "MARK_PRICE" | "CONTRACT_PRICE"
export type MarginType = "ISOLATED" | "CROSSED"

/**
 * Options for placing an order
 */
export interface OrderOptions {
  price?: number
  timeInForce?: TimeInForce
  stopPrice?: number
  closePosition?: boolean
  reduceOnly?: boolean
  workingType?: WorkingType
  priceProtect?: boolean
  newClientOrderId?: string
  positionSide?: PositionSide
}

/**
 * Response from placing an order
 */
export interface OrderResponse {
  symbol: string
  orderId: number
  clientOrderId: string
  transactTime: number
  price: string
  origQty: string
  executedQty: string
  status: string
  timeInForce: string
  type: string
  side: string
}

/**
 * Order status information
 */
export interface OrderStatus {
  symbol: string
  orderId: number
  clientOrderId: string
  price: string
  origQty: string
  executedQty: string
  status: string
  timeInForce: string
  type: string
  side: string
  stopPrice?: string
  time: number
  updateTime: number
}

/**
 * Options for canceling an order
 */
export interface CancelOrderOptions {
  orderId?: number
  origClientOrderId?: string
}

/**
 * Balance information for a single asset
 */
export interface AssetBalance {
  asset: string
  free: string
  locked: string
}

/**
 * Account information
 */
export interface AccountInfo {
  makerCommission: number
  takerCommission: number
  buyerCommission: number
  sellerCommission: number
  canTrade: boolean
  canWithdraw: boolean
  canDeposit: boolean
  updateTime: number
  accountType: string
  balances: AssetBalance[]
  permissions: string[]
}

/**
 * Position risk information
 */
export interface PositionRisk {
  symbol: string
  positionAmt: string
  entryPrice: string
  markPrice: string
  unRealizedProfit: string
  liquidationPrice: string
  leverage: string
  maxNotionalValue: string
  marginType: string
  isolatedMargin: string
  isAutoAddMargin: string
  positionSide: PositionSide
}

/**
 * Exchange information
 */
export interface ExchangeInfo {
  timezone: string
  serverTime: number
  rateLimits: RateLimit[]
  exchangeFilters: any[]
  symbols: SymbolInfo[]
}

/**
 * Symbol information
 */
export interface SymbolInfo {
  symbol: string
  status: string
  baseAsset: string
  baseAssetPrecision: number
  quoteAsset: string
  quotePrecision: number
  quoteAssetPrecision: number
  orderTypes: string[]
  icebergAllowed: boolean
  ocoAllowed: boolean
  isSpotTradingAllowed: boolean
  isMarginTradingAllowed: boolean
  filters: any[]
}

// Rate limit types
export type RateLimitType = "REQUEST_WEIGHT" | "ORDERS" | "RAW_REQUESTS"
export type RateLimitInterval = "SECOND" | "MINUTE" | "DAY"

/**
 * Rate limit information
 */
export interface RateLimit {
  rateLimitType: RateLimitType
  interval: RateLimitInterval
  intervalNum: number
  limit: number
}

/**
 * Binance API service interface
 * Defines methods for interacting with the Binance API
 */
export interface BinanceApiServiceInterface {
  // Test mode
  setTestMode(enabled: boolean): void
  isTestMode(): boolean

  // Account operations
  getAccountInfo(): Promise<AccountInfo>
  getExchangeInfo(): Promise<ExchangeInfo>
  getSymbolInfo(symbol: string): Promise<SymbolInfo | null>
  getAccountBalance(): Promise<AssetBalance[]>
  getAssetBalance(asset: string): Promise<AssetBalance | null>
  changeLeverage(symbol: string, leverage: number): Promise<any>
  changeMarginType(symbol: string, marginType: MarginType): Promise<any>

  // Position operations
  getPositionRisk(symbol?: string): Promise<PositionRisk[]>
  getPosition(symbol: string): Promise<PositionRisk | null>
  hasPosition(symbol: string): Promise<boolean>
  getPositionSize(symbol: string): Promise<number>

  // Order operations
  placeOrder(
    symbol: string,
    side: OrderSide,
    type: OrderType,
    quantity: number,
    options?: OrderOptions,
  ): Promise<OrderResponse>
  cancelOrder(symbol: string, options: CancelOrderOptions): Promise<OrderStatus>
  getOrderStatus(symbol: string, options: CancelOrderOptions): Promise<OrderStatus>
  getOpenOrders(symbol?: string): Promise<OrderStatus[]>
  cancelAllOpenOrders(symbol: string): Promise<any>
  placeTpSlOrders(
    symbol: string,
    positionSide: PositionSide,
    takeProfitPrice: number,
    stopLossPrice: number,
    quantity: number,
  ): Promise<[OrderResponse, OrderResponse]>
}
