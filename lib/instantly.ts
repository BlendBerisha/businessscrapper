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
        return true // 🧪 Bypass validation entirely
      }
        
      private cleanData(data: Record<string, any>): Record<string, any> {
        const cleaned: Record<string, any> = {}
        for (const [key, value] of Object.entries(data)) {
          if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean" ||
            value === null
          ) {
            cleaned[key] = value
          } else if (value === undefined) {
            cleaned[key] = null
          } else {
            // Convert objects/arrays to JSON strings
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
        console.log("📧 Processing email:", email)
        
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
          extra_fields: item,
          custom_variables: { ...item },
        })
  
        if (success) successful.push(email)
        else failed.push(email)
      }
  
      console.log(`✅ Successfully uploaded: ${successful.length}`)
      console.log(`❌ Failed uploads: ${failed.length}`)
  
      return { success: successful, failed }
    }
  }
  
  