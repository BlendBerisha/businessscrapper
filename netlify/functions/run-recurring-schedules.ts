import { Handler } from "@netlify/functions"
import { supabase } from "../../lib/supabase"
import { fetchBusinessData } from "../../actions/targetron"
import { sendTelegramMessage } from "../../actions/telegram"

const handler: Handler = async () => {
  const now = new Date()
  const currentDay = now.toLocaleString("en-US", { weekday: "long" })
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  // 1. Load all schedules
  const { data: schedules, error } = await supabase
    .from("recurring_scrapes")
    .select("*")

  if (error) {
    console.error("❌ Error fetching schedules:", error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Supabase query failed" }),
    }
  }

  // 2. Load saved API settings
  const { data: settingsData, error: settingsError } = await supabase
    .from("settings") // your settings table name
    .select("*")
    .single()

  if (settingsError || !settingsData) {
    console.error("❌ Failed to load saved settings", settingsError)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to load API credentials" }),
    }
  }

  // 3. Filter due schedules
  const due = schedules.filter(
    (s) =>
      s.recurring_days?.includes(currentDay) &&
      s.hour === currentHour &&
      s.minute === currentMinute
  )

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
        addedFrom: schedule.from_date || new Date().toISOString().split("T")[0],
        addedTo: schedule.to_date || new Date().toISOString().split("T")[0],
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

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Checked schedules" }),
  }
}

export { handler }
