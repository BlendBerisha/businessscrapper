import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, emails, apiKey } = body

    if (!apiKey || (!email && (!Array.isArray(emails) || emails.length === 0))) {
      return NextResponse.json({ error: "Missing email(s) or API key" }, { status: 400 })
    }

    // ✅ Handle single email (legacy/fallback)
    if (email) {
      const url = `https://api.millionverifier.com/api/v3/?api=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(email)}&timeout=10`
      const res = await fetch(url)
      const result = await res.json()

      return NextResponse.json({
        email: result.email,
        result: result.result,
        quality: result.quality,
        is_email_valid:
          ["ok", "valid", "catch_all"].includes(result.result?.toLowerCase?.()) &&
          result.quality?.toLowerCase?.() !== "risky",
      })
    }

    // ✅ Handle batch of emails
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
      } catch (error) {
        results.push({ email: e, is_email_valid: false })
      }
    }

    return NextResponse.json(results)
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
