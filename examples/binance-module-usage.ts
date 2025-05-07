/**
 * Binance Module Usage Examples
 *
 * This file demonstrates how to use the Binance module.
 * It's for documentation purposes only and is not meant to be executed.
 */

import {
  binanceApiService,
  binanceAccountManager,
  initializeBinanceModule,
  type OrderSide,
  type OrderType,
  type PositionSide,
} from "../lib/binance"

/**
 * Example: Initialize the Binance module
 */
async function initializeExample(): Promise<void> {
  // Initialize with test mode (no real orders will be placed)
  initializeBinanceModule(true)

  // Check if test mode is enabled
  const isTestMode = binanceApiService.isTestMode()
  console.log(`Test mode enabled: ${isTestMode}`)
}

/**
 * Example: Get account information
 */
async function accountExample(): Promise<void> {
  try {
    // Get account information
    const accountInfo = await binanceApiService.getAccountInfo()
    console.log(`Account status: ${accountInfo.canTrade ? "Active" : "Inactive"}`)

    // Get specific asset balance
    const btcBalance = await binanceApiService.getAssetBalance("BTC")
    if (btcBalance) {
      console.log(`BTC Balance: ${btcBalance.free} (free), ${btcBalance.locked} (locked)`)
    }

    // Get trading fees
    const tradingFees = await binanceAccountManager.getTradingFee("BTCUSDT")
    console.log(`BTCUSDT Maker Fee: ${tradingFees[0]?.makerCommission}, Taker Fee: ${tradingFees[0]?.takerCommission}`)
  } catch (error) {
    console.error("Error in account example:", error)
  }
}

/**
 * Example: Place and manage orders
 */
async function orderExample(): Promise<void> {
  try {
    const symbol = "BTCUSDT"

    // Place a market order
    const marketOrder = await binanceApiService.placeOrder(symbol, "BUY" as OrderSide, "MARKET" as OrderType, 0.001)
    console.log(`Market order placed: ${marketOrder.orderId}`)

    // Place a limit order
    const limitOrder = await binanceApiService.placeOrder(symbol, "BUY" as OrderSide, "LIMIT" as OrderType, 0.001, {
      price: 20000,
      timeInForce: "GTC",
    })
    console.log(`Limit order placed: ${limitOrder.orderId}`)

    // Get order status
    const orderStatus = await binanceApiService.getOrderStatus(symbol, { orderId: limitOrder.orderId })
    console.log(`Order status: ${orderStatus.status}`)

    // Cancel an order
    const cancelResult = await binanceApiService.cancelOrder(symbol, { orderId: limitOrder.orderId })
    console.log(`Order canceled: ${cancelResult.status}`)

    // Get all open orders
    const openOrders = await binanceApiService.getOpenOrders(symbol)
    console.log(`Open orders: ${openOrders.length}`)
  } catch (error) {
    console.error("Error in order example:", error)
  }
}

/**
 * Example: Manage positions
 */
async function positionExample(): Promise<void> {
  try {
    const symbol = "BTCUSDT"

    // Change leverage
    await binanceApiService.changeLeverage(symbol, 5)
    console.log("Leverage changed to 5x")

    // Change margin type
    await binanceApiService.changeMarginType(symbol, "ISOLATED")
    console.log("Margin type changed to ISOLATED")

    // Check if position exists
    const hasPosition = await binanceApiService.hasPosition(symbol)
    console.log(`Has position: ${hasPosition}`)

    // Get position size
    const positionSize = await binanceApiService.getPositionSize(symbol)
    console.log(`Position size: ${positionSize}`)

    // If we have a position, set take profit and stop loss
    if (hasPosition && positionSize > 0) {
      const position = await binanceApiService.getPosition(symbol)
      if (position) {
        const entryPrice = Number.parseFloat(position.entryPrice)
        const takeProfitPrice = entryPrice * 1.05 // 5% profit
        const stopLossPrice = entryPrice * 0.95 // 5% loss

        // Place TP/SL orders
        const [tpOrder, slOrder] = await binanceApiService.placeTpSlOrders(
          symbol,
          "LONG" as PositionSide,
          takeProfitPrice,
          stopLossPrice,
          Math.abs(positionSize),
        )

        console.log(`Take profit order placed: ${tpOrder.orderId}`)
        console.log(`Stop loss order placed: ${slOrder.orderId}`)
      }
    }
  } catch (error) {
    console.error("Error in position example:", error)
  }
}

/**
 * Run all examples
 */
async function runExamples(): Promise<void> {
  await initializeExample()
  await accountExample()
  await orderExample()
  await positionExample()
}

// This is just for documentation, don't actually run it
// runExamples().catch(console.error)
