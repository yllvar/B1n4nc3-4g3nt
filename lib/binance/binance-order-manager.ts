/**
 * Binance Order Manager
 * Handles order-related operations
 */
import { Singleton } from "../utils/singleton"
import { errorHandler } from "../error-handling"
import { OrderExecutionError } from "../error-handling/error-types"
import { binanceApiClient } from "./binance-api-client"
import type {
  OrderSide,
  OrderType,
  OrderOptions,
  OrderResponse,
  OrderStatus,
  CancelOrderOptions,
  PositionSide,
  BinanceOrderManagerInterface,
} from "../types"

/**
 * BinanceOrderManager handles all order-related operations with the Binance API.
 * It provides methods for placing, canceling, and querying orders.
 *
 * @example
 * ```typescript
 * // Place a market order
 * const order = await binanceOrderManager.placeOrder(
 *   "BTCUSDT",
 *   "BUY",
 *   "MARKET",
 *   0.001
 * );
 *
 * // Cancel an order
 * const cancelResult = await binanceOrderManager.cancelOrder(
 *   "BTCUSDT",
 *   { orderId: order.orderId }
 * );
 * ```
 */
export class BinanceOrderManager extends Singleton<BinanceOrderManager> implements BinanceOrderManagerInterface {
  private testMode = false
  private orderIdCounter = 1

  private constructor() {
    super()
  }

  /**
   * Get the singleton instance of BinanceOrderManager
   */
  public static getInstance(): BinanceOrderManager {
    return super.getInstance()
  }

  /**
   * Set test mode (no real orders will be placed)
   * @param enabled Whether to enable test mode
   */
  public setTestMode(enabled: boolean): void {
    this.testMode = enabled
    console.log(`Test mode ${enabled ? "enabled" : "disabled"}`)
  }

  /**
   * Check if test mode is enabled
   * @returns Whether test mode is enabled
   */
  public isTestMode(): boolean {
    return this.testMode
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
    try {
      // If in test mode, return a mock response
      if (this.testMode) {
        return this.mockPlaceOrder(symbol, side, type, quantity, options)
      }

      const params: Record<string, any> = {
        symbol,
        side,
        type,
        quantity: quantity.toString(),
      }

      // Add optional parameters
      if (options.price) params.price = options.price.toString()
      if (options.timeInForce) params.timeInForce = options.timeInForce
      if (options.stopPrice) params.stopPrice = options.stopPrice.toString()
      if (options.closePosition) params.closePosition = options.closePosition
      if (options.reduceOnly) params.reduceOnly = options.reduceOnly
      if (options.workingType) params.workingType = options.workingType
      if (options.priceProtect) params.priceProtect = options.priceProtect
      if (options.newClientOrderId) params.newClientOrderId = options.newClientOrderId
      if (options.positionSide) params.positionSide = options.positionSide

      return binanceApiClient.makeSignedRequest<OrderResponse>("/order", "POST", params, 1)
    } catch (error) {
      errorHandler.handleError(error, {
        context: {
          action: "placeOrder",
          symbol,
          side,
          type,
          quantity,
          options,
        },
        severity: "high",
      })

      throw new OrderExecutionError(
        `Failed to place ${side} ${type} order for ${quantity} ${symbol}: ${error instanceof Error ? error.message : "Unknown error"}`,
        { context: { symbol, side, type, quantity, options } },
      )
    }
  }

  /**
   * Mock placing an order (for test mode)
   * @private
   */
  private mockPlaceOrder(
    symbol: string,
    side: OrderSide,
    type: OrderType,
    quantity: number,
    options: OrderOptions = {},
  ): OrderResponse {
    const orderId = this.orderIdCounter++
    const clientOrderId = options.newClientOrderId || `mock_order_${orderId}`
    const price = options.price?.toString() || "0"

    console.log(`[TEST MODE] Placing ${side} ${type} order for ${quantity} ${symbol} @ ${price}`)

    return {
      symbol,
      orderId,
      clientOrderId,
      transactTime: Date.now(),
      price,
      origQty: quantity.toString(),
      executedQty: "0",
      status: "NEW",
      timeInForce: options.timeInForce || "GTC",
      type,
      side,
    }
  }

