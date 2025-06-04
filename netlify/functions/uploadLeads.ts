import { InstantlyAPI } from "@/lib/instantly" // no need to change if this already works
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const handler = async () => {
  try {
    const { data: leads, error } = await supabase
      .from("verified_leads")
      .select("*")
      .eq("is_email_valid", true)
      .eq("uploaded", false)

    if (error) throw error
    if (!leads || leads.length === 0) return {
      statusCode: 200,
      body: "No new leads to upload."
    }

    const batchSize = 50
    const batches = Array.from({ length: Math.ceil(leads.length / batchSize) }, (_, i) =>
      leads.slice(i * batchSize, i * batchSize + batchSize)
    )

    const instantly = new InstantlyAPI({
      apiKey: process.env.INSTANTLY_API_KEY!,
      listId: process.env.INSTANTLY_LIST_ID!,
      campaignId: process.env.INSTANTLY_CAMPAIGN_ID!,
    })

    for (const batch of batches) {
      await instantly.addLeadsFromData(batch)
      const ids = batch.map(lead => lead.id)
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
    return { statusCode: 500, body: `Error: ${err.message}` }
  }
}
