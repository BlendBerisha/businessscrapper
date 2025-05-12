import { Handler } from "@netlify/functions"
import { supabase } from "../../lib/supabase"
import { DateTime } from "luxon"

const handler: Handler = async () => {
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

  const settings = settingsData?.[0]?.value
  const dueSchedules = schedules?.filter(
    (s) =>
      s.recurring_days?.includes(currentDay) &&
      s.hour === currentHour &&
      s.minute === currentMinute
  ) || []

  for (const schedule of dueSchedules) {
    try {
      const businessData = [
        {
          display_name: "Test Business",
          city: schedule.city,
          type: schedule.business_type,
          email: "test@example.com",
        },
        {
          display_name: "Another Business",
          city: schedule.city,
          type: schedule.business_type,
          email: "hello@example.com",
        },
      ]

      console.log(`✅ Mock scrape success for ${schedule.business_type} at skip=${schedule.skip_times}`)
    } catch (err) {
      console.error(`❌ Error in schedule ID ${schedule.id}`, err)
    }
  }

  return { statusCode: 200, body: "✅ Done processing mock schedules" }
}

export { handler }
