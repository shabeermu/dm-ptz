import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import {
  clearOAuthStateCookie,
  setSessionCookie,
  validateOAuthState,
} from "@/lib/session"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const state = searchParams.get("state")

  if (error) {
    const redirectUrl = new URL("/", request.url)
    redirectUrl.searchParams.set("error", error)
    return NextResponse.redirect(redirectUrl)
  }

  if (code) {
    const redirectUrl = new URL("/", request.url)
    redirectUrl.searchParams.set("code", code)
    if (state) redirectUrl.searchParams.set("state", state)
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.json({ error: "Invalid callback" }, { status: 400 })
}

interface UserUpdates {
  username: string
  access_token: string
  token_expires_at: string
  updated_at: string
  business_account_id: string
  page_id: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, state } = body as { code?: string; state?: string }

    if (!code) return NextResponse.json({ error: "No code" }, { status: 400 })
    if (!validateOAuthState(request, state)) {
      return NextResponse.json({ error: "Invalid OAuth state" }, { status: 403 })
    }

    const clientId = process.env.INSTAGRAM_APP_ID
    const clientSecret = process.env.INSTAGRAM_APP_SECRET
    const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("Missing Env Vars: Check INSTAGRAM_APP_ID")
    }

    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    })

    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) {
      if (tokenData.error_message?.includes("authorization code has been used")) {
        return NextResponse.json({ error: "Code already used" }, { status: 400 })
      }
      console.error("[callback] Token error:", JSON.stringify(tokenData, null, 2))
      return NextResponse.json({ error: tokenData.error_description || "Token failed" }, { status: 400 })
    }

    const shortToken = tokenData.access_token as string
    const loginUserId = tokenData.user_id.toString()

    const longLivedUrl = new URL("https://graph.instagram.com/access_token")
    longLivedUrl.searchParams.set("grant_type", "ig_exchange_token")
    longLivedUrl.searchParams.set("client_secret", clientSecret)
    longLivedUrl.searchParams.set("access_token", shortToken)

    const longRes = await fetch(longLivedUrl.toString())
    const longData = await longRes.json()
    const accessToken = (longData.access_token as string) || shortToken
    const expiresIn = (longData.expires_in as number) || 5184000

    let username = `user_${loginUserId}`
    let businessAccountId = loginUserId
    let profilePic: string | null = null

    try {
      const meUrl = new URL("https://graph.instagram.com/v24.0/me")
      meUrl.searchParams.set("fields", "user_id,username,profile_picture_url")
      meUrl.searchParams.set("access_token", accessToken)

      const meRes = await fetch(meUrl.toString())
      const meData = await meRes.json()

      if (meData.username) username = meData.username
      if (meData.profile_picture_url) profilePic = meData.profile_picture_url
      if (meData.user_id) {
        businessAccountId = meData.user_id.toString()
      }
    } catch (error) {
      console.error("[callback] /me request failed:", error)
    }

    const supabase = await getSupabaseServerClient()
    const updates: UserUpdates = {
      username,
      access_token: accessToken,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      business_account_id: businessAccountId,
      page_id: businessAccountId,
    }

    const { error: upsertError } = await supabase
      .from("users")
      .upsert({ id: loginUserId, ...updates }, { onConflict: "id" })

    if (upsertError) throw upsertError

    const response = NextResponse.json({
      success: true,
      username,
      userId: loginUserId,
      profilePic,
    })

    await setSessionCookie(
      response,
      { userId: loginUserId, username, profilePic },
      expiresIn,
    )
    clearOAuthStateCookie(response)

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
