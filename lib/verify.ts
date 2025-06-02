export async function verifyEmailWithMillionVerifier(email: string, apiKey: string): Promise<boolean> {
  const res = await fetch(`https://api.millionverifier.com/api/v3/?api=${apiKey}&email=${email}`)
  const data = await res.json()

  const result = data.result?.toLowerCase?.()
  const quality = data.quality?.toLowerCase?.()

  return (
    ["ok", "valid", "catch_all"].includes(result) &&
    quality !== "risky" &&
    quality !== "unknown"
  )
}
