import { NextResponse } from "next/server"

export async function GET() {
  // In a real implementation, this would fetch data from your monitoring service
  // For now, we'll return mock data
  return NextResponse.json({
    status: "connected",
    messageRate: Math.random() * 100 + 50,
    latency: Math.random() * 20 + 5,
    reconnects: Math.floor(Math.random() * 5),
    errors: Math.floor(Math.random() * 3),
    uptime: Math.floor(Math.random() * 3600),
    activeStreams: ["btcusdt@trade", "ethusdt@trade", "btcusdt@depth", "ethusdt@kline_1m", "bnbusdt@trade"],
  })
}
