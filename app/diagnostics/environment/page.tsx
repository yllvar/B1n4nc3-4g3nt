import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, XCircle } from "lucide-react"

export default function EnvironmentDiagnosticsPage() {
  // Environment variables to check
  const envVars = [
    { name: "BINANCE_WS_BASE_URL", isSet: !!process.env.BINANCE_WS_BASE_URL },
    { name: "BINANCE_API_BASE_URL", isSet: !!process.env.BINANCE_API_BASE_URL },
    { name: "BINANCE_API_KEY", isSet: !!process.env.BINANCE_API_KEY },
    { name: "BINANCE_API_SECRET", isSet: !!process.env.BINANCE_API_SECRET },
    { name: "NEXT_PUBLIC_BINANCE_API_BASE_URL", isSet: !!process.env.NEXT_PUBLIC_BINANCE_API_BASE_URL },
    { name: "WS_RECONNECT_INITIAL_DELAY", isSet: !!process.env.WS_RECONNECT_INITIAL_DELAY },
    { name: "WS_RECONNECT_MAX_DELAY", isSet: !!process.env.WS_RECONNECT_MAX_DELAY },
    { name: "WS_RECONNECT_FACTOR", isSet: !!process.env.WS_RECONNECT_FACTOR },
    { name: "WS_RECONNECT_MAX_ATTEMPTS", isSet: !!process.env.WS_RECONNECT_MAX_ATTEMPTS },
    { name: "WS_HEARTBEAT_INTERVAL", isSet: !!process.env.WS_HEARTBEAT_INTERVAL },
    { name: "WS_HEARTBEAT_TIMEOUT", isSet: !!process.env.WS_HEARTBEAT_TIMEOUT },
    { name: "TOGETHER_API_KEY", isSet: !!process.env.TOGETHER_API_KEY },
  ]

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href="/diagnostics">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Diagnostics
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Environment Diagnostics</h1>
      </div>

      <p className="text-gray-600 mb-8">
        This page shows the status of environment variables and configuration settings.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>Status of required environment variables</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variable Name</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {envVars.map((envVar) => (
                <TableRow key={envVar.name}>
                  <TableCell className="font-mono">{envVar.name}</TableCell>
                  <TableCell>
                    {envVar.isSet ? (
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span>Configured</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <XCircle className="h-4 w-4 text-red-500 mr-2" />
                        <span>Not Configured</span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
