export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "scraperSettings")
      .maybeSingle()

    if (error) {
      console.error("❌ Supabase fetch error:", error)
      return new Response(JSON.stringify({ error }), { status: 500 })
    }

    let value = data?.value || {}

    while (value?.value) {
      value = value.value
    }

    return new Response(JSON.stringify(value), {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (err: any) {
    console.error("❌ GET /api/get-settings failed:", err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
