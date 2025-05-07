import { Handler } from "@netlify/functions"

const handler: Handler = async (event) => {
  const fileName = event.queryStringParameters?.file
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!fileName || !SUPABASE_URL) {
    return { statusCode: 400, body: "Missing file parameter or Supabase URL" }
  }

  const redirectUrl = `${SUPABASE_URL}/storage/v1/object/public/scrapes/${fileName}`

  return {
    statusCode: 302,
    headers: {
      Location: redirectUrl,
    },
  }
}

export { handler }
