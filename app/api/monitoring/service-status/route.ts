import { NextResponse } from "next/server"

export async function GET() {
  // In a real implementation, this would check various services
  // For now, we'll return mock data
  const statuses = ["operational", "degraded", "down"]
  const weights = [0.8, 0.15, 0.05] // 80% chance of operational, 15% degraded, 5% down

  const random = Math.random()
  let status

  if (random < weights[0]) {
    status = statuses[0]
  } else if (random < weights[0] + weights[1]) {
    status = statuses[1]
  } else {
    status = statuses[2]
  }

  return NextResponse.json({
    status,
  })
}
