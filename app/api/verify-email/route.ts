export async function POST(req: Request) {
    try {
      const { email, apiKey } = await req.json()
  
      if (!email || !apiKey) {
        return new Response(JSON.stringify({ error: "Missing email or API key" }), { status: 400 })
      }
  
      const response = await fetch("https://api.millionverifier.com/api/v3/email-verifier", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ email }),
      })
  
      if (!response.ok) {
        const errorText = await response.text()
        return new Response(JSON.stringify({ error: `Verification failed: ${errorText}` }), { status: 500 })
      }
  
      const data = await response.json()
      return new Response(JSON.stringify(data), { status: 200 })
    } catch (err) {
      console.error("❌ Error verifying email:", err)
      return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 })
    }
  }
  