"use server"

import { InstantlyCredentials } from "@/lib/instantly"
import { uploadToInstantlyVerifiedOnly } from "@/lib/instantly" // ✅ make sure this is exported properly

export async function uploadToInstantly(
  businessData: any[],
  credentials?: Partial<InstantlyCredentials>
) {
  return await uploadToInstantlyVerifiedOnly(businessData, credentials)
}
