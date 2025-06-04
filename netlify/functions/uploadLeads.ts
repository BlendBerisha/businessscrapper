import { InstantlyAPI } from "../../lib/instantly"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const handler = async () => {
  try {
    console.log("🚀 Cron job started")

    console.log("🔍 Fetching scraperSettings...")
    const { data: settingsRow, error: settingsError } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "scraperSettings")
      .maybeSingle()

    if (settingsError || !settingsRow) {
      throw new Error("❌ Missing scraperSettings in Supabase.")
    }

    const config = settingsRow.value

    if (typeof config !== "object" || !config) {
      throw new Error("❌ Config is not an object or is null.")
    }

    console.log("🧩 Config values:", {
      instantlyApiKey: config.instantlyApiKey,
      instantlyListId: config.instantlyListId,
      instantlyCampaignId: config.instantlyCampaignId,
    })

    if (!config.instantlyApiKey || !config.instantlyListId || !config.instantlyCampaignId) {
      throw new Error("❌ Instantly credentials are incomplete.")
    }

    console.log("🔍 Fetching leads...")
    const { data: leads, error: leadsError } = await supabase
      .from("verified_leads")
      .select("*")
      .eq("is_email_valid", true)
      .eq("uploaded", false)

    if (leadsError) throw leadsError

    console.log("🐞 Raw leads result:", leads)

    if (!leads) {
      console.log("❌ leads is undefined")
      return {
        statusCode: 200,
        body: "No new leads (undefined)."
      }
    }

    if (leads.length === 0) {
      console.log("ℹ️ leads array is empty")
      return {
        statusCode: 200,
        body: "No new leads (0 length)."
      }
    }

    console.log(`✅ Found ${leads.length} leads.`)

    const batchSize = 50
    const batches = Array.from({ length: Math.ceil(leads.length / batchSize) }, (_, i) =>
      leads.slice(i * batchSize, i * batchSize + batchSize)
    )

    console.log(`🔄 Uploading in ${batches.length} batches.`)

    const instantly = new InstantlyAPI({
      apiKey: config.instantlyApiKey,
      listId: config.instantlyListId,
      campaignId: config.instantlyCampaignId,
    })

    for (const batch of batches) {
      console.log(`📤 Uploading batch with ${batch.length} leads...`)
      try {
        await instantly.addLeadsFromData(batch)
      } catch (uploadError) {
        console.error("❌ Failed to upload to Instantly:", uploadError)
        throw uploadError
      }

      const ids = batch.map((lead: any) => lead.id)
      await supabase
        .from("verified_leads")
        .update({ uploaded: true })
        .in("id", ids)

      console.log("✅ Batch uploaded and marked as uploaded.")
    }

    return {
      statusCode: 200,
      body: `✅ Uploaded ${leads.length} leads in ${batches.length} batches.`,
    }

  } catch (err: any) {
    console.error("❌ Fatal cron error:", err)
    return {
      statusCode: 500,
      body: `Error: ${err.message || "Unknown error"}`,
    }
  }
}
