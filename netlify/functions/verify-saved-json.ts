import { Handler } from "@netlify/functions"
import * as XLSX from "xlsx"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface EmailCheck {
  id: string
  email: string
}

async function verifyEmailsTimedLoop(
  emails: EmailCheck[],
  apiKey: string
): Promise<Record<string, boolean>> {
  let index = 0
  const resultMap: Record<string, boolean> = {}

  return new Promise((resolve) => {
    const loop = async () => {
      const start = Date.now()

      while (index < emails.length) {
        const { id, email } = emails[index]

        try {
          const res = await fetch("https://api.millionverifier.com/api/v3/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api: apiKey, email }),
          })
          const result = await res.json()

          const isValid =
            ["ok", "valid", "catch_all"].includes(result.result?.toLowerCase?.()) &&
            result.quality?.toLowerCase?.() !== "risky"

          resultMap[id] = isValid
          console.log(`✅ ${email} → ${result.result}/${result.quality} → valid: ${isValid}`)
        } catch (err) {
          console.error(`❌ Failed for ${email}:`, err)
          resultMap[id] = false
        }

        index++
        if (Date.now() - start >= 9500) {
          console.log("⏳ Breaking loop to avoid timeout")
          setTimeout(loop, 100)
          return
        }
      }

      resolve(resultMap)
    }

    loop()
  })
}

const handler: Handler = async () => {
  // Load unverified data from Supabase (or S3, or wherever you saved)
  const { data, error } = await supabase
    .from("saved_json")
    .select("*")
    .eq("verified", false)
    .limit(1)

  if (error || !data || data.length === 0) {
    return { statusCode: 200, body: "✅ No unverified data found." }
  }

  const entry = data[0]
  const businessData: any[] = entry.json_data || []

  const mvKey = process.env.MILLION_VERIFIER_API_KEY!
  const emailsToCheck = businessData
    .map((item, idx) => {
      const raw = item.email || item.email_1 || item.email_2 || item.email_3
      const email = typeof raw === "string" && raw.includes("@") ? raw.trim() : null
      return email ? { id: String(idx), email } : null
    })
    .filter(Boolean) as EmailCheck[]

  const results = await verifyEmailsTimedLoop(emailsToCheck, mvKey)

  const verifiedData = businessData.map((item, idx) => {
    const id = String(idx)
    return {
      ...item,
      email: emailsToCheck.find(e => e.id === id)?.email || "",
      is_email_valid: results[id] ?? false,
    }
  })

  // Save back to Supabase
  const { error: updateError } = await supabase
    .from("saved_json")
    .update({ json_data: verifiedData, verified: true, verified_at: new Date().toISOString() })
    .eq("id", entry.id)

  if (updateError) {
    return { statusCode: 500, body: `❌ Failed to save verified data: ${updateError.message}` }
  }

  return {
    statusCode: 200,
    body: `✅ Verified ${emailsToCheck.length} emails and saved.`,
  }
}

export { handler }
