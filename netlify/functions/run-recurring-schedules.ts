import { Handler } from "@netlify/functions"
import { supabase } from "../../lib/supabase"
import { fetchBusinessData } from "../../actions/targetron"
import { DateTime } from "luxon"
import axios from "axios"
import * as XLSX from "xlsx"
import fs from "fs"
import path from "path"
import os from "os"
import FormData from "form-data" // ✅ use Node.js-compatible FormData

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN!
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID!

const handler: Handler = async () => {
  const now = DateTime.now().setZone("Europe/Tirane")
  const currentDay = now.toFormat("cccc")
  const currentHour = now.hour
  const currentMinute = now.minute

  console.log(`🕓 Local time: ${currentDay} ${currentHour}:${currentMinute}`)

  const { data: schedules, error: scheduleError } = await supabase
    .from("recurring_scrapes")
    .select("*")

  if (scheduleError || !schedules) {
    console.error("❌ Error fetching schedules:", scheduleError)
    return { statusCode: 500, body: "Failed to fetch schedules" }
  }

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
    return { statusCode: 500, body: "Error loading settings" }
  }

  const settings = settingsData[0].value
  const dueSchedules = schedules.filter(
    (s) =>
      s.recurring_days?.includes(currentDay) &&
      s.hour === currentHour &&
      s.minute === currentMinute
  )

  if (dueSchedules.length === 0) {
    console.log("⏱ No schedules due now.")
    return { statusCode: 200, body: "No schedules due now." }
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
        addedFrom: settings.fromDate || now.toISODate(),
        addedTo: settings.toDate || now.toISODate(),
      })

      if (!businessData || businessData.length === 0) {
        await postSlackMessage(`⚠️ No data found for ${schedule.city} at ${currentHour}:${currentMinute}`)
        continue
      }

      // ✅ Convert to XLSX and save temporarily
      const worksheet = XLSX.utils.json_to_sheet(businessData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Results")

      const tmpDir = os.tmpdir()
      const filePath = path.join(tmpDir, `scrape_${Date.now()}.xlsx`)
      XLSX.writeFile(workbook, filePath)

      // ✅ Upload to Slack
      await uploadFileToSlack(filePath, `Scrape Results – ${schedule.city}`, `Results for ${schedule.business_type} in ${schedule.city}`)

      // ✅ Confirm upload
      await postSlackMessage(`✅ Scrape complete for *${schedule.city}* (${schedule.business_type}) at ${currentHour}:${currentMinute}. Uploaded ${businessData.length} records.`)

      // ✅ Cleanup
      fs.unlinkSync(filePath)
    } catch (err) {
      console.error(`❌ Error in schedule ID ${schedule.id}`, err)
      await postSlackMessage(`❌ Scrape failed for schedule ID ${schedule.id}. See logs.`)
    }
  }

  return {
    statusCode: 200,
    body: "✅ Done processing schedules",
  }
}

async function postSlackMessage(text: string) {
  await axios.post("https://slack.com/api/chat.postMessage", {
    channel: SLACK_CHANNEL_ID,
    text,
  }, {
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
  })
}

async function uploadFileToSlack(filePath: string, title: string, initialComment: string) {
  const formData = new FormData()
  formData.append("file", fs.createReadStream(filePath))
  formData.append("filename", path.basename(filePath))
  formData.append("channels", SLACK_CHANNEL_ID)
  formData.append("title", title)
  formData.append("initial_comment", initialComment)

  const headers = {
    Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
    ...formData.getHeaders(),
  }

  await axios.post("https://slack.com/api/files.upload", formData, { headers })
}

export { handler }
