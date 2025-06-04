import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { email, emails, apiKey } = await req.json()

    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 400 })
    }

    // Single email fallback
    if (email) {
      const url = `https://api.millionverifier.com/api/v3/?api=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(email)}&timeout=10`
      const res = await fetch(url)
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
        is_email_valid:
          ["ok", "valid", "catch_all"].includes(result.result?.toLowerCase?.()) &&
          result.quality?.toLowerCase?.() !== "risky",
      })
    }

    // Batch email verification (max 25)
    if (Array.isArray(emails)) {
      const batch = emails.slice(0, 25)

      const results = await Promise.all(
        batch.map(async (email: string) => {
          try {
            const url = `https://api.millionverifier.com/api/v3/?api=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(email)}&timeout=10`
            const res = await fetch(url)
            const result = await res.json()

            return {
              email,
              is_email_valid:
                ["ok", "valid", "catch_all"].includes(result.result?.toLowerCase?.()) &&
                result.quality?.toLowerCase?.() !== "risky",
              result: result.result,
              quality: result.quality,
            }
          } catch (err) {
            return { email, is_email_valid: false, error: true }
          }
        })
      )

      return NextResponse.json(results)
    }

    return NextResponse.json({ error: "Missing email(s)" }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
