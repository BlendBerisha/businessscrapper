"use server"

import { createClient } from "@supabase/supabase-js"
import { verifyEmailWithMillionVerifier } from "@/lib/verify"

// Supabase config (replace with actual or use env vars)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function verifyEmails(businessData: any[], apiKey?: string) {
  // Step 1: Get settings from Supabase
  const { data, error } = await supabase
  .from("settings")
  .select("value")
  .eq("key", "scrapperSettings")
  .maybeSingle()

  if (!data || !data.value?.millionApiKey) {
    console.error("❌ Million API key missing in settings row or settings row not found")
    throw new Error("Could not retrieve Million Verifier API key from Supabase")
  }
  
  const resolvedApiKey = apiKey || data.value.millionApiKey

  console.log("🔐 Using Million Verifier API Key:", resolvedApiKey)

  // Step 2: Clone and validate business data
  const verifiedData = [...businessData]

  for (const item of verifiedData) {
    item.is_email_valid = false

    for (const emailField of ["email", "email_1", "email_2", "email_3"]) {
      const email = item[emailField]

      if (email && typeof email === "string" && email.includes("@")) {
        try {
          const isValid = await verifyEmailWithMillionVerifier(email, resolvedApiKey)

          if (isValid) {
            item.is_email_valid = true
            item.email = email
            break
          }
        } catch (err) {
          console.error(`❌ Verification error for ${email}:`, err)
        }

        await new Promise((r) => setTimeout(r, 300))
      }
    }
  }

  return verifiedData
}
