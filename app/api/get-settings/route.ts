import { supabase } from "@/lib/supabase"

export async function GET() {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "scraperSettings")
    .maybeSingle()

  if (error) {
    console.error("Error fetching settings:", error)
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  let value = data?.value || {}

  // Try to unwrap recursively
  while (value?.value) {
    value = value.value
  }

  return new Response(JSON.stringify(value), { status: 200 })
}
