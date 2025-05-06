import { Handler } from "@netlify/functions"
import { supabase } from "../../lib/supabase"
import { fetchBusinessData } from "../../actions/targetron"
import { parse } from "json2csv"
import axios from "axios"

// ✅ Slack webhook
const SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/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"

const handler: Handler = async () => {
  const now = new Date()
  const currentDay = now.toLocaleString("en-US", { weekday: "long" })
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  // ✅ Load recurring scrape schedules
  const { data: schedules, error: scheduleError } = await supabase
    .from("recurring_scrapes")
    .select("*")

  if (scheduleError || !schedules) {
    console.error("❌ Error fetching schedules:", scheduleError)
    return {
      statusCode: 500,
      body: "❌ Failed to fetch recurring scrape schedules",
    }
  }

  // ✅ Load shared settings (like API keys)
  const { data: settingsData, error: settingsError } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "scraperSettings")
    .limit(1)

  if (
    settingsError ||
    !settingsData ||
    settingsData.length === 0 ||
    !settingsData[0].value
  ) {
    console.error("❌ Error loading settings from Supabase", settingsError)
    return {
      statusCode: 500,
      body: "❌ Error loading settings from Supabase",
    }
  }

  const settings = settingsData[0].value

  const dueSchedules = schedules.filter(
    (s) =>
      s.recurring_days?.includes(currentDay) &&
      s.hour === currentHour &&
      s.minute === currentMinute
  )

  if (dueSchedules.length === 0) {
    console.log("⏱ No schedules due at this time.")
    return {
      statusCode: 200,
      body: "No schedules due at this time.",
    }
  }

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
        withPhone: true,
        withoutPhone: false,
        enrichWithAreaCodes: false,
        addedFrom: settings.fromDate || new Date().toISOString().split("T")[0],
        addedTo: settings.toDate || new Date().toISOString().split("T")[0],
      })

      const csv = parse(businessData)

      // ✅ Send message to Slack
      await axios.post(SLACK_WEBHOOK_URL, {
        text: `✅ Scheduled scrape ran for *${schedule.city}* (${schedule.business_type}) at ${currentHour}:${currentMinute}.\nRecords found: ${businessData.length}`,
      })

      // ✅ Send CSV as code snippet (optional)
      await axios.post(SLACK_WEBHOOK_URL, {
        text: "```\n" + csv.slice(0, 2800) + "\n```", // Slack limit is ~3000 chars
      })
    } catch (err) {
      console.error(`❌ Scrape failed for schedule ID ${schedule.id}`, err)
      await axios.post(SLACK_WEBHOOK_URL, {
        text: `❌ Scrape failed for schedule ID ${schedule.id}. Check server logs.`,
      })
    }
  }

  return {
    statusCode: 200,
    body: "✅ All due schedules processed",
  }
}

export { handler }
