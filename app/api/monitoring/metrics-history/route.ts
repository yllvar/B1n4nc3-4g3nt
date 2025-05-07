import { NextResponse } from "next/server"

export async function GET() {
  // In a real implementation, this would fetch historical data
  // For now, we'll generate mock data
  const now = Date.now()
  const history = Array.from({ length: 24 }, (_, i) => {
    const timestamp = now - (23 - i) * 3600 * 1000
    return {
      timestamp,
      messageRate: Math.random() * 100 + 50,
      latency: Math.random() * 20 + 5,
      hitRate: Math.random() * 30 + 70,
      missRate: Math.random() * 30,
      stream:
        i % 5 === 0
          ? "btcusdt@trade"
          : i % 5 === 1
            ? "ethusdt@trade"
            : i % 5 === 2
              ? "btcusdt@depth"
              : i % 5 === 3
                ? "ethusdt@kline_1m"
                : "bnbusdt@trade",
    }
  })

  return NextResponse.json({
    history,
  })
}
