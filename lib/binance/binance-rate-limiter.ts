/**
 * Binance Rate Limiter
 *
 * Handles rate limiting for Binance API requests to prevent
 * exceeding API limits and getting temporarily banned.
 */
import { Singleton } from "../utils/singleton"
import { errorHandler } from "../error-handling"
import type { RateLimitType } from "../types/binance-types"

/**
 * Rate limit information
 */
interface RateLimit {
  limit: number
  count: number
  resetTime: number
}

/**
 * Binance Rate Limiter
 * Handles rate limiting for Binance API requests
 */
export class BinanceRateLimiter extends Singleton<BinanceRateLimiter> {
  private rateLimits: Map<RateLimitType, RateLimit> = new Map()

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    super()
    // Initialize rate limits
    this.rateLimits.set("REQUEST_WEIGHT", { limit: 1200, count: 0, resetTime: Date.now() + 60000 })
    this.rateLimits.set("ORDERS", { limit: 50, count: 0, resetTime: Date.now() + 10000 })
    this.rateLimits.set("RAW_REQUESTS", { limit: 5000, count: 0, resetTime: Date.now() + 300000 })

    // Set up automatic reset
    setInterval(() => this.resetExpiredLimits(), 1000)
  }

  /**
   * Get the singleton instance of BinanceRateLimiter
   * @returns The singleton instance
   */
  public static getInstance(): BinanceRateLimiter {
    return super.getInstance()
  }

  /**
   * Check if a rate limit has been exceeded
   *
   * @param type - The type of rate limit to check
   * @param weight - The weight of the request
   * @returns Promise that resolves when the request can proceed
   *
   * @example
   * ```typescript
   * // Check if we can make a request with weight 5
   * await rateLimiter.checkRateLimit("REQUEST_WEIGHT", 5);
   * ```
   */
  public async checkRateLimit(type: RateLimitType, weight = 1): Promise<void> {
    const limit = this.rateLimits.get(type)

    if (!limit) {
      throw new Error(`Unknown rate limit type: ${type}`)
    }

    // Reset if expired
    if (Date.now() >= limit.resetTime) {
      this.resetLimit(type)
    }

    // Check if limit exceeded
    if (limit.count + weight > limit.limit) {
      const waitTime = limit.resetTime - Date.now()

      if (waitTime > 0) {
        console.warn(`Rate limit for ${type} exceeded. Waiting ${waitTime}ms before retrying.`)

        // Log the rate limit event
        errorHandler.handleError(`Rate limit for ${type} exceeded`, {
          context: {
            service: "BinanceRateLimiter",
            type,
            limit: limit.limit,
            count: limit.count,
            weight,
            waitTime,
          },
          severity: "medium",
          showToast: false,
        })

        // Wait until reset
        await new Promise((resolve) => setTimeout(resolve, waitTime + 100))

        // Reset the limit
        this.resetLimit(type)
      }
    }

    // Increment the counter
    limit.count += weight
  }

  /**
   * Reset a specific rate limit
   * @param type - The type of rate limit to reset
   */
  private resetLimit(type: RateLimitType): void {
    const limit = this.rateLimits.get(type)

    if (limit) {
      // Reset count and update reset time
      limit.count = 0

      // Set new reset time based on limit type
      switch (type) {
        case "REQUEST_WEIGHT":
          limit.resetTime = Date.now() + 60000 // 1 minute
          break
        case "ORDERS":
          limit.resetTime = Date.now() + 10000 // 10 seconds
          break
        case "RAW_REQUESTS":
          limit.resetTime = Date.now() + 300000 // 5 minutes
          break
      }
    }
  }

  /**
   * Reset all expired rate limits
   */
  private resetExpiredLimits(): void {
    const now = Date.now()

    this.rateLimits.forEach((limit, type) => {
      if (now >= limit.resetTime) {
        this.resetLimit(type)
      }
    })
  }

  /**
   * Get current rate limit status
   * @returns Record with current status of all rate limits
   */
  public getRateLimitStatus(): Record<string, { current: number; limit: number; resetIn: number }> {
    const status: Record<string, { current: number; limit: number; resetIn: number }> = {}

    this.rateLimits.forEach((limit, type) => {
      status[type] = {
        current: limit.count,
        limit: limit.limit,
        resetIn: Math.max(0, limit.resetTime - Date.now()),
      }
    })

    return status
  }
}

// Export singleton instance
export const binanceRateLimiter = BinanceRateLimiter.getInstance()
