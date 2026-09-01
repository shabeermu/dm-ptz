"use client"

import type React from "react"
import { cn } from "@/lib/utils"
import {
  Zap,
  LayoutDashboard,
  LogOut,
  Settings,
  BarChart3,
  MessageSquare,
  Snowflake,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/automations", icon: Zap, label: "Automations" },
  { href: "/dashboard/inbox", icon: MessageSquare, label: "Inbox" },
  { href: "/dashboard/ice-breakers", icon: Snowflake, label: "Ice breakers" },
  { href: "/dashboard/analytics", icon: BarChart3, label: "Analytics" },
]

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  username?: string
  profilePic?: string | null
  className?: string
  onLogout?: () => void
  onNavigate?: () => void
}

export function Sidebar({
  className,
  username = "creator",
  profilePic,
  onLogout,
  onNavigate,
  ...props
}: SidebarProps) {
  const pathname = usePathname()

  const navLinkClass = (active: boolean) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
      active
        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
    )

  return (
    <aside className={cn("flex flex-col bg-sidebar text-sidebar-foreground", className)} {...props}>
      <div className="flex items-center gap-2.5 px-5 pb-4 pt-6">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Zap className="h-4 w-4" strokeWidth={2.5} />
        </div>
        <span className="flex-1 text-sm font-semibold tracking-tight">DM-PTZ</span>
        <ThemeToggle />
      </div>

      <div className="mx-5 h-px bg-sidebar-border" />

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={navLinkClass(active)}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
              <span>{label}</span>
            </Link>
          )
        })}

        <div className="px-3 py-4">
          <div className="h-px bg-sidebar-border" />
        </div>

        <Link
          href="/dashboard/settings"
          onClick={onNavigate}
          aria-current={pathname === "/dashboard/settings" ? "page" : undefined}
          className={navLinkClass(pathname === "/dashboard/settings")}
        >
          <Settings className="h-4 w-4 shrink-0" strokeWidth={1.8} />
          <span>Settings</span>
        </Link>
      </nav>

      <div className="px-3 pb-4">
        <div className="flex items-center gap-3 rounded-lg border border-sidebar-border px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
            {profilePic ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profilePic} alt={username} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-medium text-muted-foreground">
                {username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">@{username}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onLogout}
            title="Log out"
            aria-label="Log out"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
