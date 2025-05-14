"use server"

import { verifyEmailWithMillionVerifier } from "@/lib/verify"

export async function verifyEmails(businessData: any[], apiKey?: string) {
  const MILLION_API_KEY = apiKey || process.env.MILLION_VERIFIER_KEY

  if (!MILLION_API_KEY) {
    throw new Error("Million API key is not configured")
  }

  const verifiedData = [...businessData]

  for (const item of verifiedData) {
    let isValid = false
    item.is_email_valid = false

    for (const emailField of ["email", "email_1", "email_2", "email_3"]) {
      const email = item[emailField]

      if (email && typeof email === "string" && email.includes("@")) {
        try {
          const result = await verifyEmailWithMillionVerifier(email, MILLION_API_KEY)

          if (result) {
            isValid = true
            item.is_email_valid = true
            item.email = email // ✅ critical
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
