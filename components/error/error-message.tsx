"use client"
import { AlertTriangle, AlertCircle, XCircle, Info } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const errorMessageVariants = cva("flex w-full items-start gap-2 rounded-md p-3 text-sm", {
  variants: {
    variant: {
      default: "bg-muted/50 text-foreground",
      destructive: "bg-destructive/10 text-destructive border border-destructive/20",
      warning: "bg-warning/10 text-warning border border-warning/20",
      info: "bg-info/10 text-info border border-info/20",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

type ErrorSeverity = "critical" | "high" | "medium" | "low"

interface ErrorMessageProps extends VariantProps<typeof errorMessageVariants> {
  title?: string
  message: string
  severity?: ErrorSeverity
  className?: string
  retryLabel?: string
  onRetry?: () => void
  onDismiss?: () => void
}

export function ErrorMessage({
  title,
  message,
  severity = "medium",
  variant,
  className,
  retryLabel = "Retry",
  onRetry,
  onDismiss,
}: ErrorMessageProps) {
  // Map severity to variant if variant not provided
  if (!variant) {
    switch (severity) {
      case "critical":
      case "high":
        variant = "destructive"
        break
      case "medium":
        variant = "warning"
        break
      case "low":
        variant = "info"
        break
    }
  }

  // Map severity to icon
  const Icon = (() => {
    switch (severity) {
      case "critical":
      case "high":
        return XCircle
      case "medium":
        return AlertTriangle
      case "low":
        return Info
      default:
        return AlertCircle
    }
  })()

  return (
    <div className={cn(errorMessageVariants({ variant }), className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1 space-y-1">
        {title && <p className="font-medium leading-none">{title}</p>}
        <p className="text-sm leading-tight">{message}</p>
        {(onRetry || onDismiss) && (
          <div className="mt-2 flex gap-2">
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                {retryLabel}
              </Button>
            )}
            {onDismiss && (
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                Dismiss
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
