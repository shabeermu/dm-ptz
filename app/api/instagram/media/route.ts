import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, authorizeUserId } from "@/lib/auth"
import { getSupabaseServerClient } from "@/lib/supabase-server"

interface InstagramMediaItem {
  id: string
  caption?: string
  media_type?: string
  media_url?: string
  thumbnail_url?: string
  permalink?: string
  timestamp?: string
  image_url?: string | null
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.ok) return auth.response

    const userId = request.nextUrl.searchParams.get("userId")
    const forbidden = authorizeUserId(auth.session, userId)
    if (forbidden) return forbidden

    const supabase = await getSupabaseServerClient()
    const { data: user } = await supabase
      .from("users")
      .select("access_token")
      .eq("id", auth.session.userId)
      .single()

    if (!user?.access_token) {
      return NextResponse.json({ error: "Instagram not connected" }, { status: 401 })
    }

    const url = new URL("https://graph.instagram.com/me/media")
    url.searchParams.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp")
    url.searchParams.set("limit", "24")
    url.searchParams.set("access_token", user.access_token)

    const res = await fetch(url.toString(), { cache: "no-store" })
    const data = await res.json()

    if (data.error) {
      console.error("[instagram] Media fetch error:", data.error)
      if (data.error.code === 190) {
        return NextResponse.json({ error: "Session Expired. Please Logout & Login." }, { status: 401 })
      }
      return NextResponse.json({ error: data.error.message }, { status: 500 })
    }

    const normalized = (data.data || [])
      .map((item: InstagramMediaItem) => ({
        ...item,
        image_url: item.thumbnail_url || item.media_url || null,
      }))
      .filter((item: InstagramMediaItem) => typeof item.image_url === "string" && item.image_url.length > 0)

    return NextResponse.json({ data: normalized })
  } catch (error) {
    console.error("[instagram] Media server error:", error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
