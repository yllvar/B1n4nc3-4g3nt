/**
 * Binance API Service
 * Main entry point for Binance API functionality
 */
import { Singleton } from "../utils/singleton"
import { binanceOrderManager } from "./binance-order-manager"
import { binanceAccountManager } from "./binance-account-manager"
import { binancePositionManager } from "./binance-position-manager"
import type {
  BinanceApiServiceInterface,
  OrderSide,
  OrderType,
  PositionSide,
  OrderOptions,
  CancelOrderOptions,
  OrderResponse,
  OrderStatus,
  AccountInfo,
  PositionRisk,
  AssetBalance,
  MarginType,
  ExchangeInfo,
  SymbolInfo,
} from "../types"

/**
 * BinanceApiService provides a unified interface for interacting with the Binance API.
 * It delegates to specialized managers for different types of operations.
 *
 * @example
 * ```typescript
 * // Get account information
 * const accountInfo = await binanceApiService.getAccountInfo();
 *
 * // Place a market order
 * const order = await binanceApiService.placeOrder(
 *   "BTCUSDT",
 *   "BUY",
 *   "MARKET",
 *   0.001
 * );
 * ```
 */
export class BinanceApiService extends Singleton<BinanceApiService> implements BinanceApiServiceInterface {
  private constructor() {
    super()
  }

  /**
   * Get the singleton instance of BinanceApiService
   */
  public static getInstance(): BinanceApiService {
    return super.getInstance()
  }

  /**
   * Set test mode (no real orders will be placed)
   * @param enabled Whether to enable test mode
   */
  public setTestMode(enabled: boolean): void {
    binanceOrderManager.setTestMode(enabled)
  }

  /**
   * Check if test mode is enabled
   * @returns Whether test mode is enabled
   */
  public isTestMode(): boolean {
    return binanceOrderManager.isTestMode()
  }

  /**
   * Get account information
   * @returns Account information
   */
  public async getAccountInfo(): Promise<AccountInfo> {
    return binanceAccountManager.getAccountInfo()
  }

  /**
   * Get position information
   * @param symbol Optional symbol to filter positions
   * @returns Array of position risk information
   */
  public async getPositionRisk(symbol?: string): Promise<PositionRisk[]> {
    return binancePositionManager.getPositionRisk(symbol)
  }

  /**
   * Place a new order
   * @param symbol Trading pair symbol
   * @param side Order side (BUY or SELL)
   * @param type Order type (LIMIT, MARKET, etc.)
   * @param quantity Order quantity
   * @param options Additional order options
   * @returns Order response
   */
  public async placeOrder(
    symbol: string,
    side: OrderSide,
    type: OrderType,
    quantity: number,
    options: OrderOptions = {},
  ): Promise<OrderResponse> {
    return binanceOrderManager.placeOrder(symbol, side, type, quantity, options)
  }

  /**
   * Cancel an order
   * @param symbol Trading pair symbol
   * @param options Cancel options (orderId or clientOrderId)
   * @returns Order status
   */
  public async cancelOrder(symbol: string, options: CancelOrderOptions): Promise<OrderStatus> {
    return binanceOrderManager.cancelOrder(symbol, options)
  }

  /**
   * Get order status
   * @param symbol Trading pair symbol
   * @param options Order identification options
   * @returns Order status
   */
  public async getOrderStatus(symbol: string, options: CancelOrderOptions): Promise<OrderStatus> {
    return binanceOrderManager.getOrderStatus(symbol, options)
  }

  /**
   * Get all open orders
   * @param symbol Optional symbol to filter orders
   * @returns Array of order status
   */
  public async getOpenOrders(symbol?: string): Promise<OrderStatus[]> {
    return binanceOrderManager.getOpenOrders(symbol)
  }

  /**
   * Cancel all open orders
   * @param symbol Trading pair symbol
   * @returns Cancellation response
   */
  public async cancelAllOpenOrders(symbol: string): Promise<any> {
    return binanceOrderManager.cancelAllOpenOrders(symbol)
  }

  /**
   * Change leverage
   * @param symbol Trading pair symbol
   * @param leverage Leverage value
   * @returns Leverage change response
   */
  public async changeLeverage(symbol: string, leverage: number): Promise<any> {
    return binanceAccountManager.changeLeverage(symbol, leverage)
  }

  /**
   * Change margin type
   * @param symbol Trading pair symbol
   * @param marginType Margin type (ISOLATED or CROSSED)
   * @returns Margin type change response
   */
  public async changeMarginType(symbol: string, marginType: MarginType): Promise<any> {
    return binanceAccountManager.changeMarginType(symbol, marginType)
  }

  /**
   * Place a take profit and stop loss order for an existing position
   * @param symbol Trading pair symbol
   * @param positionSide Position side (LONG or SHORT)
   * @param takeProfitPrice Take profit price
   * @param stopLossPrice Stop loss price
   * @param quantity Order quantity
   * @returns Tuple of [takeProfitOrder, stopLossOrder]
   */
  public async placeTpSlOrders(
    symbol: string,
    positionSide: PositionSide,
    takeProfitPrice: number,
    stopLossPrice: number,
    quantity: number,
  ): Promise<[OrderResponse, OrderResponse]> {
    return binanceOrderManager.placeTpSlOrders(symbol, positionSide, takeProfitPrice, stopLossPrice, quantity)
  }

  /**
   * Get exchange information
   * @returns Exchange information
   */
  public async getExchangeInfo(): Promise<ExchangeInfo> {
    return binanceAccountManager.getExchangeInfo()
  }

  /**
   * Get symbol information
   * @param symbol Trading pair symbol
   * @returns Symbol information
   */
  public async getSymbolInfo(symbol: string): Promise<SymbolInfo | null> {
    return binanceAccountManager.getSymbolInfo(symbol)
  }

  /**
   * Get account balance
   * @returns Array of asset balances
   */
  public async getAccountBalance(): Promise<AssetBalance[]> {
    return binanceAccountManager.getAccountBalance()
  }

  /**
   * Get specific asset balance
   * @param asset Asset name
   * @returns Asset balance or null if not found
   */
  public async getAssetBalance(asset: string): Promise<AssetBalance | null> {
    return binanceAccountManager.getAssetBalance(asset)
  }

  /**
   * Get position for a specific symbol
   * @param symbol Trading pair symbol
   * @returns Position risk information or null if not found
   */
  public async getPosition(symbol: string): Promise<PositionRisk | null> {
    return binancePositionManager.getPosition(symbol)
  }

  /**
   * Check if a position exists
   * @param symbol Trading pair symbol
   * @returns Whether a position exists
   */
  public async hasPosition(symbol: string): Promise<boolean> {
    return binancePositionManager.hasPosition(symbol)
  }

  /**
   * Get position size
   * @param symbol Trading pair symbol
   * @returns Position size (positive for long, negative for short, 0 for no position)
   */
  public async getPositionSize(symbol: string): Promise<number> {
    return binancePositionManager.getPositionSize(symbol)
  }
}

// Export singleton instance
export const binanceApiService = BinanceApiService.getInstance()
