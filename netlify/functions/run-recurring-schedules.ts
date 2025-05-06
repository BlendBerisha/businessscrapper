import { Handler } from "@netlify/functions"
import { supabase } from "../../lib/supabase"
import { fetchBusinessData } from "../../actions/targetron"
import { parse } from "json2csv"
import axios from "axios"

const SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/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"

const handler: Handler = async () => {
  const now = new Date()
  const currentDay = now.toLocaleString("en-US", { weekday: "long" })
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  // Get saved recurring schedules
  const { data: schedules, error: scheduleError } = await supabase
    .from("recurring_scrapes")
    .select("*")

  if (scheduleError) {
    return {
      statusCode: 500,
      body: "❌ Error fetching schedules: " + JSON.stringify(scheduleError),
    }
  }

  // Load global API settings
  const { data: settingsRow, error: settingsError } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "scrapperSettings")
    .single()

  if (settingsError || !settingsRow || !settingsRow.value) {
    return {
      statusCode: 500,
      body: "❌ Error loading settings from Supabase",
    }
  }

  const settings = settingsRow.value

  const dueSchedules = schedules.filter(
    (s) =>
      s.recurring_days?.includes(currentDay) &&
      s.hour === currentHour &&
      s.minute === currentMinute
  )

  if (dueSchedules.length === 0) {
    return {
      statusCode: 200,
      body: "✅ No schedules due at this time.",
    }
  }

  for (const schedule of dueSchedules) {
    try {
      const results = await fetchBusinessData({
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
        addedFrom: schedule.from_date || new Date().toISOString().split("T")[0],
        addedTo: schedule.to_date || new Date().toISOString().split("T")[0],
      })

      const csv = parse(results)

      // Send to Slack
      await axios.post(SLACK_WEBHOOK_URL, {
        text: `✅ Scrape for *${schedule.city}* (${schedule.business_type}) ran at ${currentHour}:${currentMinute}. ${results.length} records found.`,
      })

      // NOTE: Slack webhooks do not support file uploads via webhook. You can only send plain text or links.
      // If you want to send files, you'd need to use the Slack API with OAuth instead.
    } catch (err) {
      await axios.post(SLACK_WEBHOOK_URL, {
        text: `❌ Scrape failed for ${schedule.city}, ${schedule.business_type}: ${err.message}`,
      })
    }
  }

  return {
    statusCode: 200,
    body: "✅ Recurring tasks processed",
  }
}

export { handler }
