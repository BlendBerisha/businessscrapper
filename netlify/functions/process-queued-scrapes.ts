import { Handler } from "@netlify/functions"
import * as XLSX from "xlsx"
import { createClient } from "@supabase/supabase-js"
import { supabase } from "../../lib/supabase"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fetchBusinessData(params: any) {
  const timeoutMs = 5000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const baseQuery = new URLSearchParams({
    cc: params.country,
    city: params.city,
    state: params.state || "",
    postalCode: params.postalCode || "",
    type: params.businessType,
  })

  const estimateUrl = `https://dahab.app.outscraper.com/estimate/places?${baseQuery.toString()}`
  const estimateRes = await fetch(estimateUrl, {
    method: "GET",
    headers: { "X-API-KEY": params.apiKey },
    signal: controller.signal,
  })
  clearTimeout(timer)

  const estimateData = await estimateRes.json()
  const total = estimateData?.total || 0
  if (!estimateRes.ok || total === 0) {
    throw new Error(`Estimate failed or no data found. Status: ${estimateRes.status}, Total: ${total}`)
  }

  const fetchController = new AbortController()
  const fetchTimer = setTimeout(() => fetchController.abort(), timeoutMs)

  baseQuery.set("limit", String(params.limit))
  baseQuery.set("skip", String(((params.skipTimes || 1) - 1) * params.limit))

  const url = `https://dahab.app.outscraper.com/data/places?${baseQuery.toString()}`
  const res = await fetch(url, {
    method: "GET",
    headers: { "X-API-KEY": params.apiKey },
    signal: fetchController.signal,
  })
  clearTimeout(fetchTimer)

  if (!res.ok) throw new Error(`API request failed with status ${res.status}`)

  const json = await res.json()
  return json.data
}

const handler: Handler = async () => {
  const { data: jobs, error } = await supabase
    .from("scrape_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)

  if (error || !jobs || jobs.length === 0) {
    console.log("🟡 No pending jobs or error fetching queue:", error)
    await supabase
      .from("scrape_queue")
      .update({ status: "failed", error: "Timed out after 30m" })
      .lt("updated_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .eq("status", "running")
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

    if (settingsError || !settingsData?.[0]?.value) throw new Error("Failed to fetch scraper settings")

    const settings = settingsData[0].value
    const apiKey = settings.targetronApiKey?.trim()
    const mvKey = settings.millionVerifierApiKey?.trim()
    if (!apiKey) throw new Error("Missing Targetron API key in settings")
    if (!mvKey) throw new Error("Missing MillionVerifier API key in settings")

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
      await supabase.from("scrape_queue").update({ status: "no_results" }).eq("id", job.id)
      return { statusCode: 200, body: "No data found." }
    }

    for (const row of businessData) {
      const emailFields = ['email', 'email_1', 'email_2', 'email_3']
      let isVerified = false

      for (const field of emailFields) {
        const email = row[field]
        if (email) {
          try {
            const verifyUrl = `https://api.millionverifier.com/api/v3/?api=${encodeURIComponent(mvKey)}&email=${encodeURIComponent(email)}`
            const res = await fetch(verifyUrl)
            const json = await res.json()

            const result = json.result?.toLowerCase?.() || ""
            const quality = json.quality?.toLowerCase?.() || "unknown"

            const isValid = quality !== "risky" && quality !== "unknown"
            if (isValid) {
              isVerified = true
              row.valid_email = email
              row.email_result = result
              row.email_quality = quality
              row.email_resultcode = json.resultcode
              break
            }
          } catch (err) {
            console.error(`❌ Verification failed for ${email}`, err)
          }
        }
      }

      row.is_email_valid = isVerified
      if (!isVerified) {
        row.email_result = "invalid"
        row.email_quality = "unknown"
      }
    }

    const sheet = XLSX.utils.json_to_sheet(businessData)
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, "Results")
    const buffer = XLSX.write(book, { bookType: "xlsx", type: "buffer" })

    const fileName = `verified_${Date.now()}.xlsx`
    const { error: uploadError } = await supabaseAdmin.storage
      .from("scrapes")
      .upload(fileName, buffer, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      })

    if (uploadError) {
      await supabase.from("scrape_queue").update({ status: "failed" }).eq("id", job.id)
      return { statusCode: 500, body: "Upload failed." }
    }

    await supabase
      .from("scrape_queue")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", job.id)

    return { statusCode: 200, body: `✅ Scrape job ${job.id} completed and stored.` }
  } catch (err: any) {
    console.error("❌ Job failed:", err.message)
    await supabase
      .from("scrape_queue")
      .update({ status: "failed", error: err.message })
      .eq("id", job.id)
    return { statusCode: 500, body: `❌ Scrape failed: ${err.message}` }
  }
}

export { handler }