  /**
   * Cancel an order
   * @param symbol Trading pair symbol
   * @param options Cancel options (orderId or clientOrderId)
   * @returns Order status
   */
  public async cancelOrder(symbol: string, options: CancelOrderOptions): Promise<OrderStatus> {
    try {
      // If in test mode, return a mock response
      if (this.testMode) {
        return this.mockCancelOrder(symbol, options)
      }

      if (!options.orderId && !options.origClientOrderId) {
        throw new Error("Either orderId or origClientOrderId must be provided")
      }

      const params: Record<string, any> = { symbol }

      if (options.orderId) params.orderId = options.orderId
      if (options.origClientOrderId) params.origClientOrderId = options.origClientOrderId

      return binanceApiClient.makeSignedRequest<OrderStatus>("/order", "DELETE", params, 1)
    } catch (error) {
      errorHandler.handleError(error, {
        context: {
          action: "cancelOrder",
          symbol,
          options,
        },
        severity: "medium",
      })

      throw new OrderExecutionError(
        `Failed to cancel order for ${symbol}: ${error instanceof Error ? error.message : "Unknown error"}`,
        { context: { symbol, options } },
      )
    }
  }

  /**
   * Mock canceling an order (for test mode)
   * @private
   */
  private mockCancelOrder(symbol: string, options: CancelOrderOptions): OrderStatus {
    const orderId = options.orderId || 12345
    const clientOrderId = options.origClientOrderId || `mock_order_${orderId}`

    console.log(`[TEST MODE] Canceling order ${orderId} for ${symbol}`)

    return {
      symbol,
      orderId,
      clientOrderId,
      price: "0",
      origQty: "0",
      executedQty: "0",
      status: "CANCELED",
      timeInForce: "GTC",
      type: "LIMIT",
      side: "BUY",
      stopPrice: "0",
      time: Date.now(),
      updateTime: Date.now(),
    }
  }

  /**
   * Get order status
   * @param symbol Trading pair symbol
   * @param options Order identification options
   * @returns Order status
   */
  public async getOrderStatus(symbol: string, options: CancelOrderOptions): Promise<OrderStatus> {
    if (!options.orderId && !options.origClientOrderId) {
      throw new Error("Either orderId or origClientOrderId must be provided")
    }

    const params: Record<string, any> = { symbol }

    if (options.orderId) params.orderId = options.orderId
    if (options.origClientOrderId) params.origClientOrderId = options.origClientOrderId

    return binanceApiClient.makeSignedRequest<OrderStatus>("/order", "GET", params, 2)
  }

  /**
   * Get all open orders
   * @param symbol Optional symbol to filter orders
   * @returns Array of order status
   */
  public async getOpenOrders(symbol?: string): Promise<OrderStatus[]> {
    const params: Record<string, any> = {}
    if (symbol) {
      params.symbol = symbol
    }

    return binanceApiClient.makeSignedRequest<OrderStatus[]>("/openOrders", "GET", params, symbol ? 3 : 40)
  }

  /**
   * Cancel all open orders
   * @param symbol Trading pair symbol
   * @returns Cancellation response
   */
  public async cancelAllOpenOrders(symbol: string): Promise<any> {
    return binanceApiClient.makeSignedRequest<any>("/allOpenOrders", "DELETE", { symbol }, 1)
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
    const side: OrderSide = positionSide === "LONG" ? "SELL" : "BUY"

    // Place take profit order
    const tpOrder = await this.placeOrder(symbol, side, "TAKE_PROFIT_MARKET", quantity, {
      stopPrice: takeProfitPrice,
      reduceOnly: true,
      positionSide,
    })

    // Place stop loss order
    const slOrder = await this.placeOrder(symbol, side, "STOP_MARKET", quantity, {
      stopPrice: stopLossPrice,
      reduceOnly: true,
      positionSide,
    })

    return [tpOrder, slOrder]
  }
}

// Export singleton instance
export const binanceOrderManager = BinanceOrderManager.getInstance()
