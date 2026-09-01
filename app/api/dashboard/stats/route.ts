import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, authorizeUserId } from "@/lib/auth"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.ok) return auth.response

    const userId = request.nextUrl.searchParams.get("userId")
    const forbidden = authorizeUserId(auth.session, userId)
    if (forbidden) return forbidden

    const supabase = await getSupabaseServerClient()

    const { count: automationsCount } = await supabase
      .from("automations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", auth.session.userId)

    const { count: activeTriggersCount } = await supabase
      .from("automations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", auth.session.userId)
      .eq("is_active", true)

    const { count: audienceCount } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", auth.session.userId)

    const { count: messagesSentCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", auth.session.userId)
      .eq("is_from_instagram", false)

    const { data: recentMessages } = await supabase
      .from("messages")
      .select("id, content, created_at, sender_username, conversation_id, recipient:conversations(recipient_username)")
      .eq("user_id", auth.session.userId)
      .eq("is_from_instagram", false)
      .order("created_at", { ascending: false })
      .limit(5)

    return NextResponse.json({
      metrics: {
        totalAutomations: automationsCount || 0,
        activeTriggers: activeTriggersCount || 0,
        audienceReached: audienceCount || 0,
        messagesSent: messagesSentCount || 0,
      },
      recentActivity: recentMessages || [],
    })
  } catch (error) {
    console.error("[dashboard] Stats error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
