import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LLMIntegrationTest } from "@/components/diagnostics/llm-integration-test"
import { LLMAdvancedTest } from "@/components/diagnostics/llm-advanced-test"
import { LLMSignalTest } from "@/components/diagnostics/llm-signal-test"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function LLMDiagnosticsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href="/diagnostics">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Diagnostics
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">LLM Integration Diagnostics</h1>
      </div>

      <p className="text-gray-600 mb-8">
        Test and debug the Together AI integration with DeepSeek-V3 for trading signal analysis.
      </p>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Together AI Configuration</CardTitle>
          <CardDescription>Current configuration for the Together AI integration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">API Key Status</h3>
              <p className="text-base font-medium mt-1">
                {process.env.TOGETHER_API_KEY ? (
                  <span className="text-green-600">Configured</span>
                ) : (
                  <span className="text-red-600">Not Configured</span>
                )}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Model</h3>
              <p className="text-base font-medium mt-1">deepseek-ai/DeepSeek-V3</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Temperature</h3>
              <p className="text-base font-medium mt-1">0.2</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Max Tokens</h3>
              <p className="text-base font-medium mt-1">1000</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="basic">Basic Test</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Test</TabsTrigger>
          <TabsTrigger value="live">Live Signal Test</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <LLMIntegrationTest />
        </TabsContent>

        <TabsContent value="advanced">
          <LLMAdvancedTest />
        </TabsContent>

        <TabsContent value="live">
          <LLMSignalTest />
        </TabsContent>
      </Tabs>
    </div>
  )
}
