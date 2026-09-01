"use client"

import { useState, useCallback, useEffect } from "react"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { AutomationList } from "@/components/dashboard/AutomationList"
import { CreateRuleForm } from "@/components/dashboard/CreateRuleForm"
import { PageHeader, PageSection, PageShell } from "@/components/layout/page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Brain, Loader2, Plus } from "lucide-react"
import type { Automation } from "@/lib/types"

export default function AutomationsPage() {
  const { userId, isLoading: isSessionLoading } = useInstagramSession()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"comment" | "dm" | "story">("comment")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editRule, setEditRule] = useState<Automation | null>(null)
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiLoading, setAiLoading] = useState(true)
  const [aiToggling, setAiToggling] = useState(false)
  const [showAiContext, setShowAiContext] = useState(false)
  const [aiContext, setAiContext] = useState("")
  const [aiContextSaving, setAiContextSaving] = useState(false)
  const [aiContextSaved, setAiContextSaved] = useState(false)
  const [groqApiKey, setGroqApiKey] = useState("")
  const [hasApiKey, setHasApiKey] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [aiBaseUrl, setAiBaseUrl] = useState("")
  const [aiModel, setAiModel] = useState("")

  useEffect(() => {
    if (!userId) return
    fetch(`/api/groq/auto-reply?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setAiEnabled(data.enabled ?? false)
        setAiContext(data.ai_context ?? "")
        setHasApiKey(data.has_api_key ?? false)
        setAiBaseUrl(data.ai_base_url ?? "")
        setAiModel(data.ai_model ?? "")
      })
      .catch(() => {})
      .finally(() => setAiLoading(false))
  }, [userId])

  const handleSaveAiContext = async () => {
    if (aiContextSaving || !userId) return
    setAiContextSaving(true)
    try {
      await fetch("/api/groq/auto-reply", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          enabled: aiEnabled,
          ai_context: aiContext,
          ai_base_url: aiBaseUrl,
          ai_model: aiModel,
          ...(groqApiKey !== "" ? { groq_api_key: groqApiKey } : {}),
        }),
      })
      if (groqApiKey) {
        setHasApiKey(true)
        setGroqApiKey("")
        setShowApiKey(false)
      }
      setAiContextSaved(true)
      setTimeout(() => setAiContextSaved(false), 2000)
    } catch {
      /* noop */
    }
    setAiContextSaving(false)
  }

  const handleToggleAI = async (checked: boolean) => {
    if (aiToggling || !userId) return
    setAiToggling(true)
    try {
      const res = await fetch("/api/groq/auto-reply", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, enabled: checked }),
      })
      if (res.ok) setAiEnabled(checked)
    } catch {
      /* noop */
    }
    setAiToggling(false)
  }

  const fetchAutomations = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/automations?userId=${userId}`)
      const data = await res.json()
      if (res.ok) setAutomations(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (userId) fetchAutomations()
  }, [userId, fetchAutomations])

  const handleDeleteRule = async (id: string) => {
    await fetch(`/api/automations?id=${id}`, { method: "DELETE" })
    fetchAutomations()
  }

  const handleEditRule = (rule: Automation) => {
    setEditRule(rule)
    setShowCreateForm(true)
  }

  if (isSessionLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!userId) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">Please log in to manage automations.</p>
      </PageShell>
    )
  }

  const filteredAutomations = automations.filter((a) => a.trigger_source === activeTab)

  return (
    <PageShell>
      <PageHeader
        title="Automations"
        description="Create and manage keyword-triggered replies."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="AI settings"
              aria-pressed={showAiContext}
              onClick={() => setShowAiContext(!showAiContext)}
            >
              <Brain className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (showCreateForm) setEditRule(null)
                setShowCreateForm(!showCreateForm)
              }}
            >
              <Plus className="h-4 w-4" />
              {showCreateForm ? "Close" : "New rule"}
            </Button>
          </>
        }
      />

      <PageSection>
        {showAiContext && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-medium text-foreground">AI auto-reply</h2>
                <p className="text-sm text-muted-foreground">Fallback replies when no rule matches.</p>
              </div>
              {aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Switch checked={aiEnabled} disabled={aiToggling} onCheckedChange={handleToggleAI} />
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ai-api-key">API key</Label>
                {showApiKey || !hasApiKey ? (
                  <Input
                    id="ai-api-key"
                    type="password"
                    value={groqApiKey}
                    onChange={(e) => setGroqApiKey(e.target.value)}
                    placeholder={hasApiKey ? "Enter new key to replace" : "sk_… or gsk_…"}
                  />
                ) : (
                  <Button type="button" variant="outline" className="w-full justify-start" onClick={() => setShowApiKey(true)}>
                    Saved key — click to replace
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-base-url">API base URL</Label>
                <Input
                  id="ai-base-url"
                  value={aiBaseUrl}
                  onChange={(e) => setAiBaseUrl(e.target.value)}
                  placeholder="Optional OpenAI-compatible endpoint"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-model">Model</Label>
                <Input
                  id="ai-model"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="Optional model name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-context">Personality context</Label>
              <Textarea
                id="ai-context"
                value={aiContext}
                onChange={(e) => setAiContext(e.target.value)}
                rows={4}
                placeholder="Describe your account, tone, and what the AI should say or avoid."
              />
            </div>

            <Button type="button" onClick={handleSaveAiContext} disabled={aiContextSaving}>
              {aiContextSaving ? "Saving…" : aiContextSaved ? "Saved" : "Save settings"}
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <TabsList>
            <TabsTrigger value="comment">Comments</TabsTrigger>
            <TabsTrigger value="dm">DMs</TabsTrigger>
            <TabsTrigger value="story">Stories</TabsTrigger>
          </TabsList>
          <TabsContent value={activeTab} className="mt-6 space-y-6">
            {showCreateForm && (
              <div className="rounded-xl border border-border bg-card p-5 md:p-6">
                <CreateRuleForm
                  userId={userId}
                  triggerSource={editRule ? editRule.trigger_source : activeTab}
                  editRule={editRule}
                  onSuccess={() => {
                    fetchAutomations()
                    setShowCreateForm(false)
                    setEditRule(null)
                  }}
                />
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <AutomationList
                automations={filteredAutomations}
                onDelete={handleDeleteRule}
                onEdit={handleEditRule}
                onChanged={fetchAutomations}
                userId={userId}
              />
            )}
          </TabsContent>
        </Tabs>
      </PageSection>
    </PageShell>
  )
}
