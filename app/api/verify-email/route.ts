import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { email, emails, apiKey } = await req.json()

    if (!apiKey || (!email && (!emails || !Array.isArray(emails)))) {
      return NextResponse.json({ error: "Missing email(s) or API key" }, { status: 400 })
    }

    // ✅ Single email mode (fallback)
    if (email) {
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
    }

    // ✅ Batch mode (verify multiple emails)
    const results: { email: string; is_email_valid: boolean }[] = []

    for (const e of emails) {
      try {
        const url = `https://api.millionverifier.com/api/v3/?api=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(e)}&timeout=10`
        const res = await fetch(url)
        const result = await res.json()

        const isValid =
          ["ok", "valid", "catch_all"].includes(result.result?.toLowerCase?.()) &&
          result.quality?.toLowerCase?.() !== "risky"

        results.push({ email: e, is_email_valid: isValid })
      } catch (err) {
        results.push({ email: e, is_email_valid: false })
      }
    }

    return NextResponse.json(results)
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
