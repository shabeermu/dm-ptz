"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { PageHeader, PageSection, PageShell } from "@/components/layout/page-shell"
import { Button } from "@/components/ui/button"
import { Activity, Loader2, MessageCircle, Users, Zap } from "lucide-react"

interface DashboardStats {
  metrics: {
    totalAutomations: number
    activeTriggers: number
    audienceReached: number
    messagesSent: number
  }
  recentActivity: Array<{
    id: string
    content: string
    created_at: string
    recipient?: {
      recipient_username: string
    }
  }>
}

export default function DashboardPage() {
  const { username, userId, isLoading: isSessionLoading } = useInstagramSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/dashboard/stats?userId=${userId}`)
        const data = await res.json()
        if (data && !data.error) {
          setStats(data)
        }
      } catch (err) {
        console.error("Failed to load dashboard stats", err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [userId])

  if (isSessionLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <PageShell>
      <PageHeader
        title={`Welcome back${username ? `, ${username}` : ""}`}
        description="A summary of your automation activity."
      />

      <PageSection>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Automations" value={stats?.metrics.totalAutomations ?? 0} icon={<Zap className="h-4 w-4" />} />
          <StatCard title="Messages sent" value={stats?.metrics.messagesSent ?? 0} icon={<MessageCircle className="h-4 w-4" />} />
          <StatCard title="Active triggers" value={stats?.metrics.activeTriggers ?? 0} icon={<Activity className="h-4 w-4" />} />
          <StatCard title="Audience reached" value={stats?.metrics.audienceReached ?? 0} icon={<Users className="h-4 w-4" />} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-medium text-foreground">Recent activity</h2>
            </div>
            <div className="divide-y divide-border">
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((msg) => (
                  <div key={msg.id} className="flex items-start justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        Reply to @{msg.recipient?.recipient_username || "user"}
                      </p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{msg.content}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">No recent activity.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-medium text-foreground">Quick actions</h2>
            <p className="mt-1 text-sm text-muted-foreground">Jump to common tasks.</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button asChild className="flex-1">
                <Link href="/dashboard/automations">Create automation</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/dashboard/inbox">Open inbox</Link>
              </Button>
            </div>
          </div>
        </div>
      </PageSection>
    </PageShell>
  )
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: number
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        {icon}
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{title}</p>
    </div>
  )
}
