"use server"
interface EmailVerificationResult {
  email: string
  status: string
}
export async function verifyEmails(businessData: any[], apiKey?: string) {
  const MILLION_API_KEY = apiKey || process.env.MILLION_API_KEY
  if (!MILLION_API_KEY) {
    throw new Error("Million API key is not configured")
  }
  const verifiedData = [...businessData]
  for (const item of verifiedData) {
    // Check each email field
    for (const emailField of ["email_1", "email_2", "email_3"]) {
      const email = item[emailField]
      if (email && typeof email === "string" && email.includes("@")) {
        try {
          const result = await verifyEmail(email, MILLION_API_KEY)
          // Update the is_email_valid field based on the verification result
          if (result.status === "valid") {
            item.is_email_valid = true
          }
        } catch (error) {
          console.error(`Error verifying email ${email}:`, error)
        }
      }
    }
  }
  return verifiedData
}
async function verifyEmail(email: string, apiKey: string): Promise<EmailVerificationResult> {
  const BASE_URL = "https://api.millionverifier.com/api/v3/"
  try {
    const params = new URLSearchParams({
      api: apiKey,
      email: email,
    })
    const response = await fetch(`${BASE_URL}?${params.toString()}`, {
      cache: "no-store",
    })
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }
    const data = await response.json()
    return {
      email: data.email || "unknown",
      status: data.resultcode === 1 ? "valid" : "invalid",
    }
  } catch (error) {
    console.error("Error verifying email:", error)
    throw error
  }
}
