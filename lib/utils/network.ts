/**
 * Network utility functions
 */

/**
 * Check if the network is online
 * Safely checks navigator.onLine with a fallback for SSR
 * @returns boolean indicating network status
 */
export function isNetworkOnline(): boolean {
  // Check if we're in a browser environment
  if (typeof window !== "undefined" && typeof navigator !== "undefined") {
    return navigator.onLine
  }

  // Default to true in non-browser environments
  return true
}

/**
 * Network status monitoring
 */
export class NetworkMonitor {
  private static instance: NetworkMonitor
  private isOnline = true
  private listeners: Set<(online: boolean) => void> = new Set()

  private constructor() {
    if (typeof window !== "undefined") {
      // Initialize with current status
      this.isOnline = navigator.onLine

      // Set up event listeners
      window.addEventListener("online", this.handleOnline)
      window.addEventListener("offline", this.handleOffline)
    }
  }

  public static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor()
    }
    return NetworkMonitor.instance
  }

  private handleOnline = () => {
    this.isOnline = true
    this.notifyListeners()
  }

  private handleOffline = () => {
    this.isOnline = false
    this.notifyListeners()
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.isOnline))
  }

  public addStatusChangeListener(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener)

    // Return a function to remove the listener
    return () => {
      this.listeners.delete(listener)
    }
  }

  public getStatus(): boolean {
    return this.isOnline
  }

  public destroy(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline)
      window.removeEventListener("offline", this.handleOffline)
    }
    this.listeners.clear()
  }
}

// Export a singleton instance
export const networkMonitor = typeof window !== "undefined" ? NetworkMonitor.getInstance() : undefined
