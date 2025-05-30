import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { email, apiKey } = await req.json()

    if (!email || !apiKey) {
      return NextResponse.json({ error: "Missing email or API key" }, { status: 400 })
    }

    const url = `https://api.millionverifier.com/api/v3/?api=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(email)}`
    const res = await fetch(url)

    if (!res.ok) {
      const errorText = await res.text()
      return NextResponse.json({ error: `Verification failed: ${errorText}` }, { status: 500 })
    }

    const json = await res.json()
    const status =
    ["valid", "catch_all"].includes(json?.result?.toLowerCase?.())
      ? "valid"
      : "invalid"
  
    return NextResponse.json({ status }) // ✅ Unified structure
  } catch (err) {
    console.error("❌ Error verifying email:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
