import { Handler } from "@netlify/functions"
import { supabase } from "../../lib/supabase"
import { fetchBusinessData } from "../../actions/targetron"
import { verifyEmails } from "../../actions/million-verifier"
import { parse } from "json2csv"
import axios from "axios"

// Your Slack Webhook
const SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/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"

const handler: Handler = async () => {
  const now = new Date()
  const currentDay = now.toLocaleString("en-US", { weekday: "long" })
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  // Load recurring scrapes
  const { data: schedules, error } = await supabase.from("recurring_scrapes").select("*")
  if (error || !schedules) {
    console.error("❌ Error fetching schedules:", error)
    return { statusCode: 500, body: "Error fetching schedules" }
  }

  // Load global settings
  const { data: settingsRow, error: settingsError } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "scrapperSettings")
    .single()

  const settingsData = settingsRow?.value
  if (settingsError || !settingsData) {
    console.error("❌ Error loading settings")
    return { statusCode: 500, body: "Error loading settings" }
  }

  // Filter due schedules
  const dueSchedules = schedules.filter(
    (s) =>
      s.recurring_days?.includes(currentDay) &&
      s.hour === currentHour &&
      s.minute === currentMinute
  )

  for (const schedule of dueSchedules) {
    try {
      // Fetch business data
      const data = await fetchBusinessData({
        apiKey: settingsData.targetronApiKey,
        country: schedule.country,
        city: schedule.city,
        state: schedule.state,
        postalCode: schedule.postal_code,
        businessType: schedule.business_type,
        businessStatus: schedule.business_status,
        limit: schedule.record_limit,
        skipTimes: schedule.skip_times,
        withPhone: true,
        withoutPhone: false,
        enrichWithAreaCodes: false,
        addedFrom: schedule.from_date || new Date().toISOString().split("T")[0],
        addedTo: schedule.to_date || new Date().toISOString().split("T")[0],
      })

      // Optional email verification
      const verifiedData = settingsData.connectEmailVerification && settingsData.millionApiKey
        ? await verifyEmails(data, settingsData.millionApiKey)
        : data

      // Convert to CSV
      const csv = parse(verifiedData)
      const csvBase64 = Buffer.from(csv, "utf-8").toString("base64")

      // Send to Slack
      await axios.post(SLACK_WEBHOOK_URL, {
        text: `✅ Scrape completed for *${schedule.city}, ${schedule.business_type}* at ${currentHour}:${currentMinute}. Found ${verifiedData.length} records.`,
        attachments: [
          {
            text: "CSV Preview:",
            fallback: "CSV Attached",
            color: "#36a64f",
            fields: [
              {
                title: "City",
                value: schedule.city,
                short: true,
              },
              {
                title: "Type",
                value: schedule.business_type,
                short: true,
              },
              {
                title: "Records",
                value: verifiedData.length.toString(),
                short: true,
              },
            ],
          },
        ],
      })

      console.log(`✅ Scrape complete for ${schedule.city} (${verifiedData.length} records)`)

    } catch (err) {
      console.error(`❌ Error running schedule ${schedule.id}`, err)
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Recurring scrape check complete." }),
  }
}

export { handler }
