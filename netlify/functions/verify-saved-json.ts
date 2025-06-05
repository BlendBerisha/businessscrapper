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
  const { data: settingsData } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "scraperSettings")
    .maybeSingle()

  const settings = settingsData?.value || {}
  const slackToken = settings.slackBotToken
  const slackChannel = settings.slackChannelId
  const mvKey = settings.millionApiKey

  if (!slackToken || !slackChannel || !mvKey) {
    return { statusCode: 400, body: "Missing Slack credentials or MV key in settings." }
  }

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

  // Update DB
  const { error: updateError } = await supabase
    .from("saved_json")
    .update({
      json_data: verifiedData,
      verified: true,
      verified_at: new Date().toISOString(),
    })
    .eq("id", entry.id)

  if (updateError) {
    return { statusCode: 500, body: `❌ Failed to save verified data: ${updateError.message}` }
  }

  // Export and Upload
  const sheet = XLSX.utils.json_to_sheet(verifiedData)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, "Verified Leads")
  const buffer = XLSX.write(book, { bookType: "xlsx", type: "buffer" })

  const filename = `verified_leads_${Date.now()}.xlsx`
  const { error: uploadError } = await supabase.storage
    .from("scrapes")
    .upload(filename, buffer, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: true,
    })

  if (uploadError) {
    return { statusCode: 500, body: `❌ Upload failed: ${uploadError.message}` }
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/scrapes/${filename}`

  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${slackToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: slackChannel,
      text: `✅ *Verified Leads Ready*\nFile: <${publicUrl}|Download XLSX>`
    })
  })

  return {
    statusCode: 200,
    body: `✅ Verified ${emailsToCheck.length} emails, saved and posted to Slack.`,
  }
}

export { handler }
