import { Handler } from "@netlify/functions"
import { supabase } from "../../lib/supabase"
import { fetchBusinessData } from "../../actions/targetron"
import { sendTelegramMessage } from "../../actions/telegram"

const handler: Handler = async () => {
  const now = new Date()
  const currentDay = now.toLocaleString("en-US", { weekday: "long" })
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  // 1. Load recurring schedules
  const { data: schedules, error } = await supabase
    .from("recurring_scrapes")
    .select("*")

  if (error || !schedules) {
    return { statusCode: 500, body: "Failed to fetch schedules" }
  }

  const due = schedules.filter(
    (s) => s.recurring_days?.includes(currentDay) && s.hour === currentHour && s.minute === currentMinute
  )

  if (due.length === 0) {
    return { statusCode: 200, body: "No schedules matched this time" }
  }

  // 2. Fetch settings from "settings" table
  const { data: settingsRow, error: settingsError } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "scrapperSettings")
    .single()

  if (settingsError || !settingsRow) {
    return { statusCode: 500, body: "Failed to fetch scraper settings" }
  }

  const settingsData = typeof settingsRow.value === "string"
    ? JSON.parse(settingsRow.value)
    : settingsRow.value

  for (const schedule of due) {
    try {
      const results = await fetchBusinessData({
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
        addedFrom: settingsData.fromDate,
        addedTo: settingsData.toDate,
      })

      await sendTelegramMessage(
        `✅ Scrape for ${schedule.city}, ${schedule.business_type} ran at ${currentHour}:${currentMinute}. ${results.length} records found.`,
        {
          botToken: settingsData.telegramBotToken,
          chatId: settingsData.telegramChatId,
        }
      )
    } catch (err) {
      console.error(`❌ Scrape failed for schedule ${schedule.id}`, err)
    }
  }

  return { statusCode: 200, body: "Scheduled scrapes executed" }
}

export { handler }
