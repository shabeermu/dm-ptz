"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Copy, Globe, Instagram, MoreHorizontal, Pencil, Trash2, Zap } from "lucide-react"
import type { Automation } from "@/lib/types"
import { toast } from "sonner"

interface AutomationListProps {
  automations: Automation[]
  onDelete: (id: string) => void
  onEdit: (rule: Automation) => void
  onChanged: () => void
  userId: string
}

export function AutomationList({ automations, onDelete, onEdit, onChanged, userId }: AutomationListProps) {
  const [mediaMap, setMediaMap] = useState<Record<string, string>>({})

  const globalRules = automations.filter((rule) => !rule.specific_media_id)
  const postSpecificRules = automations.filter((rule) => rule.specific_media_id)

  useEffect(() => {
    if (!userId || postSpecificRules.length === 0) return
    const fetchMedia = async () => {
      try {
        const res = await fetch(`/api/instagram/media?userId=${userId}`)
        const data = await res.json()
        if (data.data && Array.isArray(data.data)) {
          const map: Record<string, string> = {}
          data.data.forEach((item: { id: string; thumbnail_url?: string; media_url?: string }) => {
            map[item.id] = item.thumbnail_url || item.media_url || ""
          })
          setMediaMap(map)
        }
      } catch (e) {
        console.error("Failed to load thumbnails", e)
      }
    }
    fetchMedia()
  }, [userId, automations.length, postSpecificRules.length])

  const handleToggle = async (rule: Automation, active: boolean) => {
    const res = await fetch("/api/automations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id, is_active: active }),
    })
    if (res.ok) {
      toast.success(active ? "Automation enabled" : "Automation paused")
      onChanged()
    } else {
      toast.error("Failed to update")
    }
  }

  const handleDuplicate = async (rule: Automation) => {
    const res = await fetch("/api/automations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id, action: "duplicate" }),
    })
    if (res.ok) {
      toast.success("Automation duplicated")
      onChanged()
    } else {
      toast.error("Failed to duplicate")
    }
  }

  if (automations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Zap className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="text-base font-medium text-foreground">No automations yet</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Create your first rule using the button above.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {globalRules.length > 0 && (
        <RuleSection title="Global rules" rules={globalRules} mediaMap={mediaMap} onDelete={onDelete} onEdit={onEdit} onToggle={handleToggle} onDuplicate={handleDuplicate} />
      )}
      {postSpecificRules.length > 0 && (
        <RuleSection
          title="Post-specific rules"
          rules={postSpecificRules}
          mediaMap={mediaMap}
          onDelete={onDelete}
          onEdit={onEdit}
          onToggle={handleToggle}
          onDuplicate={handleDuplicate}
          isSpecific
        />
      )}
    </div>
  )
}

function RuleSection({
  title,
  rules,
  mediaMap,
  onDelete,
  onEdit,
  onToggle,
  onDuplicate,
  isSpecific = false,
}: {
  title: string
  rules: Automation[]
  mediaMap: Record<string, string>
  onDelete: (id: string) => void
  onEdit: (rule: Automation) => void
  onToggle: (rule: Automation, active: boolean) => void
  onDuplicate: (rule: Automation) => void
  isSpecific?: boolean
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {rules.map((rule) => (
          <RuleRow
            key={rule.id}
            rule={rule}
            onDelete={onDelete}
            onEdit={onEdit}
            onToggle={onToggle}
            onDuplicate={onDuplicate}
            isSpecific={isSpecific}
            mediaUrl={mediaMap[rule.specific_media_id || ""]}
          />
        ))}
      </div>
    </div>
  )
}

function RuleRow({
  rule,
  onDelete,
  onEdit,
  onToggle,
  onDuplicate,
  isSpecific,
  mediaUrl,
}: {
  rule: Automation
  onDelete: (id: string) => void
  onEdit: (rule: Automation) => void
  onToggle: (rule: Automation, active: boolean) => void
  onDuplicate: (rule: Automation) => void
  isSpecific?: boolean
  mediaUrl?: string
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const keywords = rule.trigger_value.split(",").map((k) => k.trim()).filter(Boolean)
  const content = (rule.response_content || {}) as {
    card?: { title?: string }
    media?: { type?: string }
    message?: string
    reply_mode?: string
    delay_seconds?: number
    check_follow?: boolean
  }

  const responsePreview = content.card?.title
    ? content.card.title
    : content.media?.type
      ? `${content.media.type} attachment`
      : content.message
        ? `${content.message.slice(0, 60)}${content.message.length > 60 ? "…" : ""}`
        : "No preview"

  const metaParts = [
    keywords.length ? keywords.join(", ") : "Any keyword",
    responsePreview,
    content.reply_mode === "dm_only" ? "DM only" : content.reply_mode === "public_only" ? "Public only" : null,
    content.delay_seconds ? `${content.delay_seconds}s delay` : null,
    content.check_follow ? "Follow gate" : null,
    rule.is_active === false ? "Paused" : null,
  ].filter(Boolean)

  return (
    <div className={`flex items-center gap-4 px-4 py-4 ${rule.is_active === false ? "opacity-70" : ""}`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
        {isSpecific && mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl} alt="" className="h-full w-full object-cover" />
        ) : isSpecific ? (
          <Instagram className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Globe className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{rule.name}</p>
        <p className="mt-1 truncate text-sm text-muted-foreground">{metaParts.join(" · ")}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Switch
          checked={rule.is_active !== false}
          onCheckedChange={(value) => onToggle(rule, value)}
          aria-label={rule.is_active === false ? "Enable automation" : "Pause automation"}
        />

        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => {
                onDelete(rule.id)
                setConfirmDelete(false)
              }}
            >
              Delete
            </Button>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label={`Actions for ${rule.name}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(rule)}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(rule)}>
                <Copy className="h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
