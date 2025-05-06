import type { ReactNode } from "react"
import { ResponsiveContainer } from "@/components/layout/responsive-container"

interface PageLayoutProps {
  children: ReactNode
  title?: string
  description?: string
}

export function PageLayout({ children, title, description }: PageLayoutProps) {
  return (
    <main className="min-h-screen bg-background">
      <ResponsiveContainer>
        {(title || description) && (
          <div className="py-6">
            {title && <h1 className="text-3xl font-bold tracking-tight">{title}</h1>}
            {description && <p className="text-muted-foreground">{description}</p>}
          </div>
        )}
        {children}
      </ResponsiveContainer>
    </main>
  )
}
