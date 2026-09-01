"use client"

import { Settings } from "lucide-react"
import { PageShell } from "@/components/layout/page-shell"
import { EmptyState } from "@/components/ui/empty-state"

export default function SettingsPage() {
  return (
    <PageShell>
      <EmptyState
        icon={<Settings className="h-5 w-5" />}
        title="Settings"
        description="Account preferences and connection settings will be available here."
      />
    </PageShell>
  )
}
