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
    const result = json?.result?.toLowerCase?.() || ""
    const quality = json?.quality?.toLowerCase?.() || ""

    const isValid = (
      ["ok", "valid"].includes(result) &&
      ["good", "medium"].includes(quality)
    )

    return NextResponse.json({
      status: isValid ? "valid" : "invalid",
      is_email_valid: isValid,
      result,
      quality,
      resultcode: json.resultcode || 0,
      free: json.free || false,
      role: json.role || false,
      email: json.email || email,
    })
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
