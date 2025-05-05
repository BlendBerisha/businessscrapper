"use server"

import { verifyEmailWithMillionVerifier } from "@/lib/verify"

export async function verifyEmails(businessData: any[], _apiKey?: string) {
  // 👇 Hardcoded API key for testing (replace with your actual key)
  const MILLION_API_KEY = "3fGaHq2MM0ANeddMSRyCh3Bm1"

  if (!MILLION_API_KEY) {
    throw new Error("Million API key is not configured")
  }

  const verifiedData = [...businessData]

  for (const item of verifiedData) {
    let isValid = false
    item.is_email_valid = false // Default to false

    for (const emailField of ["email", "email_1", "email_2", "email_3"]) {
      const email = item[emailField]

      if (email && typeof email === "string" && email.includes("@")) {
        try {
          console.log("🔍 Verifying", email, "with API key:", MILLION_API_KEY)
      
          const result = await verifyEmailWithMillionVerifier(email, MILLION_API_KEY)
      
          console.log("📨 Verification response:", result)
      
          if (result) {
            isValid = true
            item.is_email_valid = true
            item.email = email // 👈 this line is crucial for Instantly

            break
          }
        } catch (error) {
          console.error(`❌ Error verifying email ${email}:`, error)
        }
      
        await new Promise((r) => setTimeout(r, 300))
      }
          }
  }

  return verifiedData
}
