import { InstantlyAPI } from "../../lib/instantly"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const handler = async () => {
  try {
    console.log("🚀 Cron job started")

    const instantly = new InstantlyAPI({
      apiKey: "MTgwNmVmMTAtNDljMS00MWI4LTgyNmItNDRkN2JjZGRiMDVmOlJlS3pjTXhiSEtmTA==",
      listId: "7b0464c5-505c-4bc8-af80-cb02a92e216d",
      campaignId: "206ef3de-d47a-47aa-9276-efb0b0b4d347"
    })

    console.log("🔍 Fetching valid leads...")
    const { data: leads, error: leadsError } = await supabase
      .from("verified_leads")
      .select("*")
      .eq("is_email_valid", true)
      .eq("uploaded", false)

    if (leadsError) throw leadsError
    if (!leads || leads.length === 0) {
      console.log("ℹ️ No new leads to upload.")
      return {
        statusCode: 200,
        body: "No new leads to upload.",
      }
    }

    console.log(`✅ Found ${leads.length} valid leads.`)

    const batchSize = 50
    const batches = Array.from({ length: Math.ceil(leads.length / batchSize) }, (_, i) =>
      leads.slice(i * batchSize, i * batchSize + batchSize)
    )

    for (const batch of batches) {
      console.log(`📤 Uploading batch of ${batch.length} leads...`)
      try {
        const result = await instantly.addLeadsFromData(batch)
        console.log("✅ Instantly result:", result)

        const uploadedIds = batch
          .filter((lead) => result.success.includes(lead.email))
          .map((lead) => lead.id)

        if (uploadedIds.length > 0) {
          await supabase
            .from("verified_leads")
            .update({ uploaded: true })
            .in("id", uploadedIds)
          console.log(`✅ Marked ${uploadedIds.length} leads as uploaded.`)
        }
      } catch (uploadError) {
        console.error("❌ Failed to upload batch:", uploadError)
      }
    }

    return {
      statusCode: 200,
      body: `✅ Uploaded ${leads.length} leads.`,
    }

  } catch (err: any) {
    console.error("❌ Fatal cron error:", err)
    return {
      statusCode: 500,
      body: `Error: ${err.message || "Unknown error"}`,
    }
  }
}
