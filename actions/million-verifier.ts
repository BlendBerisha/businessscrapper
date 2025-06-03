"use server"

import { createClient } from "@supabase/supabase-js"
import { verifyEmailWithMillionVerifier } from "@/lib/verify"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function verifyEmails(businessData: any[], apiKey?: string) {
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

  const verifiedData = [...businessData]

  for (const item of verifiedData) {
    item.is_email_valid = false
    let hasValidEmail = false

    for (const emailField of ["email", "email_1", "email_2", "email_3"]) {
      const email = item[emailField]

      if (email && typeof email === "string" && email.includes("@")) {
        try {
          const isValid = await verifyEmailWithMillionVerifier(email, resolvedApiKey)
          item[`is_${emailField}_valid`] = isValid

          if (isValid && !hasValidEmail) {
            hasValidEmail = true
            item.email = email
          }
        } catch (err) {
          console.error(`❌ Verification error for ${email}:`, err)
          item[`is_${emailField}_valid`] = false
        }

        // Optional delay to avoid rate-limiting
        await new Promise((r) => setTimeout(r, 300))
      }
    }

    item.is_email_valid = hasValidEmail
  }

  return verifiedData
}
