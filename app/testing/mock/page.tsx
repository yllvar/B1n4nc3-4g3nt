import { MockWebSocketTester } from "@/components/testing/mock-websocket-tester"

export default function MockTestingPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Mock WebSocket Testing</h1>
      <MockWebSocketTester />
    </div>
  )
}
