/**
 * Cache Manager
 * Provides efficient caching with size limits, TTL, and eviction policies
 */

export interface CacheOptions {
  maxSize?: number
  ttl?: number
  evictionPolicy?: "lru" | "fifo" | "lfu"
  namespace?: string
  debug?: boolean
}

export interface CacheEntry<T> {
  key: string
  value: T
  timestamp: number
  lastAccessed: number
  accessCount: number
}

export interface CacheStats {
  size: number
  maxSize: number
  hits: number
  misses: number
  hitRate: number
  evictions: number
  oldestEntry: number | null
  newestEntry: number | null
}

export class CacheManager<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map()
  private maxSize: number
  private ttl: number
  private evictionPolicy: "lru" | "fifo" | "lfu"
  private namespace: string
  private debug: boolean
  private hits = 0
  private misses = 0
  private evictions = 0
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 1000
    this.ttl = options.ttl || 60000 // 1 minute default
    this.evictionPolicy = options.evictionPolicy || "lru"
    this.namespace = options.namespace || "default"
    this.debug = options.debug || false

    // Start automatic cleanup
    this.cleanupInterval = setInterval(() => this.cleanup(), Math.min(this.ttl / 2, 30000))
  }

  /**
   * Set a value in the cache
   */
  public set(key: string, value: T): void {
    const fullKey = this.getFullKey(key)
    const now = Date.now()

    // Check if we need to evict entries before adding a new one
    if (!this.cache.has(fullKey) && this.cache.size >= this.maxSize) {
      this.evict()
    }

    this.cache.set(fullKey, {
      key: fullKey,
      value,
      timestamp: now,
      lastAccessed: now,
      accessCount: 0,
    })

    this.log(`Set: ${key}`)
  }

  /**
   * Get a value from the cache
   */
  public get(key: string): T | null {
    const fullKey = this.getFullKey(key)
    const entry = this.cache.get(fullKey)

    if (!entry) {
      this.misses++
      this.log(`Miss: ${key}`)
      return null
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(fullKey)
      this.misses++
      this.log(`Expired: ${key}`)
      return null
    }

    // Update access stats
    entry.lastAccessed = Date.now()
    entry.accessCount++
    this.hits++

    this.log(`Hit: ${key}`)
    return entry.value
  }

  /**
   * Check if a key exists in the cache and is not expired
   */
  public has(key: string): boolean {
    const fullKey = this.getFullKey(key)
    const entry = this.cache.get(fullKey)

    if (!entry) {
      return false
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(fullKey)
      return false
    }

    return true
  }

  /**
   * Delete a key from the cache
   */
  public delete(key: string): boolean {
    const fullKey = this.getFullKey(key)
    return this.cache.delete(fullKey)
  }

  /**
   * Clear all entries from the cache
   */
  public clear(): void {
    this.cache.clear()
    this.log("Cache cleared")
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    let oldestTimestamp: number | null = null
    let newestTimestamp: number | null = null

    for (const entry of this.cache.values()) {
      if (oldestTimestamp === null || entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp
      }
      if (newestTimestamp === null || entry.timestamp > newestTimestamp) {
        newestTimestamp = entry.timestamp
      }
    }

    const totalRequests = this.hits + this.misses
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate,
      evictions: this.evictions,
      oldestEntry: oldestTimestamp,
      newestEntry: newestTimestamp,
    }
  }

  /**
   * Set the TTL for the cache
   */
  public setTTL(ttl: number): void {
    this.ttl = ttl
  }

  /**
   * Set the maximum size of the cache
   */
  public setMaxSize(maxSize: number): void {
    this.maxSize = maxSize
    if (this.cache.size > maxSize) {
      // Evict entries until we're under the limit
      while (this.cache.size > maxSize) {
        this.evict()
      }
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    let expiredCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key)
        expiredCount++
      }
    }

    if (expiredCount > 0) {
      this.log(`Cleaned up ${expiredCount} expired entries`)
    }
  }

  /**
   * Evict an entry based on the eviction policy
   */
  private evict(): void {
    if (this.cache.size === 0) return

    let keyToEvict: string | null = null

    switch (this.evictionPolicy) {
      case "lru": // Least Recently Used
        keyToEvict = this.findLRUKey()
        break
      case "fifo": // First In First Out
        keyToEvict = this.findOldestKey()
        break
      case "lfu": // Least Frequently Used
        keyToEvict = this.findLFUKey()
        break
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict)
      this.evictions++
      this.log(`Evicted: ${keyToEvict} (${this.evictionPolicy})`)
    }
  }

  /**
   * Find the least recently used key
   */
  private findLRUKey(): string | null {
    let oldestAccess = Number.POSITIVE_INFINITY
    let lruKey: string | null = null

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed
        lruKey = key
      }
    }

    return lruKey
  }

  /**
   * Find the oldest key (first in)
   */
  private findOldestKey(): string | null {
    let oldestTimestamp = Number.POSITIVE_INFINITY
    let oldestKey: string | null = null

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp
        oldestKey = key
      }
    }

    return oldestKey
  }

  /**
   * Find the least frequently used key
   */
  private findLFUKey(): string | null {
    let lowestCount = Number.POSITIVE_INFINITY
    let lfuKey: string | null = null

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < lowestCount) {
        lowestCount = entry.accessCount
        lfuKey = key
      }
    }

    return lfuKey
  }

  /**
   * Check if an entry has expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > this.ttl
  }

  /**
   * Get the full key with namespace
   */
  private getFullKey(key: string): string {
    return `${this.namespace}:${key}`
  }

  /**
   * Log message if debug is enabled
   */
  private log(message: string): void {
    if (this.debug) {
      console.log(`[CacheManager:${this.namespace}] ${message}`)
    }
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

export default CacheManager
