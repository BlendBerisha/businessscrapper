import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { email, apiKey } = await req.json()

    if (!email || !apiKey) {
      return NextResponse.json({ error: "Missing email or API key" }, { status: 400 })
    }

    const url = `https://api.millionverifier.com/api/v3/?api=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(email)}`
    console.log(`🔍 Verifying ${email} using API key: ${apiKey.slice(0, 6)}...`)

    const res = await fetch(url)

    if (!res.ok) {
      const errorText = await res.text()
      console.error("❌ API fetch failed:", errorText)
      return NextResponse.json({ error: `Verification failed: ${errorText}` }, { status: 500 })
    }

    const json = await res.json()
    console.log(`📨 Response for ${email}:`, JSON.stringify(json, null, 2))

    const rawResult = json?.result?.toLowerCase?.() || ""
    const status = ["valid", "catch_all", "ok"].includes(rawResult) ? "valid" : "invalid"
    
    return NextResponse.json({
      status,
      result: rawResult,
      quality: json.quality || "",
      resultcode: json.resultcode || 0,
      free: json.free || false,
      role: json.role || false,
      email: json.email || email,
    })
      } catch (err) {
    console.error("❌ Error verifying email:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
