import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  const body = await req.json()

  // Avoid recursive nesting
  const { key, value, ...rest } = body

  const { error } = await supabase
    .from("settings")
    .upsert(
      { key: "scraperSettings", value: rest },
      { onConflict: "key" }
    )

  if (error) {
    console.error("Supabase save error:", error)
    return NextResponse.json({ success: false, error }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
