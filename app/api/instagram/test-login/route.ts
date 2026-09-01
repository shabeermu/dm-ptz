import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { setSessionCookie } from "@/lib/session"

const TEST_USER_ID = "9999999999"
const TEST_USERNAME = "test_creator"
const TEST_SESSION_MAX_AGE = 60 * 24 * 60 * 60

export async function POST(_request: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Not available in production" }, { status: 403 })
    }

    const supabase = await getSupabaseServerClient()
    const { error: upsertError } = await supabase.from("users").upsert(
      {
        id: TEST_USER_ID,
        username: TEST_USERNAME,
        access_token: "TEST_TOKEN_NOT_REAL",
        token_expires_at: new Date(Date.now() + TEST_SESSION_MAX_AGE * 1000).toISOString(),
        business_account_id: TEST_USER_ID,
        page_id: TEST_USER_ID,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )

    if (upsertError) {
      console.error("[test-login] Supabase upsert error:", upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    const response = NextResponse.json({
      success: true,
      username: TEST_USERNAME,
      userId: TEST_USER_ID,
    })

    await setSessionCookie(
      response,
      { userId: TEST_USER_ID, username: TEST_USERNAME, profilePic: null },
      TEST_SESSION_MAX_AGE,
    )

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    console.error("[test-login] Error:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
