import { NextResponse } from "next/server"
import { generateOAuthState, getOAuthStateCookieOptions, OAUTH_STATE_COOKIE_NAME } from "@/lib/session"

export async function GET() {
  const state = generateOAuthState()
  const response = NextResponse.json({ state })
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, state, getOAuthStateCookieOptions())
  return response
}
