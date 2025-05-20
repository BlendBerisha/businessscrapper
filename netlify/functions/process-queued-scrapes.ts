import { Handler } from "@netlify/functions"
import * as XLSX from "xlsx"
import { createClient } from "@supabase/supabase-js"
import { supabase } from "../../lib/supabase"

// ✅ Admin client for storage uploads
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ✅ Helper: Fetch business data
async function fetchBusinessData(params: {
  apiKey: string
  country: string
  city: string
  state?: string
  postalCode?: string
  businessType: string
  limit: number
  skipTimes?: number
}) {
  const query = new URLSearchParams({
    cc: params.country,
    city: params.city,
    state: params.state || "",
    postalCode: params.postalCode || "",
    type: params.businessType,
    limit: String(params.limit),
    skip: String(((params.skipTimes || 1) - 1) * params.limit),
  })

  const url = `https://dahab.app.outscraper.com/data/places?${query.toString()}`
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-KEY": params.apiKey,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API request failed with status ${res.status}: ${text}`)
  }

  const json = await res.json()
  return json.data
}

// ✅ Main function
const handler: Handler = async () => {
  const { data: jobs, error } = await supabase
    .from("scrape_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)

  if (error || !jobs || jobs.length === 0) {
    console.log("🟡 No pending jobs or error fetching queue:", error)

    // ⏱️ Reset long-running jobs to failed (e.g. older than 30 minutes)
    const cleanup = await supabase
    .from("scrape_queue")
    .update({
      status: "failed",
      error: "Timed out after 30m",
    })
    .lt("updated_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
    .eq("status", "running") as {
      data: { id: string }[] | null
      error: any
    }
  
  console.log("🧹 Cleaned up stuck jobs:", cleanup.data ? cleanup.data.length : 0)
  
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

    if (settingsError || !settingsData?.[0]?.value) {
      throw new Error("Failed to fetch scraper settings")
    }

    const settings = settingsData[0].value
    const apiKey = settings.targetronApiKey?.trim()

    if (!apiKey) {
      throw new Error("Missing Targetron API key in settings")
    }

    console.log("🔐 Using API key:", apiKey.slice(0, 6) + "...")

    let businessData = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt} to fetch business data...`)
        businessData = await fetchBusinessData({
          apiKey,
          country: job.country,
          city: job.city,
          state: job.state,
          postalCode: job.postal_code,
          businessType: job.business_type,
          limit: job.record_limit,
          skipTimes: job.skip_times,
        })
        break
      } catch (err: any) {
        console.error(`❌ Attempt ${attempt} failed:`, err.message)
        if (attempt === 3 || !err.message.includes("503")) throw err
        await new Promise((res) => setTimeout(res, 1000 * attempt))
      }
    }

    if (!businessData?.length) {
      console.log("🟡 No data found.")
      await supabase.from("scrape_queue").update({ status: "no_results" }).eq("id", job.id)
      return { statusCode: 200, body: "No data found." }
    }

    const sheet = XLSX.utils.json_to_sheet(businessData)
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
    console.error("❌ Job failed:", err.message)
    await supabase
      .from("scrape_queue")
      .update({ status: "failed", error: err.message })
      .eq("id", job.id)

    return {
      statusCode: 500,
      body: `❌ Scrape failed: ${err.message}`,
    }
  }
}

export { handler }
