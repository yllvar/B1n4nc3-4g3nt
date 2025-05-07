import { NextResponse } from "next/server"

export async function GET() {
  // In a real implementation, this would fetch error logs
  // For now, we'll generate mock data
  const now = Date.now()

  const errorTypes = [
    "WebSocketConnectionError",
    "DataValidationError",
    "APIResponseError",
    "TimeoutError",
    "UnexpectedDataFormatError",
  ]

  const errorMessages = [
    "Connection refused",
    "Invalid data format received",
    "API returned status 429",
    "Request timed out after 30s",
    "Expected array but received object",
    "WebSocket connection closed unexpectedly",
    "Failed to parse JSON response",
    "Rate limit exceeded",
  ]

  const errors = Array.from({ length: 10 }, (_, i) => {
    const timestamp = now - Math.floor(Math.random() * 24 * 3600 * 1000)
    const type = errorTypes[Math.floor(Math.random() * errorTypes.length)]
    const message = errorMessages[Math.floor(Math.random() * errorMessages.length)]

    return {
      timestamp,
      type,
      message,
      context: {
        endpoint: Math.random() > 0.5 ? "/api/v3/ticker/price" : "/api/v3/klines",
        params: { symbol: "BTCUSDT", interval: "1m" },
        statusCode: Math.random() > 0.7 ? 429 : 500,
      },
      stack: `Error: ${message}\n    at WebSocketClient.connect (websocket-client.ts:45:23)\n    at async connectToStream (market-data-service.ts:78:12)`,
    }
  }).sort((a, b) => b.timestamp - a.timestamp)

  return NextResponse.json({
    errors,
  })
}
