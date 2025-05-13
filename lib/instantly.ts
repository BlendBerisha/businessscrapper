import * as XLSX from "xlsx"

export interface InstantlyCredentials {
  apiKey: string
  listId: string
  campaignId: string
}

export class InstantlyAPI {
  private apiKey: string
  private listId: string
  private campaignId: string
  private baseUrl: string
  private headers: HeadersInit

  constructor({ apiKey, listId, campaignId }: InstantlyCredentials, baseUrl = "https://api.instantly.ai/api/v2/leads") {
    this.apiKey = apiKey
    this.listId = listId
    this.campaignId = campaignId
    this.baseUrl = baseUrl
    this.headers = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    }
  }

  private isValidEmail(email: string): boolean {
    const regex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/
    return typeof email === "string" && regex.test(email)
  }

  private cleanData(row: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {}
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === "number" && (!isFinite(value) || isNaN(value))) {
        cleaned[key] = null
      } else {
        cleaned[key] = value
      }
    }
    return cleaned
  }

  private async addLead(payload: Record<string, any>): Promise<void> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(payload),
    })

    const resText = await response.text()
    if (!response.ok) {
      throw new Error(`Failed to add lead: ${response.status} - ${resText}`)
    }
  }

  async addLeadsFromXLSX(file: File): Promise<void> {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array" })

    const sheet = workbook.Sheets["With Emails"]
    if (!sheet) {
      console.error("❌ No 'With Emails' sheet found in Excel file")
      return
    }

    const data: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet)

    const filtered = data.filter((row) => {
      const isValid = String(row.is_email_valid || "").toLowerCase() === "true"
      const email = row.email?.trim()
      return isValid && this.isValidEmail(email)
    })

    if (filtered.length === 0) {
      console.log("⚠️ No valid leads to upload.")
      return
    }

    for (const raw of filtered) {
      const row = this.cleanData(raw)
      const email = row.email
      const first_name = row.email_first_name || "Unknown"
      const last_name = row.email_last_name || "Unknown"
      const display_name = row.display_name || "N/A"

      const payload = {
        list_id: this.listId,
        campaign: this.campaignId,
        email,
        company_name: display_name,
        phone: row.phone || "N/A",
        website: row.site || "N/A",
        personalization: `Hello ${first_name}, I wanted to connect.`,
        first_name,
        last_name,
        extra_fields: {
          display_name,
          first_name,
          last_name,
          ...row,
        },
        custom_variables: {
          display_name,
          first_name,
          last_name,
          ...row,
        },
      }

      try {
        await this.addLead(payload)
        console.log(`✅ Lead added: ${email}`)
      } catch (err) {
        console.error(`❌ Failed to add lead: ${email} - ${err}`)
      }
    }
  }
}
