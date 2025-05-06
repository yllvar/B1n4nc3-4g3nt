import type { Kline, ParsedKline, TradingSignal } from "../types/market-types"

/**
 * Converts string values in Kline data to numbers for calculations
 */
export function parseKlineData(kline: Kline): ParsedKline {
  return {
    openTime: kline.openTime,
    open: Number.parseFloat(kline.open),
    high: Number.parseFloat(kline.high),
    low: Number.parseFloat(kline.low),
    close: Number.parseFloat(kline.close),
    volume: Number.parseFloat(kline.volume),
    closeTime: kline.closeTime,
    quoteAssetVolume: Number.parseFloat(kline.quoteAssetVolume),
    trades: kline.trades,
    takerBuyBaseAssetVolume: Number.parseFloat(kline.takerBuyBaseAssetVolume),
    takerBuyQuoteAssetVolume: Number.parseFloat(kline.takerBuyQuoteAssetVolume),
    quoteVolume: Number.parseFloat(kline.quoteAssetVolume), // Same as quoteAssetVolume
    takerBuyBaseVolume: Number.parseFloat(kline.takerBuyBaseAssetVolume), // Same as takerBuyBaseAssetVolume
    takerBuyQuoteVolume: Number.parseFloat(kline.takerBuyQuoteAssetVolume), // Same as takerBuyQuoteAssetVolume
    ignored: kline.ignored ? Number.parseFloat(kline.ignored) : 0,
  }
}

/**
 * Converts legacy KlineData format to the canonical Kline format
 * This helps maintain backward compatibility
 */
export function adaptLegacyKlineFormat(legacyKline: any): Kline {
  // Handle different property naming conventions
  return {
    openTime: legacyKline.openTime || legacyKline.open_time,
    open: String(legacyKline.open),
    high: String(legacyKline.high),
    low: String(legacyKline.low),
    close: String(legacyKline.close),
    volume: String(legacyKline.volume),
    closeTime: legacyKline.closeTime || legacyKline.close_time,
    quoteAssetVolume: String(legacyKline.quoteAssetVolume || legacyKline.quote_asset_volume),
    trades: legacyKline.trades,
    takerBuyBaseAssetVolume: String(legacyKline.takerBuyBaseAssetVolume || legacyKline.taker_buy_base_asset_volume),
    takerBuyQuoteAssetVolume: String(legacyKline.takerBuyQuoteAssetVolume || legacyKline.taker_buy_quote_asset_volume),
    ignored: String(legacyKline.ignored || "0"),
  }
}

/**
 * Standardizes signal format for visualization components
 */
export function standardizeSignalFormat(signal: any): TradingSignal {
  return {
    timestamp: signal.timestamp || Date.now(),
    symbol: signal.symbol || "UNKNOWN",
    interval: signal.interval || "1m",
    type: signal.type || "NEUTRAL",
    price: signal.price || 0,
    confidence: signal.confidence || 0,
    indicators: signal.indicators || {},
    metadata: signal.metadata || {},
  }
}
