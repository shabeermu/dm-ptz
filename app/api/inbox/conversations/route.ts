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
    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", auth.session.userId)
      .order("last_message_at", { ascending: false })

    if (error) throw error
    return NextResponse.json(conversations)
  } catch (error) {
    console.error("[inbox] Conversations GET error:", error)
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 })
  }
}
