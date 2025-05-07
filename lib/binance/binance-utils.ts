/**
 * Binance API Utilities
 *
 * Contains utility functions for the Binance API including
 * signature creation, query string formatting, and other helpers.
 */
import crypto from "crypto"

/**
 * Create a signature for API request
 *
 * @param queryString - The query string to sign
 * @param apiSecret - The API secret key
 * @returns The HMAC SHA256 signature
 *
 * @example
 * ```typescript
 * const signature = createSignature('symbol=BTCUSDT&side=BUY&type=MARKET&quantity=0.001&timestamp=1619712000000', 'mySecret');
 * ```
 */
export function createSignature(queryString: string, apiSecret: string): string {
  return crypto.createHmac("sha256", apiSecret).update(queryString).digest("hex")
}

/**
 * Create a query string from parameters
 *
 * @param params - The parameters to convert to a query string
 * @returns The formatted query string
 *
 * @example
 * ```typescript
 * const queryString = createQueryString({
 *   symbol: 'BTCUSDT',
 *   side: 'BUY',
 *   type: 'MARKET',
 *   quantity: 0.001,
 *   timestamp: 1619712000000
 * });
 * // Returns: "symbol=BTCUSDT&side=BUY&type=MARKET&quantity=0.001&timestamp=1619712000000"
 * ```
 */
export function createQueryString(params: Record<string, any>): string {
  return Object.entries(params)
    .filter(([_, value]) => value !== undefined) // Filter out undefined values
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&")
}

/**
 * Generate a client order ID with a prefix and random component
 *
 * @param prefix - The prefix for the client order ID
 * @returns A unique client order ID
 *
 * @example
 * ```typescript
 * const orderId = generateClientOrderId('algo_');
 * // Returns something like: "algo_1619712000000_123"
 * ```
 */
export function generateClientOrderId(prefix = "algo_"): string {
  return `${prefix}${Date.now()}_${Math.floor(Math.random() * 1000)}`
}

/**
 * Format number to string with proper precision
 *
 * @param num - The number to format
 * @param precision - The maximum number of decimal places
 * @returns The formatted number as a string
 *
 * @example
 * ```typescript
 * const formatted = formatNumber(0.12340000, 8);
 * // Returns: "0.1234"
 * ```
 */
export function formatNumber(num: number, precision = 8): string {
  return num.toFixed(precision).replace(/\.?0+$/, "")
}

/**
 * Parse a string value to a number
 *
 * @param value - The string value to parse
 * @returns The parsed number or 0 if invalid
 *
 * @example
 * ```typescript
 * const num = parseNumberString("123.45");
 * // Returns: 123.45
 * ```
 */
export function parseNumberString(value: string): number {
  const parsed = Number.parseFloat(value)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Calculate the precision required for a number
 *
 * @param stepSize - The step size from symbol info
 * @returns The number of decimal places
 *
 * @example
 * ```typescript
 * const precision = calculatePrecision("0.001");
 * // Returns: 3
 * ```
 */
export function calculatePrecision(stepSize: string): number {
  const decimalIndex = stepSize.indexOf(".")
  if (decimalIndex === -1) return 0

  // Find the last non-zero digit
  let precision = 0
  for (let i = decimalIndex + 1; i < stepSize.length; i++) {
    precision++
    if (stepSize[i] !== "0") {
      return precision
    }
  }

  return precision
}
