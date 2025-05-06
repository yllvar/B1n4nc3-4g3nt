import { WebSocketTestSuite } from "@/components/testing/websocket-test-suite"

export default function TestingPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">WebSocket Testing Suite</h1>
      <WebSocketTestSuite />
    </div>
  )
}
