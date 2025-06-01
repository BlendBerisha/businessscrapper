import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { email, apiKey } = await req.json()

    if (!email || !apiKey) {
      return NextResponse.json({ error: "Missing email or API key" }, { status: 400 })
    }

    const url = `https://api.millionverifier.com/api/v3/?api=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(email)}&timeout=10`
    const res = await fetch(url)

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: text }, { status: res.status })
    }

    const result = await res.json()

    return NextResponse.json({
      email: result.email,
      result: result.result,
      quality: result.quality,
      resultcode: result.resultcode,
      subresult: result.subresult,
      free: result.free,
      role: result.role,
      error: result.error,
    })
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
