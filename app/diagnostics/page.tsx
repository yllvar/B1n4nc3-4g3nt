import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, AlertCircle, Network, Cpu, BrainCircuit } from "lucide-react"

export default function DiagnosticsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Diagnostics Dashboard</h1>
      <p className="text-gray-600 mb-8">This page provides tools to diagnose various components of the application.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Network className="h-5 w-5 mr-2 text-blue-500" />
              WebSocket Diagnostics
            </CardTitle>
            <CardDescription>Test and monitor WebSocket connections</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Monitor WebSocket connection status, performance metrics, and diagnose connection issues.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/diagnostics/websocket">View WebSocket Diagnostics</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BrainCircuit className="h-5 w-5 mr-2 text-purple-500" />
              LLM Integration Diagnostics
            </CardTitle>
            <CardDescription>Test the Together AI integration</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Test the DeepSeek-V3 model integration for trading signal analysis with sample and live data.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/diagnostics/llm">View LLM Diagnostics</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Cpu className="h-5 w-5 mr-2 text-green-500" />
              Environment Diagnostics
            </CardTitle>
            <CardDescription>Check environment configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              View and validate environment variables and configuration settings.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/diagnostics/environment">View Environment Diagnostics</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">WebSocket Connection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span>Connected</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Together AI Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  {process.env.TOGETHER_API_KEY ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <span>Configured</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                      <span>Not Configured</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  )
}
