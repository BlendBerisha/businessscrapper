// /netlify/functions/process-queued-scrapes.ts

import { Handler } from "@netlify/functions"
import { supabase } from "../../lib/supabase"
import { fetchBusinessData } from "../../actions/targetron"
import { verifyEmails } from "../../actions/million-verifier"
import * as XLSX from "xlsx"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const handler: Handler = async () => {
  const { data: jobs, error } = await supabase
    .from("scrape_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)

  if (error || !jobs || jobs.length === 0) {
    console.log("🟡 No pending jobs or error fetching queue:", error)
    return { statusCode: 200, body: "No pending jobs." }
  }

  const job = jobs[0]
  console.log("🟢 Running job ID:", job.id)

  await supabase.from("scrape_queue").update({ status: "running" }).eq("id", job.id)

  try {
    const { data: settingsData, error: settingsError } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "scraperSettings")
      .limit(1)

    console.log("⚙️ Settings fetched:", settingsData)
    if (settingsError) {
      console.error("❌ Error fetching settings:", settingsError)
      throw new Error("Failed to fetch scraper settings")
    }

    const settings = settingsData?.[0]?.value

    if (!settings?.targetronApiKey) {
      throw new Error("Missing Targetron API key in settings")
    }

    console.log("🔐 Targetron API key:", settings.targetronApiKey.slice(0, 6) + "...")

    const businessData = await fetchBusinessData({
      apiKey: settings.targetronApiKey,
      country: job.country,
      city: job.city,
      state: job.state,
      postalCode: job.postal_code,
      businessType: job.business_type,
      businessStatus: job.business_status,
      limit: job.record_limit,
      skipTimes: job.skip_times,
      addedFrom: job.from_date,
      addedTo: job.to_date,
      withPhone: job.phone_filter !== "without_phone",
      withoutPhone: job.phone_filter !== "with_phone",
      enrichWithAreaCodes: job.enrich_with_area_codes,
      phoneNumber: job.phone_number || undefined,
    })

    if (!businessData?.length) {
      console.log("🟡 No data found for this job.")
      await supabase.from("scrape_queue").update({ status: "no_results" }).eq("id", job.id)
      return { statusCode: 200, body: "No data found." }
    }

    let verifiedData = businessData

    if (job.verify_emails && settings.millionApiKey) {
      console.log("📧 Verifying emails using Million Verifier...")
      verifiedData = await verifyEmails(businessData, settings.millionApiKey)
    }

    const sheet = XLSX.utils.json_to_sheet(verifiedData)
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, "Results")
    const buffer = XLSX.write(book, { bookType: "xlsx", type: "buffer" })

    const fileName = `queued_${Date.now()}.xlsx`
    const { error: uploadError } = await supabaseAdmin.storage
      .from("scrapes")
      .upload(fileName, buffer, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      })

    if (uploadError) {
      console.error("❌ Upload error", uploadError)
      await supabase.from("scrape_queue").update({ status: "failed" }).eq("id", job.id)
      return { statusCode: 500, body: "Upload failed." }
    }

    await supabase
      .from("scrape_queue")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", job.id)

    return {
      statusCode: 200,
      body: `✅ Scrape job ${job.id} completed and stored.`,
    }
  } catch (err: any) {
    console.error("❌ Job failed:", err.message || err)
    await supabase.from("scrape_queue").update({
      status: "failed",
      error: err.message,
    }).eq("id", job.id)

    return { statusCode: 500, body: `❌ Scrape failed: ${err.message}` }
  }
}

export { handler }
