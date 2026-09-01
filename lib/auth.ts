import { type NextRequest, NextResponse } from "next/server"
import { type SupabaseClient } from "@supabase/supabase-js"
import { getSessionFromRequest, type SessionPayload } from "@/lib/session"

export type AuthResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse }

export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }
  return { ok: true, session }
}

export function authorizeUserId(
  session: SessionPayload,
  requestedUserId: string | null | undefined,
): NextResponse | null {
  if (!requestedUserId || requestedUserId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return null
}

export async function verifyAutomationOwnership(
  supabase: SupabaseClient,
  automationId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("automations")
    .select("user_id")
    .eq("id", automationId)
    .maybeSingle()

  if (error || !data) return false
  return data.user_id?.toString() === userId
}

export async function verifyConversationOwnership(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("conversations")
    .select("user_id")
    .eq("id", conversationId)
    .maybeSingle()

  if (error || !data) return false
  return data.user_id?.toString() === userId
}
