import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, authorizeUserId, verifyConversationOwnership } from "@/lib/auth"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.ok) return auth.response

    const conversationId = request.nextUrl.searchParams.get("conversationId")
    const userId = request.nextUrl.searchParams.get("userId")

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })
    }

    const forbidden = authorizeUserId(auth.session, userId)
    if (forbidden) return forbidden

    const supabase = await getSupabaseServerClient()
    const ownsConversation = await verifyConversationOwnership(supabase, conversationId, auth.session.userId)
    if (!ownsConversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (error) throw error
    return NextResponse.json(messages)
  } catch (error) {
    console.error("[inbox] Messages GET error:", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}
