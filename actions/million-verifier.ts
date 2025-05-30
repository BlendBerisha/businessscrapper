"use server"

import { createClient } from "@supabase/supabase-js"
import { verifyEmailWithMillionVerifier } from "@/lib/verify"

// Supabase config (replace with actual or use env vars)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function verifyEmails(
  data: any[],
  apiKey: string
): Promise<any[]> {
  const verified = []

  for (const entry of data) {
    const email = entry.email?.trim()
    if (!email) {
      entry.is_email_valid = false
      verified.push(entry)
      continue
    }

    try {
      const url = `https://api.millionverifier.com/api/v3/?api=${encodeURIComponent(
        apiKey
      )}&email=${encodeURIComponent(email)}`
      const res = await fetch(url)
      const result = await res.json()

      const isValid = result.quality !== "risky"

      entry.is_email_valid = isValid
      entry.email_result = result.result
      entry.email_quality = result.quality
      entry.email_resultcode = result.resultcode
    } catch (err) {
      console.error(`⚠️ Failed to verify email: ${email}`, err)
      entry.is_email_valid = false
      entry.email_result = "error"
    }

    verified.push(entry)
  }

  return verified
}
