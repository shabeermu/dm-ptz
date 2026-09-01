import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, authorizeUserId, verifyAutomationOwnership } from "@/lib/auth"
import { getSupabaseServerClient } from "@/lib/supabase-server"

const VALID_TRIGGER_SOURCES = ["comment", "dm", "story"] as const

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.ok) return auth.response

    const userId = request.nextUrl.searchParams.get("userId")
    const forbidden = authorizeUserId(auth.session, userId)
    if (forbidden) return forbidden

    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase
      .from("automations")
      .select("*")
      .eq("user_id", auth.session.userId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error("[automations] GET error:", error)
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.ok) return auth.response

    const { userId, name, trigger_source, trigger_type, trigger_value, content, specific_media_id } =
      await request.json()

    const forbidden = authorizeUserId(auth.session, userId)
    if (forbidden) return forbidden

    if (!name || !trigger_value || !content || !trigger_source) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    if (!VALID_TRIGGER_SOURCES.includes(trigger_source)) {
      return NextResponse.json({ error: "Invalid trigger source" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()
    const finalTriggerValue =
      trigger_type === "postback"
        ? `PAYLOAD_${Date.now()}_${Math.random().toString(36).substring(7)}`
        : trigger_value.toLowerCase()

    const { data, error } = await supabase
      .from("automations")
      .insert({
        user_id: auth.session.userId,
        name,
        trigger_source,
        trigger_type: trigger_type || "keyword",
        trigger_value: finalTriggerValue,
        response_type: "pro",
        response_content: content,
        is_active: true,
        specific_media_id: specific_media_id || null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error("[automations] POST error:", error)
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.ok) return auth.response

    const id = request.nextUrl.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const supabase = await getSupabaseServerClient()
    const ownsAutomation = await verifyAutomationOwnership(supabase, id, auth.session.userId)
    if (!ownsAutomation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { error } = await supabase.from("automations").delete().eq("id", id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[automations] DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.ok) return auth.response

    const { id, name, trigger_source, trigger_type, trigger_value, content, specific_media_id } =
      await request.json()

    if (!id || !name || !trigger_value || !content) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    if (trigger_source && !VALID_TRIGGER_SOURCES.includes(trigger_source)) {
      return NextResponse.json({ error: "Invalid trigger source" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()
    const ownsAutomation = await verifyAutomationOwnership(supabase, id, auth.session.userId)
    if (!ownsAutomation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {
      name,
      trigger_type: trigger_type || "keyword",
      trigger_value: trigger_value.toLowerCase(),
      response_content: content,
      specific_media_id: specific_media_id || null,
    }

    if (trigger_source) {
      updateData.trigger_source = trigger_source
    }

    const { data, error } = await supabase
      .from("automations")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error("[automations] PUT error:", error)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.ok) return auth.response

    const { id, is_active, action } = await request.json()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const supabase = await getSupabaseServerClient()
    const ownsAutomation = await verifyAutomationOwnership(supabase, id, auth.session.userId)
    if (!ownsAutomation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    if (action === "duplicate") {
      const { data: original, error: fetchError } = await supabase
        .from("automations")
        .select("*")
        .eq("id", id)
        .single()
      if (fetchError || !original) return NextResponse.json({ error: "Not found" }, { status: 404 })

      const { id: _id, created_at, updated_at, ...rest } = original
      const { data, error } = await supabase
        .from("automations")
        .insert({ ...rest, name: `${original.name} (copy)`, is_active: false })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json(data)
    }

    if (typeof is_active !== "boolean") {
      return NextResponse.json({ error: "Missing is_active" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("automations")
      .update({ is_active })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error("[automations] PATCH error:", error)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
