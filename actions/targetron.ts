"use server"

import { formatDate } from "@/lib/utils"

interface TargetronParams {
  apiKey?: string
  country: string
  city: string
  state: string
  postalCode?: string
  businessType?: string
  businessStatus: string
  limit: number
  skipTimes: number
  addedFrom: string
  addedTo: string
  withPhone: boolean
  withoutPhone: boolean
  enrichWithAreaCodes?: boolean
  phoneNumber?: string
}

export async function fetchBusinessData(params: TargetronParams) {
  const TARGETRON_API_KEY = params.apiKey || process.env.TARGETRON_API_KEY
  const TARGETRON_API_URL = "https://dahab.app.outscraper.com/data/places"

  if (!TARGETRON_API_KEY) {
    throw new Error("Targetron API key is not configured")
  }

  const allResults = []

  // Convert date strings to timestamps
  const addedFromTimestamp = formatDate(params.addedFrom)
  const addedToTimestamp = formatDate(params.addedTo)

  // Fetch data with phone if selected
  if (params.withPhone) {
    let skip = 0
    for (let i = 0; i < params.skipTimes; i++) {
      const data = await fetchData(TARGETRON_API_URL, TARGETRON_API_KEY, {
        cc: params.country,
        city: params.city,
        state: params.state,
        postalCode: params.postalCode,
        type: params.businessType?.trim() || undefined,
        limit: params.limit.toString(),
        skip: skip.toString(),
        businessStatus: params.businessStatus,
        emailAndPhone: "with_phone",
        addedFrom: addedFromTimestamp,
        addedTo: addedToTimestamp,
        enrichWithAreaCodes: params.enrichWithAreaCodes,
        phoneNumber: params.phoneNumber,
      })

      if (data && data.data) {
        allResults.push(...data.data)
        skip += params.limit
      }
    }
  }

  // Fetch data without phone if selected
  if (params.withoutPhone) {
    let skip = 0
    for (let i = 0; i < params.skipTimes; i++) {
      const data = await fetchData(TARGETRON_API_URL, TARGETRON_API_KEY, {
        cc: params.country,
        city: params.city,
        state: params.state,
        postalCode: params.postalCode,
        type: params.businessType?.trim() || undefined,
        limit: params.limit.toString(),
        skip: skip.toString(),
        businessStatus: params.businessStatus,
        emailAndPhone: "without_phone",
        addedFrom: addedFromTimestamp,
        addedTo: addedToTimestamp,
        enrichWithAreaCodes: params.enrichWithAreaCodes,
      })

      if (data && data.data) {
        allResults.push(...data.data)
        skip += params.limit
      }
    }
  }

  return allResults
}

async function fetchData(url: string, apiKey: string, params: Record<string, string | number | boolean | undefined>) {
  const headers = { "X-API-KEY": apiKey }

  try {
    const queryParams = new URLSearchParams()

    // Add all params to the query string
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Convert boolean to string
        if (typeof value === "boolean") {
          queryParams.append(key, value ? "true" : "false")
        } else {
          queryParams.append(key, value.toString())
        }
      }
    })

    const response = await fetch(`${url}?${queryParams.toString()}`, {
      headers,
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching data:", error)
    throw error
  }
}

