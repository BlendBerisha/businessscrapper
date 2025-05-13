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
    return typeof email === "string" && email.includes("@")
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

    console.log(`📥 Starting upload of ${data.length} leads to Instantly`)

    for (const item of data) {
      const email = item.email
      if (!this.isValidEmail(email)) {
        console.warn("❌ Invalid or missing email:", email)
        continue
      }

      const success = await this.addLead({
        email,
        company_name: item.display_name || "N/A",
        phone: item.phone || "N/A",
        website: item.site || "N/A",
        personalization: `Hello ${item.email_first_name || "there"}, I wanted to connect.`,
        first_name: item.email_first_name || "Unknown",
        last_name: item.email_last_name || "Unknown",
        extra_fields: {
          types: item.types,
          type: item.type,
          country_code: item.country_code,
          state: item.state,
          city: item.city,
          county: item.county,
          street: item.street,
          postal_code: item.postal_code,
          "enrich area codes": item["enrich area codes"],
          address: item.address,
          latitude: item.latitude,
          longitude: item.longitude,
          phone: item.phone,
          phone_type: item.phone_type,
          linkedin: item.linkedin,
          facebook: item.facebook,
          twitter: item.twitter,
          instagram: item.instagram,
          tiktok: item.tiktok,
          whatsapp: item.whatsapp,
          youtube: item.youtube,
          site: item.site,
          site_generator: item.site_generator,
          photo: item.photo,
          photos_count: item.photos_count,
          rating: item.rating,
          rating_history: item.rating_history,
          reviews: item.reviews,
          reviews_link: item.reviews_link,
          range: item.range,
          business_status: item.business_status,
          business_status_history: item.business_status_history,
          booking_appointment_link: item.booking_appointment_link,
          menu_link: item.menu_link,
          verified: item.verified,
          owner_title: item.owner_title,
          located_in: item.located_in,
          os_id: item.os_id,
          google_id: item.google_id,
          place_id: item.place_id,
          cid: item.cid,
          gmb_link: item.gmb_link,
          located_os_id: item.located_os_id,
          working_hours: item.working_hours,
          area_service: item.area_service,
          about: item.about,
          corp_name: item.corp_name,
          corp_employees: item.corp_employees,
          corp_revenue: item.corp_revenue,
          corp_founded_year: item.corp_founded_year,
          corp_is_public: item.corp_is_public,
          added_at: item.added_at,
          updated_at: item.updated_at,
        },
        custom_variables: {
          email_title: item.email_title,
          email_first_name: item.email_first_name,
          email_last_name: item.email_last_name,
          is_email_valid: item.is_email_valid,
        },
      })

      if (success) successful.push(email)
      else failed.push(email)
    }

    console.log(`✅ Successfully uploaded: ${successful.length}`)
    console.log(`❌ Failed uploads: ${failed.length}`)

    return { success: successful, failed }
  }
}
