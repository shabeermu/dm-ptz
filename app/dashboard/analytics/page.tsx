"use client"

import { Activity } from "lucide-react"
import { PageShell } from "@/components/layout/page-shell"
import { EmptyState } from "@/components/ui/empty-state"

export default function AnalyticsPage() {
  return (
    <PageShell>
      <EmptyState
        icon={<Activity className="h-5 w-5" />}
        title="Analytics"
        description="Detailed engagement and automation performance metrics will appear here."
      />
    </PageShell>
  )
}
