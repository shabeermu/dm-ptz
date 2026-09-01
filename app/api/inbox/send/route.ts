import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, authorizeUserId } from "@/lib/auth"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.ok) return auth.response

    const body = await request.json()
    const { userId, recipientId, message, attachment } = body

    const forbidden = authorizeUserId(auth.session, userId)
    if (forbidden) return forbidden

    if (!recipientId || (!message && !attachment)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("access_token, username, business_account_id")
      .eq("id", auth.session.userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const apiBody: {
      recipient: { id: string }
      message: { text?: string; attachment?: unknown }
    } = {
      recipient: { id: recipientId },
      message: message ? { text: message } : { attachment },
    }

    const res = await fetch(
      `https://graph.instagram.com/v24.0/me/messages?access_token=${encodeURIComponent(user.access_token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiBody),
      },
    )

    const data = await res.json()

    if (data.error) {
      console.error("[inbox] Send Instagram API error:", data.error)
      return NextResponse.json({ error: data.error.message }, { status: 500 })
    }

    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", auth.session.userId)
      .eq("recipient_id", recipientId)
      .single()

    if (conv) {
      await supabase.from("messages").insert({
        id: `mid_out_${Date.now()}_${Math.random()}`,
        conversation_id: conv.id,
        user_id: auth.session.userId,
        sender_id: user.business_account_id,
        sender_username: user.username,
        content: message || "[Attachment]",
        is_from_instagram: false,
      })

      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conv.id)
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[inbox] Send internal error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
