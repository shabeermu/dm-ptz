import type React from "react"
import { cn } from "@/lib/utils"

interface PageShellProps {
  children: React.ReactNode
  className?: string
  fullBleed?: boolean
}

export function PageShell({ children, className, fullBleed = false }: PageShellProps) {
  return (
    <div
      className={cn(
        fullBleed ? "w-full" : "mx-auto w-full max-w-5xl px-6 py-6",
        className,
      )}
    >
      {children}
    </div>
  )
}

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function PageSection({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("space-y-6", className)}>{children}</section>
}
