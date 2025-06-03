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

  const leadsToUpload: any[] = []

  for (const item of businessData) {
    const emailFields = ["email", "email_1", "email_2", "email_3"]

    for (const field of emailFields) {
      const email = item[field]
      const isValidKey = `is_${field}_valid`

      if (
        email &&
        typeof email === "string" &&
        email.includes("@") &&
        (item[isValidKey] === true || item[isValidKey] === "true")
      ) {
        leadsToUpload.push({
          ...item,
          email,
        })
        break // ✅ Only upload first valid email per item
      }
    }
  }

  if (leadsToUpload.length === 0) {
    throw new Error("No valid verified emails found for upload.")
  }

  return await instantly.addLeadsFromData(leadsToUpload)
}
