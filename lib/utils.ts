import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import * as XLSX from "xlsx"
import { supabase } from "@/lib/supabase"

// Utility
const isBrowser = () => typeof window !== "undefined"
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function formatDate(dateString: string): number {
  const date = new Date(dateString)
  return Math.floor(date.getTime() / 1000)
}
export function downloadJsonAsFile(data: any, filename: string) {
  if (!isBrowser()) return
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

let enrichAreaCodeMap: Record<string, string> = {}
export async function loadEnrichAreaCodesFromURL(url: string = "/enrich-area-codes.xlsx"): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to load enrich file: ${response.statusText}`)
  const arrayBuffer = await response.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: "array" })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const jsonData: any[] = XLSX.utils.sheet_to_json(sheet)
  enrichAreaCodeMap = {}
  for (const row of jsonData) {
    const postcode = String(row["postcode"] || "").split(" ")[0].trim().toUpperCase()
    const areaCode = String(row["telephone area code"] || "").trim()
    if (postcode && areaCode) enrichAreaCodeMap[postcode] = areaCode
  }
  console.log("✅ Enrich map loaded with", Object.keys(enrichAreaCodeMap).length, "entries")
}

export async function exportDataWithEmailVerification(jsonData: any[], apiKey: string) {
  if (!isBrowser()) return
  const columnOrder = [
    "display_name", "types", "type", "country_code", "state", "city", "county", "street", "postal_code",
    "enrich area codes", "address", "latitude", "longitude", "phone", "phone_type", "linkedin", "facebook",
    "twitter", "instagram", "tiktok", "whatsapp", "youtube", "site", "site_generator", "photo", "photos_count",
    "rating", "rating_history", "reviews", "reviews_link", "range", "business_status", "business_status_history",
    "booking_appointment_link", "menu_link", "verified", "owner_title", "located_in", "os_id", "google_id",
    "place_id", "cid", "gmb_link", "located_os_id", "working_hours", "area_service", "about", "corp_name",
    "corp_employees", "corp_revenue", "corp_founded_year", "corp_is_public", "added_at", "updated_at",
    "email", "email_title", "email_first_name", "email_last_name", "is_email_valid"
  ]

  const { withEmails, withoutEmails } = separateEmailData(jsonData)
  for (const row of withEmails) {
    const result = await verifyEmailViaRoute(row.email, apiKey)
    row.is_email_valid = ["ok", "valid", "catch_all"].includes(result.result?.toLowerCase?.()) &&
                         result.quality?.toLowerCase?.() !== "risky"
    row.email_result = result.result
    row.email_quality = result.quality
    row.email_resultcode = result.resultcode
  }

  const fullWorkbook = XLSX.utils.book_new()
  if (withEmails.length > 0) XLSX.utils.book_append_sheet(fullWorkbook, createWorksheet(withEmails, columnOrder), "With Emails")
  if (withoutEmails.length > 0) XLSX.utils.book_append_sheet(fullWorkbook, createWorksheet(withoutEmails, columnOrder), "No Emails")
  const fullBlob = XLSX.write(fullWorkbook, { bookType: "xlsx", type: "array" })
  triggerDownload(fullBlob, "full_data.xlsx")

  const emailsOnly = withEmails.map(row => ({
    email: row.email,
    email_title: row.email_title,
    email_first_name: row.email_first_name,
    email_last_name: row.email_last_name,
    is_email_valid: row.is_email_valid,
    email_result: row.email_result,
    email_quality: row.email_quality,
    email_resultcode: row.email_resultcode,
  }))
  const emailWorkbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(emailWorkbook, XLSX.utils.json_to_sheet(emailsOnly), "Verified Emails")
  const emailBlob = XLSX.write(emailWorkbook, { bookType: "xlsx", type: "array" })
  triggerDownload(emailBlob, "emails_verified.xlsx")
}

function triggerDownload(blobArrayBuffer: ArrayBuffer, filename: string) {
  const blob = new Blob([blobArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function separateEmailData(jsonData: any[]) {
  const withEmails: any[] = []
  const withoutEmails: any[] = []
  const seenEmails = new Set<string>()
  const emailGroups = [
    ["email_1", "email_1_title", "email_1_first_name", "email_1_last_name"],
    ["email_2", "email_2_title", "email_2_first_name", "email_2_last_name"],
    ["email_3", "email_3_title", "email_3_first_name", "email_3_last_name"],
  ]

  for (const entry of jsonData) {
    const copy = { ...entry }
    const postalKey = String(copy.postal_code || "").split(" ")[0].toUpperCase().trim()
    copy["enrich area codes"] = enrichAreaCodeMap[postalKey] || ""
    if (copy.phone) copy.phone = String(copy.phone).startsWith("'") ? copy.phone : `'${copy.phone}`

    let hasEmail = false
    for (const [emailKey, titleKey, firstNameKey, lastNameKey] of emailGroups) {
      const email = copy[emailKey]
      if (email && typeof email === "string" && !seenEmails.has(email)) {
        seenEmails.add(email)
        hasEmail = true
        const row = {
          ...copy,
          email,
          email_title: copy[titleKey] || "",
          email_first_name: copy[firstNameKey] || "",
          email_last_name: copy[lastNameKey] || "",
          is_email_valid: copy.is_email_valid ?? false,
        }
        emailGroups.forEach(group => group.forEach(key => delete row[key]))
        withEmails.push(row)
      }
    }

    if (!hasEmail) {
      emailGroups.forEach(group => group.forEach(key => delete copy[key]))
      copy.email = ""
      copy.email_title = ""
      copy.email_first_name = ""
      copy.email_last_name = ""
      copy.is_email_valid = false
      withoutEmails.push(copy)
    }
  }
  return { withEmails, withoutEmails }
}

function createWorksheet(data: any[], columns: string[]): XLSX.WorkSheet {
  const rows = data.map(item => {
    const row: any = {}
    for (const col of columns) {
      let val = item[col]
      if (val === null || val === undefined) val = ""
      if (["is_email_valid", "verified", "area_service", "corp_is_public"].includes(col) && typeof val === "boolean") {
        val = val ? "TRUE" : "FALSE"
      }
      if (typeof val === "object") val = JSON.stringify(val)
      row[col] = val
    }
    return row
  })
  return XLSX.utils.json_to_sheet(rows, { header: columns })
}

async function verifyEmailViaRoute(email: string, apiKey: string) {
  const res = await fetch("/api/verify-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, apiKey }),
  })
  const result = await res.json()
  if (!res.ok || !result?.status) throw new Error("Invalid response from email verification API")
  return result
}

export async function fetchRecurringSchedules() {
  const { data: recurring } = await supabase.from("recurring_scrapes").select("*")
  const { data: queued } = await supabase.from("scrape_queue").select("*").not("status", "in", '("completed", "failed", "no_results")')
  const recurringFormatted = (recurring || []).map(r => ({ ...r, source: "recurring" }))
  const queuedFormatted = (queued || []).map(q => ({
    ...q,
    date: q.created_at,
    recurring_days: [],
    hour: null,
    minute: null,
    source: "queued"
  }))
  return [...recurringFormatted, ...queuedFormatted]
}

export function getNormalizedColumn(row: Record<string, any>, targetKey: string) {
  const matchKey = Object.keys(row).find(k => k.trim().toLowerCase() === targetKey.trim().toLowerCase())
  return matchKey ? row[matchKey] : ""
}
