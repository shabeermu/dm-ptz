"use client"

import { useState } from "react"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { PageShell } from "@/components/layout/page-shell"
import { ConversationList } from "@/components/inbox/ConversationList"
import { ChatWindow } from "@/components/inbox/ChatWindow"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function InboxPage() {
  const { userId, isLoading } = useInstagramSession()
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [selectedRecipientName, setSelectedRecipientName] = useState<string | null>(null)
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null)

  const handleSelect = (id: string, name: string, recipientId: string) => {
    setSelectedConversationId(id)
    setSelectedRecipientName(name)
    setSelectedRecipientId(recipientId)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!userId) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">Please log in to view your inbox.</p>
      </PageShell>
    )
  }

  return (
    <PageShell fullBleed className="px-4 py-4 md:px-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Inbox</h1>
        <p className="text-sm text-muted-foreground">Reply to conversations from one place.</p>
      </div>

      <div className="relative flex h-[calc(100vh-10rem)] overflow-hidden rounded-xl border border-border bg-card">
        <div
          className={cn(
            "absolute inset-y-0 left-0 z-10 w-full md:static md:w-[350px] md:shrink-0 transition-transform duration-300",
            selectedConversationId ? "-translate-x-full md:translate-x-0" : "translate-x-0",
          )}
        >
          <ConversationList
            userId={userId}
            selectedId={selectedConversationId}
            onSelect={handleSelect}
          />
        </div>

        <div
          className={cn(
            "absolute inset-y-0 left-0 z-20 w-full md:static md:flex-1 transition-transform duration-300",
            selectedConversationId ? "translate-x-0" : "translate-x-full md:translate-x-0",
          )}
        >
          <ChatWindow
            conversationId={selectedConversationId}
            recipientName={selectedRecipientName}
            recipientId={selectedRecipientId || undefined}
            userId={userId}
            onBack={() => setSelectedConversationId(null)}
          />
        </div>
      </div>
    </PageShell>
  )
}
