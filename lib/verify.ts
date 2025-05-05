export async function verifyEmailWithMillionVerifier(email: string, apiKey: string): Promise<boolean> {
    try {
      console.log(`🔍 Verifying ${email} with API key: ${apiKey}`)
  
      const url = `https://api.millionverifier.com/api/v3/?api=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(email)}`
      const res = await fetch(url, { cache: "no-store" })
  
      const json = await res.json()
      console.log(`📨 Verification response for ${email}:`, JSON.stringify(json, null, 2))
  
      return json.resultcode === 1
    } catch (err) {
      console.error("❌ Failed to verify email:", email, err)
      return false
    }
  }
  