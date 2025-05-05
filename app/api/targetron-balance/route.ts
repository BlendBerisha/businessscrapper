import { NextResponse } from "next/server"

export async function GET() {
  const TARGETRON_API_KEY = process.env.TARGETRON_API_KEY // or hardcode it if needed

  try {
    const res = await fetch("https://api.targetron.io/v1/credits", {
      headers: {
        Authorization: `Bearer ${TARGETRON_API_KEY}`,
      },
    })

    if (!res.ok) {
      const errorText = await res.text()
      return NextResponse.json({ error: errorText }, { status: res.status })
    }

    const json = await res.json()
    return NextResponse.json({ credits: json.credits })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
