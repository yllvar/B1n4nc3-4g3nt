/**
 * Binance Position Manager
 * Handles position-related operations
 */
import { Singleton } from "../utils/singleton"
import { binanceApiClient } from "./binance-api-client"
import type { PositionRisk } from "../types"

export class BinancePositionManager extends Singleton<BinancePositionManager> {
  private constructor() {
    super()
  }

  public static getInstance(): BinancePositionManager {
    return super.getInstance()
  }

  /**
   * Get position information
   */
  public async getPositionRisk(symbol?: string): Promise<PositionRisk[]> {
    const params: Record<string, any> = {}
    if (symbol) {
      params.symbol = symbol
    }
    return binanceApiClient.makeSignedRequest<PositionRisk[]>("/positionRisk", "GET", params, 5)
  }

  /**
   * Get position for a specific symbol
   */
  public async getPosition(symbol: string): Promise<PositionRisk | null> {
    const positions = await this.getPositionRisk(symbol)
    return positions.find((p) => p.symbol === symbol) || null
  }

  /**
   * Check if a position exists
   */
  public async hasPosition(symbol: string): Promise<boolean> {
    const position = await this.getPosition(symbol)
    return position !== null && Number.parseFloat(position.positionAmt) !== 0
  }

  /**
   * Get position size
   */
  public async getPositionSize(symbol: string): Promise<number> {
    const position = await this.getPosition(symbol)
    return position ? Number.parseFloat(position.positionAmt) : 0
  }
}

// Export singleton instance
export const binancePositionManager = BinancePositionManager.getInstance()
