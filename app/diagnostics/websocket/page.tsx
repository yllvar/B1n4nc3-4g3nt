import { WebSocketDiagnosticsDashboard } from "@/components/diagnostics/websocket-diagnostics-dashboard"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function WebSocketDiagnosticsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href="/diagnostics">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Diagnostics
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">WebSocket Diagnostics</h1>
      </div>

      <p className="text-gray-600 mb-8">
        This page helps diagnose WebSocket connection issues and monitor performance metrics.
      </p>

      <WebSocketDiagnosticsDashboard />
    </div>
  )
}
