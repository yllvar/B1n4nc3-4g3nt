import { EnvironmentStatus } from "@/components/debug/environment-status"

export default function EnvironmentDebugPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Environment Debug</h1>
      <EnvironmentStatus />
    </div>
  )
}
