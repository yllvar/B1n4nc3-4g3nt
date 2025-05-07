/**
 * Binance API Client
 *
 * Handles low-level API requests to Binance with proper rate limiting,
 * error handling, and request signing.
 */
import { Singleton } from "../utils/singleton"
import { errorHandler } from "../error-handling"
import { ApiError } from "../error-handling/error-types"
import { env } from "../env"
import { retryFetch } from "../error-handling/retry-mechanism"
import { BinanceRateLimiter } from "./binance-rate-limiter"
import { createSignature, createQueryString } from "./binance-utils"
import type { RateLimitType } from "../types/binance-types"

/**
 * Options for API requests
 */
interface RequestOptions {
  weight?: number
  rateLimitType?: RateLimitType
  showInLogs?: boolean
}

/**
 * Binance API Client
 * Handles low-level API requests to Binance
 */
export class BinanceApiClient extends Singleton<BinanceApiClient> {
  private apiKey: string
  private apiSecret: string
  private baseUrl: string
  private futuresBaseUrl: string
  private rateLimiter: BinanceRateLimiter
  private testMode = false

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    super()
    this.apiKey = env.BINANCE_API_KEY
    this.apiSecret = env.BINANCE_API_SECRET
    this.baseUrl = env.BINANCE_API_BASE_URL
    this.futuresBaseUrl = `${this.baseUrl}/fapi/v1`
    this.rateLimiter = BinanceRateLimiter.getInstance()
  }

  /**
   * Get the singleton instance of BinanceApiClient
   * @returns The singleton instance
   */
  public static getInstance(): BinanceApiClient {
    return super.getInstance()
  }

  /**
   * Set test mode for API requests
   * @param enabled - Whether test mode is enabled
   */
  public setTestMode(enabled: boolean): void {
    this.testMode = enabled
    console.log(`Test mode ${enabled ? "enabled" : "disabled"} for Binance API Client`)
  }

  /**
   * Check if test mode is enabled
   * @returns Whether test mode is enabled
   */
  public isTestMode(): boolean {
    return this.testMode
  }

  /**
   * Make a signed request to the Binance API
   *
   * @param endpoint - API endpoint
   * @param method - HTTP method
   * @param params - Request parameters
   * @param options - Additional options
   * @returns Promise with the API response
   *
   * @example
   * ```typescript
   * const response = await binanceApiClient.makeSignedRequest<OrderResponse>(
   *   '/order',
   *   'POST',
   *   { symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', quantity: 0.001 }
   * );
   * ```
   */
  public async makeSignedRequest<T>(
    endpoint: string,
    method: "GET" | "POST" | "DELETE" = "GET",
    params: Record<string, any> = {},
    options: RequestOptions = {},
  ): Promise<T> {
    try {
      const { weight = 1, rateLimitType = "REQUEST_WEIGHT", showInLogs = true } = options

      // Check rate limits
      await this.rateLimiter.checkRateLimit(rateLimitType, weight)
      if (method === "POST" || method === "DELETE") {
        await this.rateLimiter.checkRateLimit("ORDERS")
      }

      // Add timestamp
      params.timestamp = Date.now()

      // Create query string
      const queryString = createQueryString(params)

      // Create signature
      const signature = createSignature(queryString, this.apiSecret)

      // Make request
      const url = `${this.futuresBaseUrl}${endpoint}?${queryString}&signature=${signature}`

      // Log request if not sensitive
      if (showInLogs) {
        console.log(`Making ${method} request to ${endpoint}`)
      }

      const response = await retryFetch(url, {
        method,
        headers: {
          "X-MBX-APIKEY": this.apiKey,
          "Content-Type": "application/json",
        },
        maxRetries: 3,
        retryCondition: (error) => {
          // Retry on network errors or 5xx errors
          return error.message.includes("network") || error.message.includes("timeout") || error.message.includes("5")
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new ApiError(`Binance API error: ${errorData.msg || "Unknown error"}`, {
          code: `BINANCE_ERROR_${errorData.code || "UNKNOWN"}`,
          context: {
            endpoint,
            params: showInLogs ? params : { ...params, sensitive: "***" },
            errorCode: errorData.code,
            errorMsg: errorData.msg,
          },
        })
      }

      return await response.json()
    } catch (error) {
      errorHandler.handleError(error, {
        context: {
          service: "BinanceApiClient",
          action: "makeSignedRequest",
          endpoint,
          method,
          params: options.showInLogs ? params : { sensitive: "***" },
        },
        severity: "high",
      })
      throw error
    }
  }

  /**
   * Make an unsigned request to the Binance API
   *
   * @param endpoint - API endpoint
   * @param params - Request parameters
   * @param options - Additional options
   * @returns Promise with the API response
   *
   * @example
   * ```typescript
   * const response = await binanceApiClient.makeUnsignedRequest<ExchangeInfo>(
   *   '/exchangeInfo'
   * );
   * ```
   */
  public async makeUnsignedRequest<T>(
    endpoint: string,
    params: Record<string, any> = {},
    options: RequestOptions = {},
  ): Promise<T> {
    try {
      const { weight = 1, rateLimitType = "REQUEST_WEIGHT", showInLogs = true } = options

      // Check rate limits
      await this.rateLimiter.checkRateLimit(rateLimitType, weight)

      // Create query string
      const queryString = createQueryString(params)

      // Make request
      const url = `${this.futuresBaseUrl}${endpoint}${queryString ? `?${queryString}` : ""}`

      // Log request if not sensitive
      if (showInLogs) {
        console.log(`Making GET request to ${endpoint}`)
      }

      const response = await retryFetch(url, {
        headers: {
          "X-MBX-APIKEY": this.apiKey,
          "Content-Type": "application/json",
        },
        maxRetries: 3,
        retryCondition: (error) => {
          // Retry on network errors or 5xx errors
          return error.message.includes("network") || error.message.includes("timeout") || error.message.includes("5")
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new ApiError(`Binance API error: ${errorData.msg || "Unknown error"}`, {
          code: `BINANCE_ERROR_${errorData.code || "UNKNOWN"}`,
          context: {
            endpoint,
            params: showInLogs ? params : { sensitive: "***" },
            errorCode: errorData.code,
            errorMsg: errorData.msg,
          },
        })
      }

      return await response.json()
    } catch (error) {
      errorHandler.handleError(error, {
        context: {
          service: "BinanceApiClient",
          action: "makeUnsignedRequest",
          endpoint,
          params: options.showInLogs ? params : { sensitive: "***" },
        },
        severity: "medium",
      })
      throw error
    }
  }

  /**
   * Get the current rate limit status
   * @returns The current rate limit status
   */
  public getRateLimitStatus(): Record<string, { current: number; limit: number; resetIn: number }> {
    return this.rateLimiter.getRateLimitStatus()
  }
}

// Export singleton instance
export const binanceApiClient = BinanceApiClient.getInstance()
