/**
 * Binance Account Manager
 * Handles account-related operations including account information, balances, and settings
 * @module BinanceAccountManager
 */
import { Singleton } from "../utils/singleton"
import { binanceApiClient } from "./binance-api-client"
import { errorHandler } from "../error-handling"
import type {
  AccountInfo,
  AssetBalance,
  ExchangeInfo,
  SymbolInfo,
  MarginType,
  BinanceAccountManagerInterface,
} from "../types"

/**
 * Manages Binance account operations
 * @example
 * ```typescript
 * // Get account information
 * const accountInfo = await binanceAccountManager.getAccountInfo();
 * console.log(`Account status: ${accountInfo.status}`);
 *
 * // Get specific asset balance
 * const btcBalance = await binanceAccountManager.getAssetBalance('BTC');
 * if (btcBalance) {
 *   console.log(`BTC Free: ${btcBalance.free}, Locked: ${btcBalance.locked}`);
 * }
 * ```
 */
export class BinanceAccountManager extends Singleton<BinanceAccountManager> implements BinanceAccountManagerInterface {
  private constructor() {
    super()
  }

  /**
   * Get account information including balances, permissions, and commission rates
   * @returns {Promise<AccountInfo>} Account information
   * @throws {BinanceError} If the API request fails
   */
  public async getAccountInfo(): Promise<AccountInfo> {
    try {
      return await binanceApiClient.makeSignedRequest<AccountInfo>("/account", "GET", {}, 10)
    } catch (error) {
      return errorHandler.handleError(error as Error, "Failed to get account information", {
        service: "BinanceAccountManager",
        method: "getAccountInfo",
      })
    }
  }

  /**
   * Get exchange information including symbols, filters, and exchange limits
   * @returns {Promise<ExchangeInfo>} Exchange information
   * @throws {BinanceError} If the API request fails
   */
  public async getExchangeInfo(): Promise<ExchangeInfo> {
    try {
      return await binanceApiClient.makeUnsignedRequest<ExchangeInfo>("/exchangeInfo")
    } catch (error) {
      return errorHandler.handleError(error as Error, "Failed to get exchange information", {
        service: "BinanceAccountManager",
        method: "getExchangeInfo",
      })
    }
  }

  /**
   * Get detailed information for a specific trading symbol
   * @param {string} symbol - The trading symbol (e.g., 'BTCUSDT')
   * @returns {Promise<SymbolInfo | null>} Symbol information or null if not found
   * @throws {BinanceError} If the API request fails
   */
  public async getSymbolInfo(symbol: string): Promise<SymbolInfo | null> {
    try {
      const exchangeInfo = await this.getExchangeInfo()
      const symbolInfo = exchangeInfo.symbols.find((s) => s.symbol === symbol)
      return symbolInfo || null
    } catch (error) {
      return errorHandler.handleError(error as Error, `Failed to get symbol information for ${symbol}`, {
        service: "BinanceAccountManager",
        method: "getSymbolInfo",
        symbol,
      })
    }
  }

  /**
   * Get account balances for all assets
   * @returns {Promise<AssetBalance[]>} Array of asset balances
   * @throws {BinanceError} If the API request fails
   */
  public async getAccountBalance(): Promise<AssetBalance[]> {
    try {
      const accountInfo = await this.getAccountInfo()
      return accountInfo.balances
    } catch (error) {
      return errorHandler.handleError(error as Error, "Failed to get account balances", {
        service: "BinanceAccountManager",
        method: "getAccountBalance",
      })
    }
  }

  /**
   * Get balance for a specific asset
   * @param {string} asset - The asset symbol (e.g., 'BTC')
   * @returns {Promise<AssetBalance | null>} Asset balance or null if not found
   * @throws {BinanceError} If the API request fails
   */
  public async getAssetBalance(asset: string): Promise<AssetBalance | null> {
    try {
      const balances = await this.getAccountBalance()
      return balances.find((b) => b.asset === asset) || null
    } catch (error) {
      return errorHandler.handleError(error as Error, `Failed to get balance for ${asset}`, {
        service: "BinanceAccountManager",
        method: "getAssetBalance",
        asset,
      })
    }
  }

  /**
   * Change leverage for a symbol
   * @param {string} symbol - The trading symbol (e.g., 'BTCUSDT')
   * @param {number} leverage - The leverage value (1-125)
   * @returns {Promise<{ leverage: number, maxNotionalValue: string, symbol: string }>} Leverage information
   * @throws {BinanceError} If the API request fails or leverage is invalid
   */
  public async changeLeverage(
    symbol: string,
    leverage: number,
  ): Promise<{ leverage: number; maxNotionalValue: string; symbol: string }> {
    try {
      if (leverage < 1 || leverage > 125) {
        throw new Error("Leverage must be between 1 and 125")
      }

      return await binanceApiClient.makeSignedRequest("/leverage", "POST", { symbol, leverage }, 1)
    } catch (error) {
      return errorHandler.handleError(error as Error, `Failed to change leverage for ${symbol}`, {
        service: "BinanceAccountManager",
        method: "changeLeverage",
        symbol,
        leverage,
      })
    }
  }

  /**
   * Change margin type for a symbol
   * @param {string} symbol - The trading symbol (e.g., 'BTCUSDT')
   * @param {MarginType} marginType - The margin type ('ISOLATED' or 'CROSSED')
   * @returns {Promise<{ code: number, msg: string }>} Response message
   * @throws {BinanceError} If the API request fails
   */
  public async changeMarginType(symbol: string, marginType: MarginType): Promise<{ code: number; msg: string }> {
    try {
      return await binanceApiClient.makeSignedRequest("/marginType", "POST", { symbol, marginType }, 1)
    } catch (error) {
      return errorHandler.handleError(error as Error, `Failed to change margin type for ${symbol}`, {
        service: "BinanceAccountManager",
        method: "changeMarginType",
        symbol,
        marginType,
      })
    }
  }

  /**
   * Get trading fee information for a symbol or all symbols
   * @param {string} [symbol] - Optional trading symbol (e.g., 'BTCUSDT')
   * @returns {Promise<Array<{ symbol: string, makerCommission: string, takerCommission: string }>>} Fee information
   * @throws {BinanceError} If the API request fails
   */
  public async getTradingFee(
    symbol?: string,
  ): Promise<Array<{ symbol: string; makerCommission: string; takerCommission: string }>> {
    try {
      const params = symbol ? { symbol } : {}
      return await binanceApiClient.makeSignedRequest("/commissionRate", "GET", params, 20)
    } catch (error) {
      return errorHandler.handleError(error as Error, `Failed to get trading fee${symbol ? ` for ${symbol}` : "s"}`, {
        service: "BinanceAccountManager",
        method: "getTradingFee",
        symbol,
      })
    }
  }
}

// Export singleton instance
export const binanceAccountManager = BinanceAccountManager.getInstance()
