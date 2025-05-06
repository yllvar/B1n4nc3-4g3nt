import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import WebSocketStatus from "@/features/monitoring/components/websocket-status"
import PerformanceMetrics from "@/features/monitoring/components/performance-metrics"

export default function MonitoringPage() {
  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8 bg-background">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">WebSocket Monitoring</h1>

        <Suspense fallback={<Skeleton className="h-[600px] w-full rounded-xl" />}>
          <Card>
            <CardContent className="p-0">
              <Tabs defaultValue="status" className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b bg-muted/50 p-0">
                  <TabsTrigger value="status" className="rounded-none border-r data-[state=active]:bg-background">
                    Connection Status
                  </TabsTrigger>
                  <TabsTrigger value="performance" className="rounded-none border-r data-[state=active]:bg-background">
                    Performance
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="status" className="p-6">
                  <WebSocketStatus />
                </TabsContent>

                <TabsContent value="performance" className="p-6">
                  <PerformanceMetrics />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </Suspense>
      </div>
    </main>
  )
}
