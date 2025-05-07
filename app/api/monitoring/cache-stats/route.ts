import { NextResponse } from "next/server"

export async function GET() {
  // In a real implementation, this would fetch data from your cache manager
  // For now, we'll return mock data
  return NextResponse.json({
    size: Math.floor(Math.random() * 800 + 200),
    hitRate: Math.random() * 30 + 70,
    missRate: Math.random() * 30,
    evictions: Math.floor(Math.random() * 50),
    maxSize: 1000,
  })
}
