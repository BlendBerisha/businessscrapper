import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { createClient } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import axios from "axios"
import { DateTime } from "luxon"

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

async function fetchBusinessData(params: any) {
  const baseQuery = new URLSearchParams({
    cc: params.country,
    city: params.city,
    state: params.state || "",
    postalCode: params.postalCode || "",
    type: params.businessType,
  })

  const estimateUrl = `https://dahab.app.outscraper.com/estimate/places?${baseQuery.toString()}`
  const estimateRes = await fetch(estimateUrl, {
    method: "GET",
    headers: { "X-API-KEY": params.apiKey },
  })

  const estimateData = await estimateRes.json()
  const total = estimateData?.total || 0
  if (!estimateRes.ok || total === 0) {
    throw new Error(`Estimate failed. Status: ${estimateRes.status}, Total: ${total}`)
  }

  baseQuery.set("limit", String(params.limit))
  baseQuery.set("skip", String(((params.skipTimes || 1) - 1) * params.limit))

  const url = `https://dahab.app.outscraper.com/data/places?${baseQuery.toString()}`
  const res = await fetch(url, {
    method: "GET",
    headers: { "X-API-KEY": params.apiKey },
  })

  if (!res.ok) throw new Error(`API request failed with status ${res.status}`)

  const json = await res.json()
  return json.data
}

async function verifyEmailsTimedLoop(emails: { id: string; email: string }[], apiKey: string): Promise<Record<string, boolean>> {
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
        } catch {
          resultMap[id] = false
        }

        index++
        if (Date.now() - start >= 9500) {
          setTimeout(loop, 100)
          return
        }
      }
      resolve(resultMap)
    }
    loop()
  })
}

export async function GET() {
  const now = DateTime.now().setZone("Europe/Tirane")
  const currentDay = now.toFormat("cccc") // e.g. "Friday"
  const currentHour = now.hour
  const currentMinute = now.minute

  const { data: schedules, error } = await supabase
    .from("recurring_scrapes")
    .select("*")

  if (error || !schedules) {
    console.error("❌ Error fetching schedules:", error?.message)
    return NextResponse.json({ error: error?.message || "No schedules found" }, { status: 500 })
  }

  const due = schedules.filter((s) =>
    s.recurring_days?.includes(currentDay) &&
    s.hour === currentHour &&
    s.minute === currentMinute
  )

  if (due.length === 0) {
    console.log("⏱️ No due recurring schedules.")
    return NextResponse.json({ message: "No due recurring schedules." })
  }

  console.log(`🎯 Found ${due.length} due recurring schedules at ${currentHour}:${currentMinute}`)

  // Here you'd typically insert them into `scrape_queue`
  const insertData = due.map((s) => ({
    created_at: new Date().toISOString(),
    status: "pending",
    record_limit: s.record_limit || 15,
    skip_times: s.skip_times || 1,
    add_to_campaign: s.add_to_campaign || false,
    city: s.city,
    state: s.state,
    country: s.country,
    postal_code: s.postal_code,
    business_type: s.business_type,
    business_status: s.business_status,
    phone_filter: s.phone_filter || "with_phone",
    phone_number: "",
    verify_emails: true,
    enrich_with_area_codes: s.enrich_with_area_codes || false,
    json_file_name: "auto.json",
    csv_file_name: "auto.csv",
  }))

  const { error: insertError } = await supabase
    .from("scrape_queue")
    .insert(insertData)

  if (insertError) {
    console.error("❌ Failed inserting scrape jobs from recurring:", insertError.message)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }
  const { data: settingsData } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "scraperSettings")
    .maybeSingle()

  const slackToken = settingsData?.value?.slackBotToken
  const slackChannel = settingsData?.value?.slackChannelId

  if (slackToken && slackChannel) {
    await axios.post(
      "https://slack.com/api/chat.postMessage",
      {
        channel: slackChannel,
        text: `📅 *${due.length} recurring scrape(s)* scheduled and added to queue at ${currentHour}:${currentMinute}`,
        mrkdwn: true,
      },
      {
        headers: {
          Authorization: `Bearer ${slackToken}`,
          "Content-Type": "application/json",
        },
      }
    ).catch((e) => console.error("❌ Slack notify error:", e.message))
  }


  return NextResponse.json({ message: "✅ Recurring schedules added to queue", count: due.length })
}
