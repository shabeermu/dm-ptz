import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, authorizeUserId } from "@/lib/auth"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.ok) return auth.response

    const { user_id, recipient_id, message } = await request.json()

    const forbidden = authorizeUserId(auth.session, user_id?.toString())
    if (forbidden) return forbidden

    if (!recipient_id || !message) {
      return NextResponse.json(
        { error: "Missing required fields: user_id, recipient_id, message" },
        { status: 400 },
      )
    }

    const supabase = await getSupabaseServerClient()
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("access_token, username")
      .eq("id", auth.session.userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sendUrl = `https://graph.instagram.com/v24.0/me/messages?access_token=${encodeURIComponent(user.access_token)}`
    const response = await fetch(sendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipient_id.toString() },
        message: { text: message },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("[instagram] Send message error:", data)
      return NextResponse.json({ error: data.error?.message || "Failed to send message" }, { status: 400 })
    }

    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", auth.session.userId)
      .eq("recipient_id", recipient_id)
      .single()

    if (conversation) {
      await supabase.from("messages").insert({
        id: data.message_id,
        conversation_id: conversation.id,
        user_id: auth.session.userId,
        sender_id: auth.session.userId,
        sender_username: user.username,
        content: message,
        is_from_instagram: false,
      })
    }

    return NextResponse.json({
      success: true,
      message_id: data.message_id,
    })
  } catch (error) {
    console.error("[instagram] Send message internal error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
