// app/api/process-queued-scrapes/route.ts
import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { createClient } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import axios from "axios"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fetchBusinessData(params: any) {
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
  })

  const estimateData = await estimateRes.json()
  const total = estimateData?.total || 0
  if (!estimateRes.ok || total === 0) {
    throw new Error(`Estimate failed. Status: ${estimateRes.status}, Total: ${total}`)
  }

  baseQuery.set("limit", String(params.limit))
  baseQuery.set("skip", String(((params.skipTimes || 1) - 1) * params.limit))

  const url = `https://dahab.app.outscraper.com/data/places?${baseQuery.toString()}`
  const res = await fetch(url, {
    method: "GET",
    headers: { "X-API-KEY": params.apiKey },
  })

  if (!res.ok) throw new Error(`API request failed with status ${res.status}`)

  const json = await res.json()
  return json.data
}

async function verifyEmailsTimedLoop(
  emails: { id: string; email: string }[],
  apiKey: string
): Promise<Record<string, boolean>> {
  let index = 0
  const resultMap: Record<string, boolean> = {}

  return new Promise((resolve) => {
    const loop = async () => {
      const start = Date.now()
      while (index < emails.length) {
        const { id, email } = emails[index]

        try {
          const res = await fetch("https://api.millionverifier.com/api/v3/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api: apiKey, email }),
          })
          const result = await res.json()
          const isValid =
            ["ok", "valid", "catch_all"].includes(result.result?.toLowerCase?.()) &&
            result.quality?.toLowerCase?.() !== "risky"
          resultMap[id] = isValid
        } catch {
          resultMap[id] = false
        }

        index++
        if (Date.now() - start >= 9500) {
          setTimeout(loop, 100)
          return
        }
      }
      resolve(resultMap)
    }
    loop()
  })
}

export async function GET() {
  const { data: jobs } = await supabase
    .from("scrape_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ message: "No pending jobs." })
  }

  const job = jobs[0]
  await supabase.from("scrape_queue").update({ status: "running" }).eq("id", job.id)

  try {
    const { data: settingsData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "scraperSettings")
      .limit(1)

    const settings = settingsData?.[0]?.value
    const apiKey = settings.targetronApiKey
    const mvKey = settings.millionApiKey
    const slackToken = settings.slackBotToken
    const slackChannel = settings.slackChannelId

    const businessData = await fetchBusinessData({
      apiKey,
      country: job.country,
      city: job.city,
      state: job.state,
      postalCode: job.postal_code,
      businessType: job.business_type,
      limit: job.record_limit,
      skipTimes: job.skip_times,
    })

    const emailsToCheck = businessData
      .map((item: any, idx: number) => {
        const email = item.email || item.email_1 || item.email_2 || item.email_3
        return email ? { id: String(idx), email } : null
      })
      .filter(Boolean) as { id: string; email: string }[]

    const validationResults = await verifyEmailsTimedLoop(emailsToCheck, mvKey)

    const verifiedData = businessData.map((item: any, idx: number) => {
      const id = String(idx)
      return {
        ...item,
        email: emailsToCheck.find((e) => e.id === id)?.email || "",
        is_email_valid: validationResults[id] ?? false,
      }
    })

    const sheet = XLSX.utils.json_to_sheet(verifiedData)
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

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/scrapes/${encodeURIComponent(fileName)}`

    if (slackToken && slackChannel) {
      await axios.post(
        "https://slack.com/api/chat.postMessage",
        {
          channel: slackChannel,
          text: `✅ *Scrape completed* for *${job.city}* (${job.business_type})\n📎 [Download XLSX](${publicUrl})`,
          mrkdwn: true,
        },
        {
          headers: {
            Authorization: `Bearer ${slackToken}`,
            "Content-Type": "application/json",
          },
        }
      )
    }

    await supabase
      .from("scrape_queue")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", job.id)

    return NextResponse.json({ message: `✅ Scrape job ${job.id} completed.` })
  } catch (err: any) {
    await supabase
      .from("scrape_queue")
      .update({ status: "failed", error: err.message })
      .eq("id", job.id)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
