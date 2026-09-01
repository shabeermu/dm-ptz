"use client"

import { useEffect, useState, useRef } from "react"
import { Send, Loader2, Zap, ChevronLeft, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Message } from "@/types/db"
import type { Automation } from "@/lib/types"

interface ChatWindowProps {
  conversationId: string | null
  recipientId?: string
  recipientName: string | null
  userId: string
  onBack?: () => void
}

export function ChatWindow({ conversationId, recipientId, recipientName, userId, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [inputText, setInputText] = useState("")
  const [sending, setSending] = useState(false)
  const [isAutomationOpen, setIsAutomationOpen] = useState(false)
  const [automations, setAutomations] = useState<Automation[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!conversationId) return

    const fetchMessages = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/inbox/messages?conversationId=${conversationId}&userId=${userId}`)
        const data = await res.json()
        if (Array.isArray(data)) {
          setMessages(data)
        }
      } catch (error) {
        console.error("Failed to load messages", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [conversationId, userId])

  useEffect(() => {
    if (userId) {
      fetch(`/api/automations?userId=${userId}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setAutomations(data)
        })
    }
  }, [userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (text: string = inputText) => {
    if (!text.trim() || !recipientId || !userId) return

    setSending(true)
    try {
      const res = await fetch("/api/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          recipientId,
          message: text,
        }),
      })

      if (res.ok) {
        setInputText("")
        const newMsg: Message = {
          id: `temp_${Date.now()}`,
          conversation_id: conversationId!,
          user_id: userId,
          sender_id: "me",
          sender_username: "Me",
          content: text,
          is_from_instagram: false,
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, newMsg])
      }
    } catch (e) {
      console.error("Send failed", e)
    } finally {
      setSending(false)
      setIsAutomationOpen(false)
    }
  }

  if (!conversationId) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 bg-card text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Send className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-base font-medium text-foreground">Select a conversation</h3>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
            Choose a thread from the list to view and send messages.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-1 flex-col bg-card">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden -ml-2">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium text-foreground">@{recipientName}</h3>
            <p className="text-xs text-muted-foreground">Instagram</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" aria-label="More options">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = !msg.is_from_instagram
            return (
              <div key={msg.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm md:max-w-[70%]",
                    isMe
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md border border-border bg-muted text-foreground",
                  )}
                >
                  {msg.content}
                  <div className={cn("mt-1 text-[10px] opacity-70", isMe ? "text-right" : "text-muted-foreground")}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {isAutomationOpen && (
        <div className="absolute bottom-20 left-4 right-4 z-50 rounded-xl border border-border bg-popover p-2 shadow-sm md:left-auto md:right-4 md:w-80">
          <div className="mb-1 px-2 py-1.5 text-xs font-medium text-muted-foreground">Quick responses</div>
          <div className="max-h-60 space-y-1 overflow-y-auto">
            {automations.map((auto) => (
              <button
                key={auto.id}
                type="button"
                onClick={() =>
                  handleSendMessage(
                    (auto.response_content as { message?: string })?.message || auto.name,
                  )
                }
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-popover-foreground transition-colors hover:bg-accent"
              >
                <Zap className="h-3 w-3 text-muted-foreground" />
                <span className="truncate">{auto.name}</span>
              </button>
            ))}
            {automations.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">No automations found.</div>
            )}
          </div>
        </div>
      )}

      <div className="shrink-0 border-t border-border p-3 md:p-4">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted p-1.5 focus-within:ring-2 focus-within:ring-ring">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setIsAutomationOpen(!isAutomationOpen)}
            aria-label="Toggle quick responses"
            className={cn("h-9 w-9 shrink-0", isAutomationOpen && "bg-accent")}
          >
            <Zap className="h-4 w-4" />
          </Button>
          <input
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            placeholder="Type a message"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !sending) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            disabled={sending}
          />
          <Button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={sending || !inputText.trim()}
            size="icon"
            aria-label="Send message"
            className="h-9 w-9 shrink-0"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
