import { RealTimeDashboard } from "@/features/monitoring/components/real-time-dashboard"

export const metadata = {
  title: "Real-Time Monitoring Dashboard",
  description: "Monitor WebSocket connections, cache performance, and system health in real-time",
}

export default function RealTimeMonitoringPage() {
  return (
    <div className="container mx-auto py-6">
      <RealTimeDashboard refreshInterval={5000} />
    </div>
  )
}
