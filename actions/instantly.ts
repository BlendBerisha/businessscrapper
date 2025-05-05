"use server"

import { InstantlyAPI, InstantlyCredentials } from "@/lib/instantly"

export async function uploadToInstantly(
  businessData: any[],
  credentials?: Partial<InstantlyCredentials>
) {
  const apiKey = credentials?.apiKey || process.env.INSTANTLY_API_KEY!
  const listId = credentials?.listId || process.env.INSTANTLY_LIST_ID!
  const campaignId = credentials?.campaignId || process.env.INSTANTLY_CAMPAIGN_ID!

  if (!apiKey || !listId || !campaignId) {
    throw new Error("Instantly credentials missing")
  }

  const instantly = new InstantlyAPI({ apiKey, listId, campaignId })

  return await instantly.addLeadsFromData(businessData)
}
