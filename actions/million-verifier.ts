"use server"

import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface EmailVerificationResult {
  email: string
  status: string
}

export async function verifyEmails(
  businessData: any[],
  apiKey?: string
): Promise<any[]> {
  const MILLION_API_KEY = apiKey || process.env.MILLION_API_KEY
  if (!MILLION_API_KEY) {
    throw new Error("Million API key is not configured")
  }

  const verifiedData = [...businessData]

  for (const item of verifiedData) {
    let isValid = false

    for (const emailField of ["email_1", "email_2", "email_3"]) {
      const email = item[emailField]

      if (email && typeof email === "string" && email.includes("@")) {
        try {
          const result = await verifyEmail(email, MILLION_API_KEY)

          if (result.status === "valid") {
            isValid = true
            console.log(`✅ Valid email: ${email}`)
            break // One valid is enough
          } else {
            console.log(`❌ Invalid email: ${email}`)
          }
        } catch (error) {
          console.error(`Error verifying email ${email}:`, error)
        }
      }
    }

    item.is_email_valid = isValid
  }

  return verifiedData
}

async function verifyEmail(email: string, apiKey: string): Promise<EmailVerificationResult> {
  const BASE_URL = "https://api.millionverifier.com/api/v3/"
  try {
    const params = new URLSearchParams({
      api: apiKey,
      email,
    })

    const response = await fetch(`${BASE_URL}?${params.toString()}`, {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    const data = await response.json()

    // Consider emails with "quality" not equal to "risky" as valid
    const quality = data.quality?.toLowerCase() || "unknown"
    const isValid = quality !== "risky" && quality !== "unknown"

    return {
      email: data.email || "unknown",
      status: isValid ? "valid" : "invalid",
    }
  } catch (error) {
    console.error("Error verifying email:", error)
    throw error
  }
}
