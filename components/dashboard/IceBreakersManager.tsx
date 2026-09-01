"use client"

import { useState, useEffect } from "react"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { PageHeader, PageShell } from "@/components/layout/page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Plus, Trash2, Save, RefreshCw } from "lucide-react"
import { toast } from "sonner"

type IceBreakerRow = { id?: string; question: string; response: string }

export function IceBreakersManager() {
  const { userId, isLoading } = useInstagramSession()
  const [breakers, setBreakers] = useState<IceBreakerRow[]>([])
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!userId) return
    fetch(`/api/ice-breakers?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setBreakers(data)
        setFetching(false)
      })
      .catch((err) => {
        console.error(err)
        setFetching(false)
      })
  }, [userId])

  const handleAdd = () => {
    if (breakers.length >= 4) {
      toast.error("Maximum 4 ice breakers allowed by Instagram")
      return
    }
    setBreakers([...breakers, { question: "", response: "" }])
  }

  const handleChange = (index: number, field: "question" | "response", value: string) => {
    const newBreakers = [...breakers]
    newBreakers[index] = { ...newBreakers[index], [field]: value }
    setBreakers(newBreakers)
  }

  const handleRemove = (index: number) => {
    setBreakers(breakers.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!userId) return
    if (breakers.some((b) => !b.question?.trim() || !b.response?.trim())) {
      toast.error("Please fill in all fields")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/ice-breakers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, iceBreakers: breakers }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Ice breakers saved")
      } else {
        toast.error("Failed to save")
      }
    } catch {
      toast.error("Error saving")
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || (fetching && !breakers.length)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!userId) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">Connect your Instagram account to manage ice breakers.</p>
      </PageShell>
    )
  }

  return (
    <PageShell className="max-w-2xl">
      <PageHeader
        title="Ice breakers"
        description="Questions people see when they start a chat with you."
        actions={
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save and sync
          </Button>
        }
      />

      <div className="space-y-4">
        {breakers.map((item, idx) => (
          <div key={idx} className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor={`question-${idx}`}>Question</Label>
                  <Input
                    id={`question-${idx}`}
                    value={item.question}
                    onChange={(e) => handleChange(idx, "question", e.target.value)}
                    placeholder="What are your prices?"
                    maxLength={80}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`response-${idx}`}>Auto-response</Label>
                  <Textarea
                    id={`response-${idx}`}
                    value={item.response}
                    onChange={(e) => handleChange(idx, "response", e.target.value)}
                    placeholder="The reply users will receive"
                    rows={2}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(idx)}
                aria-label="Remove ice breaker"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {breakers.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/40 py-10 text-center text-sm text-muted-foreground">
            No ice breakers yet.
          </div>
        )}

        {breakers.length < 4 && (
          <Button type="button" variant="outline" onClick={handleAdd} className="w-full border-dashed">
            <Plus className="mr-2 h-4 w-4" />
            Add question
          </Button>
        )}
      </div>

      <div className="mt-6 flex gap-3 rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">
        <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Changes sync to your Instagram profile and may take a few minutes to appear.</p>
      </div>
    </PageShell>
  )
}
