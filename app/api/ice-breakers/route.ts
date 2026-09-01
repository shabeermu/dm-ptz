import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, authorizeUserId } from "@/lib/auth"
import { getSupabaseServerClient } from "@/lib/supabase-server"

interface IceBreakerInput {
  question: string
  response: string
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.ok) return auth.response

    const userId = request.nextUrl.searchParams.get("userId")
    const forbidden = authorizeUserId(auth.session, userId)
    if (forbidden) return forbidden

    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase
      .from("ice_breakers")
      .select("*")
      .eq("user_id", auth.session.userId)
      .order("created_at", { ascending: true })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error("[ice-breakers] GET error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.ok) return auth.response

    const body = await request.json()
    const { userId, iceBreakers } = body as { userId?: string; iceBreakers?: IceBreakerInput[] }

    const forbidden = authorizeUserId(auth.session, userId)
    if (forbidden) return forbidden

    if (!Array.isArray(iceBreakers)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()
    const { error: deleteError } = await supabase
      .from("ice_breakers")
      .delete()
      .eq("user_id", auth.session.userId)

    if (deleteError) throw deleteError

    const { data: inserted, error: insertError } = await supabase
      .from("ice_breakers")
      .insert(
        iceBreakers.map((ib) => ({
          user_id: auth.session.userId,
          question: ib.question,
          response: ib.response,
          is_active: true,
        })),
      )
      .select()

    if (insertError) throw insertError

    const { data: user } = await supabase
      .from("users")
      .select("access_token, page_id")
      .eq("id", auth.session.userId)
      .single()

    if (user?.access_token && user.page_id && inserted) {
      const ice_breakers = inserted.map((ib) => ({
        question: ib.question,
        payload: `ICE_BREAKER_${ib.id}`,
      }))

      const response = await fetch(
        `https://graph.instagram.com/v21.0/me/messenger_profile?access_token=${encodeURIComponent(user.access_token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ice_breakers,
            platform: "instagram",
          }),
        },
      )
      const igResult = await response.json()
      if (igResult.error) {
        console.error("[ice-breakers] IG sync error:", igResult.error)
        return NextResponse.json(
          {
            success: true,
            warning: "Saved to DB but IG Sync failed",
            error: igResult.error,
          },
          { status: 200 },
        )
      }
    }

    return NextResponse.json({ success: true, data: inserted })
  } catch (error) {
    console.error("[ice-breakers] POST error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
