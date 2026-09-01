import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.ok) return auth.response

  return NextResponse.json({
    userId: auth.session.userId,
    username: auth.session.username,
    profilePic: auth.session.profilePic ?? null,
  })
}
