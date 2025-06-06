import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { fetchBusinessData } from "@/actions/targetron"
import { DateTime } from "luxon"
import axios from "axios"
import * as XLSX from "xlsx"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VERIFIED_HEADERS = [
  "display_name", "types", "type", "country_code", "state", "city", "county", "street", "postal_code", "enrich area codes",
  "address", "latitude", "longitude", "phone", "phone_type", "linkedin", "facebook", "twitter", "instagram", "tiktok",
  "whatsapp", "youtube", "site", "site_generator", "photo", "photos_count", "rating", "rating_history", "reviews", "reviews_link",
  "range", "business_status", "business_status_history", "booking_appointment_link", "menu_link", "verified", "owner_title",
  "located_in", "os_id", "google_id", "place_id", "cid", "gmb_link", "located_os_id", "working_hours", "area_service", "about",
  "corp_name", "corp_employees", "corp_revenue", "corp_founded_year", "corp_is_public", "added_at", "updated_at",
  "email", "email_title", "email_first_name", "email_last_name", "is_email_valid"
]

interface MillionVerifierResponse {
  status: string
  result: string
}

const verifyEmail = async (email: string, apiKey: string): Promise<boolean> => {
  try {
    const { data } = await axios.get<MillionVerifierResponse>(
      `https://api.millionverifier.com/api/v3/?api=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(email)}`
    )
    return data.status === "ok" && data.result === "valid"
  } catch (error) {
    console.error("❌ Email verification error for:", email, error)
    return false
  }
}

async function postSlackMessage(text: string, slackBotToken: string, slackChannelId: string) {
  try {
    console.log("📤 Sending Slack message:", { slackChannelId, text })

    const response = await axios.post("https://slack.com/api/chat.postMessage", {
      channel: slackChannelId,
      text,
      mrkdwn: true,
    }, {
      headers: {
        Authorization: `Bearer ${slackBotToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.data.ok) {
      console.error("❌ Slack API error:", response.data)
    } else {
      console.log("✅ Slack message sent.")
    }
  } catch (err) {
    console.error("❌ Failed to send Slack message:", err)
  }
}

async function runRecurringScrapes() {
  const now = DateTime.now().setZone("Europe/Tirane")
  const currentDay = now.toFormat("cccc")
  const currentHour = now.hour
  const currentMinute = now.minute

  const { data: schedules } = await supabase.from("recurring_scrapes").select("*")
  const { data: settingsData } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "scraperSettings")
    .limit(1)

  const settings = typeof settingsData?.[0]?.value === "string"
    ? JSON.parse(settingsData[0].value)
    : settingsData?.[0]?.value || {}

  const slackBotToken = settings.slackBotToken
  const slackChannelId = settings.slackChannelId

  console.log("🧪 Slack settings:", { slackBotToken, slackChannelId })
  if (!slackBotToken || !slackChannelId) {
    console.warn("⚠️ Slack bot token or channel ID missing.")
  }

  const dueSchedules = schedules?.filter(
    (s) =>
      s.recurring_days?.includes(currentDay) &&
      s.hour === currentHour &&
      s.minute === currentMinute
  ) || []

  // if (dueSchedules.length === 0 && slackBotToken && slackChannelId) {
  //   await postSlackMessage(`📭 No recurring scrapes scheduled at ${currentHour}:${currentMinute}.`, slackBotToken, slackChannelId)
  // }

  for (const schedule of dueSchedules) {
    try {
      const businessData = await fetchBusinessData({
        apiKey: settings.targetronApiKey,
        country: schedule.country,
        city: schedule.city,
        state: schedule.state,
        postalCode: schedule.postal_code,
        businessType: schedule.business_type,
        businessStatus: schedule.business_status,
        limit: schedule.record_limit,
        skipTimes: schedule.skip_times,
        withPhone: schedule.with_phone ?? true,
        withoutPhone: schedule.without_phone ?? false,
        enrichWithAreaCodes: schedule.enrich_with_area_codes ?? false,
        addedFrom: settings.fromDate || now.toISODate(),
        addedTo: settings.toDate || now.toISODate(),
      })

      if (!businessData?.length) {
        await postSlackMessage(`⚠️ No data found for ${schedule.city} at ${currentHour}:${currentMinute}`, slackBotToken, slackChannelId)
        continue
      }

      const rows: any[] = []
      const emailKeys = [
        ["email_1", "email_1_title", "email_1_first_name", "email_1_last_name"],
        ["email_2", "email_2_title", "email_2_first_name", "email_2_last_name"],
        ["email_3", "email_3_title", "email_3_first_name", "email_3_last_name"]
      ]

      for (const entry of businessData) {
        let hasEmail = false
        for (const [e, title, first, last] of emailKeys) {
          if (entry[e]) {
            hasEmail = true
            const isValid = await verifyEmail(entry[e], settings.millionApiKey)
            await new Promise((r) => setTimeout(r, 300))

            const row: any = {}
            for (const key of VERIFIED_HEADERS) {
              row[key] = entry[key] ?? ""
            }
            row.email = entry[e]
            row.email_title = entry[title] ?? ""
            row.email_first_name = entry[first] ?? ""
            row.email_last_name = entry[last] ?? ""
            row.is_email_valid = isValid ? "TRUE" : "FALSE"
            rows.push(row)
          }
        }

        if (!hasEmail) {
          const row: any = {}
          for (const key of VERIFIED_HEADERS) {
            row[key] = entry[key] ?? ""
          }
          row.email = ""
          row.email_title = ""
          row.email_first_name = ""
          row.email_last_name = ""
          row.is_email_valid = "FALSE"
          rows.push(row)
        }
      }

      const worksheet = XLSX.utils.json_to_sheet(rows, { header: VERIFIED_HEADERS })
      XLSX.utils.sheet_add_aoa(worksheet, [VERIFIED_HEADERS], { origin: "A1" })

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Results")
      const xlsxBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" })

      const fileName = `scrape_${Date.now()}.xlsx`
      const { error: uploadError } = await supabaseAdmin.storage
        .from("scrapes")
        .upload(fileName, xlsxBuffer, {
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          upsert: true,
        })

      if (uploadError) {
        console.error("❌ Upload error:", uploadError)
        await postSlackMessage(`❌ Upload to storage failed for ${schedule.city}`, slackBotToken, slackChannelId)
        continue
      }

      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/scrapes/${fileName}`

      await postSlackMessage(
        `✅ Scrape complete for *${schedule.city}* (${schedule.business_type}) at ${currentHour}:${currentMinute}.\n📎 [Download XLSX](${publicUrl}) – ${rows.length} rows.`,
        slackBotToken,
        slackChannelId
      )

      await supabase
        .from("recurring_scrapes")
        .update({ skip_times: (schedule.skip_times || 0) + 1 })
        .eq("id", schedule.id)

    } catch (err) {
      console.error(`❌ Error in schedule ID ${schedule.id}`, err)
      await postSlackMessage(`❌ Scrape failed for schedule ID ${schedule.id}.`, slackBotToken, slackChannelId)
    }
  }

  return NextResponse.json({ message: "✅ Done processing schedules" })
}

// 👇 Support both GET and POST
export async function GET() {
  return runRecurringScrapes()
}

export async function POST() {
  return runRecurringScrapes()
}
