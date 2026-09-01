"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Loader2, UserCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Conversation } from "@/types/db"

interface ConversationListProps {
  userId: string
  selectedId: string | null
  onSelect: (id: string, username: string, recipientId: string) => void
}

export function ConversationList({ userId, selectedId, onSelect }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!userId) return

    const fetchConversations = async () => {
      try {
        const res = await fetch(`/api/inbox/conversations?userId=${userId}`)
        const data = await res.json()
        if (Array.isArray(data)) {
          setConversations(data)
        }
      } catch (error) {
        console.error("Failed to load conversations", error)
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()
  }, [userId])

  const filteredConversations = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return conversations
    return conversations.filter((conv) => conv.recipient_username.toLowerCase().includes(normalized))
  }, [conversations, query])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col border-r border-border bg-card md:w-[350px]">
      <div className="border-b border-border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Search conversations"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {filteredConversations.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No conversations found.</div>
        ) : (
          filteredConversations.map((conv) => (
            <button
              key={conv.id}
              type="button"
              onClick={() => onSelect(conv.id, conv.recipient_username, conv.recipient_id.toString())}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors",
                selectedId === conv.id ? "bg-muted" : "hover:bg-accent",
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <UserCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{conv.recipient_username}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(conv.last_message_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">Open conversation</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
