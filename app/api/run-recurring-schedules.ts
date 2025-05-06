import { supabase } from "@/lib/supabase"
import { fetchBusinessData } from "@/actions/targetron"
import { sendTelegramMessage } from "@/actions/telegram"

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const now = new Date()
  const currentDay = now.toLocaleString("en-US", { weekday: "long" }) // e.g. Monday
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  const { data: schedules, error } = await supabase
    .from("recurring_scrapes")
    .select("*")

  if (error) {
    console.error("❌ Error fetching schedules:", error)
    return res.status(500).json({ error: "Supabase query failed" })
  }

  const due = schedules.filter(s =>
    s.recurring_days?.includes(currentDay) &&
    s.hour === currentHour &&
    s.minute === currentMinute
  )

  for (const schedule of due) {
    try {
      const results = await fetchBusinessData({
        apiKey: schedule.targetronApiKey,
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
        addedFrom: schedule.from_date || new Date().toISOString().split("T")[0], // Fallback to today
        addedTo: schedule.to_date || new Date().toISOString().split("T")[0],
      })
      

      await sendTelegramMessage(
        `✅ Scrape for ${schedule.city}, ${schedule.business_type} ran at ${currentHour}:${currentMinute}. ${results.length} records found.`,
        {
          botToken: schedule.telegramBotToken,
          chatId: schedule.telegramChatId,
        }
      )
    } catch (err) {
      console.error(`❌ Scrape failed for schedule ${schedule.id}`, err)
    }
  }

  return res.status(200).json({ message: "Checked schedules" })
}
