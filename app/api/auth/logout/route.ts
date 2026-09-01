import { NextResponse } from "next/server"
import { clearOAuthStateCookie, clearSessionCookie } from "@/lib/session"

export async function POST() {
  const response = NextResponse.json({ success: true })
  clearSessionCookie(response)
  clearOAuthStateCookie(response)
  return response
}
