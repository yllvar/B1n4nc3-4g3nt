import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Inter } from "next/font/google"
import "./globals.css"
import { validateAppEnvironment } from "@/lib/validate-env"
import { ErrorDisplay } from "@/components/error/error-display"
import { NetworkStatus } from "@/components/network/network-status"
import { ErrorLoggerInit } from "@/components/error/error-logger-init"
import { Toaster } from "@/components/ui/toaster"
import { ConnectionStatusIndicator } from "@/components/websocket/connection-status-indicator"

// This will run on the server during SSR
if (typeof window === "undefined") {
  validateAppEnvironment()
}

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ErrorLoggerInit />
          <div className="flex min-h-screen flex-col">
            <header className="border-b">
              <div className="container flex h-14 items-center px-4">
                <div className="flex flex-1 items-center justify-between">
                  <div>
                    {/* Your logo or site name */}
                    <h1 className="text-lg font-semibold">Binance Tracker</h1>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Add the connection status indicator here */}
                    <ConnectionStatusIndicator />
                    {/* Other header elements */}
                  </div>
                </div>
              </div>
            </header>
            <main className="flex-1">{children}</main>
            <ErrorDisplay />
            <NetworkStatus />
            <Toaster />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

export const metadata = {
      generator: 'v0.dev'
    };
