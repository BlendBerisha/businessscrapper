"use server"

import { createClient } from "@supabase/supabase-js"
import { verifyEmailWithMillionVerifier } from "@/lib/verify"

// Supabase config (replace with actual or use env vars)
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
    item.is_email_valid = false // ✅ Initialize explicitly
    let validEmailFound = false

    for (const emailField of ["email", "email_1", "email_2", "email_3"]) {
      const email = item[emailField]

      if (email && typeof email === "string" && email.includes("@")) {
        try {
          const isValid = await verifyEmailWithMillionVerifier(email, resolvedApiKey)

          const index = emailField === "email" ? "0" : emailField.split("_")[1]
          item[`is_email_valid_${index}`] = isValid

          if (isValid && !validEmailFound) {
            item.email = email // ✅ Set main email to the first valid one
            item.is_email_valid = true
            validEmailFound = true
          } else if (!isValid) {
            item[`is_email_valid_${index}`] = false
          }

        } catch (err) {
          console.error(`❌ Verification error for ${email}:`, err)
          const index = emailField === "email" ? "0" : emailField.split("_")[1]
          item[`is_email_valid_${index}`] = false
        }

        await new Promise((r) => setTimeout(r, 300))
      }
    }
  }

  return verifiedData
}
