"use client"

import { ErrorBoundary } from "react-error-boundary"

export function ErrorBoundaryWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallbackRender={({ error }) => (
        <div className="container py-8">
          <h2 className="text-xl font-bold">Something went wrong</h2>
          <pre className="mt-4 p-4 bg-red-50 text-red-700 rounded">
            {error.message}
          </pre>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
