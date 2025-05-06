import { WebSocketConfig } from "@/components/debug/websocket-config"
import { WebSocketDiagnostics } from "@/components/debug/websocket-diagnostics"

export default function WebSocketDebugPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold">WebSocket Debugging</h1>

      <WebSocketConfig />

      <WebSocketDiagnostics />
    </div>
  )
}
