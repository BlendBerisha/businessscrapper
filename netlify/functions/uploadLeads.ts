import { InstantlyAPI } from "@/lib/instantly"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const handler = async () => {
  try {
    // 1. Fetch Instantly config from Supabase settings table
    const { data: settingsRow, error: settingsError } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "scrapperSettings")
      .maybeSingle()

    if (settingsError || !settingsRow) {
      throw new Error("❌ Missing Instantly configuration in Supabase.")
    }

    const config = settingsRow.value || {}

    if (!config.instantlyApiKey || !config.instantlyListId || !config.instantlyCampaignId) {
      throw new Error("❌ Instantly credentials are incomplete.")
    }

    // 2. Fetch valid, not-yet-uploaded leads
    const { data: leads, error: leadsError } = await supabase
      .from("verified_leads")
      .select("*")
      .eq("is_email_valid", true)
      .eq("uploaded", false)

    if (leadsError) throw leadsError

    if (!leads || leads.length === 0) {
      return {
        statusCode: 200,
        body: "No new leads to upload.",
      }
    }

    // 3. Chunk leads into batches
    const batchSize = 50
    const batches = Array.from({ length: Math.ceil(leads.length / batchSize) }, (_, i) =>
      leads.slice(i * batchSize, i * batchSize + batchSize)
    )

    // 4. Initialize InstantlyAPI with config from Supabase
    const instantly = new InstantlyAPI({
      apiKey: config.instantlyApiKey,
      listId: config.instantlyListId,
      campaignId: config.instantlyCampaignId,
    })

    // 5. Upload each batch and mark as uploaded
    for (const batch of batches) {
      await instantly.addLeadsFromData(batch)

      const ids = batch.map((lead: any) => lead.id)
      await supabase
        .from("verified_leads")
        .update({ uploaded: true })
        .in("id", ids)
    }

    return {
      statusCode: 200,
      body: `✅ Uploaded ${leads.length} leads in ${batches.length} batches.`,
    }

  } catch (err: any) {
    console.error("❌ Cron upload error:", err)
    return {
      statusCode: 500,
      body: `Error: ${err.message || "Unknown error"}`,
    }
  }
}
