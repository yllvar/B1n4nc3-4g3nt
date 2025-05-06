/**
 * Utility functions for WebSocket diagnostics
 */

export interface WebSocketDiagnosticResult {
  success: boolean
  message: string
  details?: Record<string, any>
}

/**
 * Check if the browser supports WebSockets
 */
export function checkWebSocketSupport(): WebSocketDiagnosticResult {
  if (typeof WebSocket === "undefined") {
    return {
      success: false,
      message: "WebSocket API is not supported in this browser",
    }
  }

  return {
    success: true,
    message: "WebSocket API is supported",
  }
}

/**
 * Check if the browser is online
 */
export function checkOnlineStatus(): WebSocketDiagnosticResult {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      success: false,
      message: "Browser is offline",
    }
  }

  return {
    success: true,
    message: "Browser is online",
  }
}

/**
 * Test a WebSocket connection to a specific URL
 */
export async function testWebSocketConnection(url: string): Promise<WebSocketDiagnosticResult> {
  return new Promise((resolve) => {
    try {
      const startTime = Date.now()
      const socket = new WebSocket(url)

      // Set a timeout in case the connection hangs
      const timeout = setTimeout(() => {
        socket.close()
        resolve({
          success: false,
          message: "Connection timed out after 5 seconds",
        })
      }, 5000)

      socket.onopen = () => {
        clearTimeout(timeout)
        const latency = Date.now() - startTime
        resolve({
          success: true,
          message: "Connection established successfully",
          details: { latency },
        })
        socket.close()
      }

      socket.onerror = () => {
        clearTimeout(timeout)
        resolve({
          success: false,
          message: "Failed to connect to WebSocket server",
        })
      }
    } catch (error) {
      resolve({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      })
    }
  })
}

/**
 * Diagnose common WebSocket issues
 */
export async function diagnoseWebSocketIssues(url: string): Promise<WebSocketDiagnosticResult[]> {
  const results: WebSocketDiagnosticResult[] = []

  // Check WebSocket support
  const supportResult = checkWebSocketSupport()
  results.push(supportResult)
  if (!supportResult.success) {
    return results
  }

  // Check online status
  const onlineResult = checkOnlineStatus()
  results.push(onlineResult)
  if (!onlineResult.success) {
    return results
  }

  // Test connection
  const connectionResult = await testWebSocketConnection(url)
  results.push(connectionResult)

  return results
}
