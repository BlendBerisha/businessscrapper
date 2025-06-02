"use server"

import { InstantlyAPI, InstantlyCredentials } from "@/lib/instantly"

export async function uploadToInstantly(
  leads: any[],
  {
    apiKey,
    listId,
    campaignId,
  }: {
    apiKey: string
    listId: string
    campaignId: string
  }
) {
  const formattedLeads = leads
    .filter((item) => item.email && item.email.includes("@"))
    .map((item) => ({
      email: item.email,
      first_name: item.first_name || item.email.split("@")[0] || "",
      last_name: item.last_name || "",
      custom_variables: {
        company: item.company_name || item.display_name || "",
        phone: item.phone || "",
        website: item.website || "",
        city: item.city || "",
        country: item.country || "",
      },
    }))

  console.log("📤 Sending this to Instantly:", {
    campaignId,
    listId,
    leadCount: formattedLeads.length,
    sample: formattedLeads.slice(0, 2),
  })

  const response = await fetch("https://api.instantly.ai/api/v2/leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      leads: formattedLeads,
      listId,
      campaignId,
    }),
  })

  const result = await response.json()

  console.log("📬 Instantly API response:", result)

  if (!response.ok || result.error || result.failed > 0) {
    throw new Error(
      `Instantly error: ${result.message || "Some leads failed to upload."}`
    )
  }

  return result
}
