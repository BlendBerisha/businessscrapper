import { InstantlyAPI } from "../../lib/instantly" // ✅ Works like your other cron jobs
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const handler = async () => {
  try {
    console.log("🔍 Fetching scraperSettings...")
    const { data: settingsRow, error: settingsError } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "scraperSettings")
      .maybeSingle()

    if (settingsError || !settingsRow) {
      throw new Error("❌ Missing Instantly configuration in Supabase.")
    }

    console.log("✅ Settings found:", settingsRow)

    const config = settingsRow.value || {}

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

    if (!leads || leads.length === 0) {
      console.log("ℹ️ No leads to upload.")
      return {
        statusCode: 200,
        body: "No new leads to upload.",
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
      await instantly.addLeadsFromData(batch)

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
