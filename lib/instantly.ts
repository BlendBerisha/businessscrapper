export interface InstantlyCredentials {
  apiKey: string
  listId: string
  campaignId: string
}

export interface LeadData {
  email: string
  company_name?: string
  phone?: string
  website?: string
  personalization?: string
  first_name?: string
  last_name?: string
  extra_fields?: Record<string, any>
  custom_variables?: Record<string, any>
}

export class InstantlyAPI {
  private apiKey: string
  private listId: string
  private campaignId: string
  private baseUrl: string
  private headers: HeadersInit

  constructor(
    { apiKey, listId, campaignId }: InstantlyCredentials,
    baseUrl = "https://api.instantly.ai/api/v2/leads"
  ) {
    this.apiKey = apiKey
    this.listId = listId
    this.campaignId = campaignId
    this.baseUrl = baseUrl
    this.headers = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    }

    console.log("📦 Instantly API initialized with:")
    console.log("🔑 API Key:", this.apiKey)
    console.log("📋 List ID:", this.listId)
    console.log("📣 Campaign ID:", this.campaignId)
  }

  private isValidEmail(email: any): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return typeof email === "string" && emailRegex.test(email)
  }
  
  private cleanData(data: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {}

    for (const [key, value] of Object.entries(data)) {
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        (typeof value === "number" && !isFinite(value))
      ) {
        continue // Skip empty, null, undefined, or NaN values
      }

      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        cleaned[key] = value
      } else {
        cleaned[key] = JSON.stringify(value)
      }
    }

    return cleaned
  }

  async addLead({
    email,
    company_name = "N/A",
    phone = "N/A",
    website = "N/A",
    personalization = `Hello there, I wanted to connect.`,
    first_name = "Unknown",
    last_name = "Unknown",
    extra_fields = {},
    custom_variables = {},
  }: LeadData): Promise<boolean> {
    if (!this.isValidEmail(email)) return false

    const cleanedExtra = this.cleanData({
      display_name: company_name,
      first_name,
      last_name,
      ...extra_fields,
    })

    const cleanedCustom = this.cleanData({
      display_name: company_name,
      first_name,
      last_name,
      ...custom_variables,
    })

    const leadPayload = {
      list_id: this.listId,
      campaign: this.campaignId,
      email,
      company_name,
      phone,
      website,
      personalization,
      first_name,
      last_name,
      extra_fields: cleanedExtra,
      custom_variables: cleanedCustom,
    }

    console.log("📨 Sending lead to Instantly:", leadPayload)

    const res = await fetch(this.baseUrl, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(leadPayload),
    })

    const resText = await res.clone().text()
    console.log("📨 Instantly response:", res.status, resText)

    if (!res.ok) {
      console.error(`❌ Failed to upload lead ${email}: ${res.status} - ${resText}`)
      return false
    }

    return true
  }

  async addLeadsFromData(data: any[]): Promise<{ success: string[]; failed: string[] }> {
    const successful: string[] = []
    const failed: string[] = []
    const seenEmails = new Set<string>()
  
    const emailGroups = [
      ["email_1", "email_1_title", "email_1_first_name", "email_1_last_name"],
      ["email_2", "email_2_title", "email_2_first_name", "email_2_last_name"],
      ["email_3", "email_3_title", "email_3_first_name", "email_3_last_name"],
    ]
  
    console.log(`📥 Uploading multiple emails per row. Total records: ${data.length}`)
  
    for (const item of data) {
      for (const [emailKey, titleKey, firstNameKey, lastNameKey] of emailGroups) {
        const email = item[emailKey]?.trim()
  
        if (!email || !this.isValidEmail(email) || seenEmails.has(email)) {
          continue
        }
  
        seenEmails.add(email)
  
        const success = await this.addLead({
          email,
          company_name: item.display_name || "N/A",
          phone: item.phone || "N/A",
          website: item.site || "N/A",
          personalization: `Hello ${item[firstNameKey] || "there"}, I wanted to connect.`,
          first_name: item[firstNameKey] || "Unknown",
          last_name: item[lastNameKey] || "Unknown",
          extra_fields: {
            ...item,
          },
          custom_variables: {
            email_title: item[titleKey] || "",
            email_first_name: item[firstNameKey] || "",
            email_last_name: item[lastNameKey] || "",
            is_email_valid: item.is_email_valid,
          },
        })
  
        if (success) {
          successful.push(email)
        } else {
          failed.push(email)
        }
      }
    }
  
    console.log(`✅ Uploaded: ${successful.length}, ❌ Failed: ${failed.length}`)
    return { success: successful, failed }
  }
    
}
