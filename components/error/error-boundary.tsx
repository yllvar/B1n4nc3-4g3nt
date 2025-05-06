"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { errorHandler } from "@/lib/error-handling"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetKeys?: any[]
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error details
    this.setState({
      errorInfo,
    })

    // Log error to error handling service
    errorHandler.handleError(error, {
      context: { componentStack: errorInfo.componentStack },
      severity: "high",
      code: "REACT_ERROR",
      showToast: true,
    })

    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state if resetKeys change
    if (
      this.state.hasError &&
      this.props.resetKeys &&
      prevProps.resetKeys &&
      this.props.resetKeys.some((key, index) => key !== prevProps.resetKeys?.[index])
    ) {
      this.resetErrorBoundary()
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Render custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="p-4 rounded-md bg-red-50 border border-red-200">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
            <h3 className="text-lg font-medium text-red-800">Something went wrong</h3>
          </div>
          <div className="mt-2 text-sm text-red-700">
            <p>{this.state.error?.message || "An unexpected error occurred"}</p>
            {process.env.NODE_ENV !== "production" && this.state.errorInfo && (
              <details className="mt-2">
                <summary className="cursor-pointer font-medium">Stack trace</summary>
                <pre className="mt-2 p-2 bg-red-100 overflow-auto text-xs">{this.state.error?.stack}</pre>
                <pre className="mt-2 p-2 bg-red-100 overflow-auto text-xs">{this.state.errorInfo.componentStack}</pre>
              </details>
            )}
          </div>
          <div className="mt-4">
            <Button variant="outline" onClick={this.resetErrorBoundary} className="bg-white hover:bg-red-50">
              Try again
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
