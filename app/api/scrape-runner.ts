// pages/api/scrape-runner.ts

import { NextApiRequest, NextApiResponse } from "next"
import { supabase } from "@/lib/supabase"
import { fetchBusinessData } from "@/actions/targetron"
import { verifyEmails } from "@/actions/million-verifier"
import { convertJsonToCsv } from "@/lib/utils"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let job: any = null

  try {
    // 1. Fetch the first pending job
    const { data: jobs, error } = await supabase
      .from("scrape_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)

    if (error || !jobs || jobs.length === 0) {
      return res.status(200).json({ message: "No pending jobs." })
    }

    job = jobs[0]

    // 2. Mark job as "running"
    await supabase.from("scrape_queue").update({ status: "running" }).eq("id", job.id)

    // 3. Run the scraper
    const data = await fetchBusinessData({
      apiKey: process.env.TARGETRON_API_KEY!,
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

    if (!data || data.length === 0) {
      // ❌ No results, remove job
      await supabase.from("scrape_queue").delete().eq("id", job.id)
      return res.status(200).json({ message: "No results found. Job removed." })
    }

    let verifiedData = data

    if (job.verify_emails && process.env.MILLION_VERIFIER_KEY) {
      verifiedData = await verifyEmails(data, process.env.MILLION_VERIFIER_KEY)
    }

    // Simulate saving files (not used here but retained for logic completeness)
    const jsonBlob = JSON.stringify(verifiedData, null, 2)
    const csvBlob = convertJsonToCsv(verifiedData, job.csv_file_name)

    // ✅ Delete job when done
    await supabase.from("scrape_queue").delete().eq("id", job.id)

    return res.status(200).json({ message: `✅ Job ${job.id} completed and removed.` })
  } catch (err: any) {
    console.error("❌ Error in job:", err.message)

    if (job?.id) {
      // ❌ Delete failed job to avoid stuck entries
      await supabase.from("scrape_queue").delete().eq("id", job.id)
    }

    return res.status(500).json({ message: "Scrape failed", error: err.message })
  }
}

export async function calculateNextSkipTime(businessType: string): Promise<number> {
    const { data, error } = await supabase
      .from("recurring_scrapes")
      .select("record_limit")
      .eq("business_type", businessType)
  
    if (error) {
      console.error("❌ Error fetching existing scrapes:", error.message)
      return 1
    }
  
    const totalLimit = data?.reduce((sum, row) => sum + (row.record_limit || 0), 0) || 0
    const skip = Math.floor(totalLimit / 100) + 1
    return skip
  }
  