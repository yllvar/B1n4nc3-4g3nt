import { MarketDashboard } from "@/features/market/components/market-dashboard"
import { ResponsiveContainer } from "@/components/layout/responsive-container"

export default function DashboardPage() {
  return (
    <div className="py-6 md:py-8">
      <ResponsiveContainer>
        <MarketDashboard />
      </ResponsiveContainer>
    </div>
  )
}
