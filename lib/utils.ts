import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import * as XLSX from "xlsx"
import { supabase } from "@/lib/supabase"
// Function to safely check if we're in a browser environment
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

// Load and parse enrich area codes Excel
let enrichAreaCodeMap: Record<string, string> = {}

// Load the enrich area codes from a static public file
export async function loadEnrichAreaCodesFromURL(url: string = "/enrich-area-codes.xlsx"): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to load enrich file: ${response.statusText}`)

  const arrayBuffer = await response.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: "array" })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet)

  enrichAreaCodeMap = {}

  for (const row of jsonData) {
    const postcodeRaw = String(row["postcode"] || "").split(" ")[0].trim().toUpperCase()
    const areaCode = String(row["telephone area code"] || "").trim()
    if (postcodeRaw && areaCode) {
      enrichAreaCodeMap[postcodeRaw] = areaCode
    }
  }

  console.log("✅ Enrich map loaded with", Object.keys(enrichAreaCodeMap).length, "entries")
}

// Converts JSON and downloads enriched Excel with email separation
export function convertJsonToCsv(jsonData: any[], filename: string) {
  if (!isBrowser()) return

  const columnOrder = [
    "display_name", "types", "type", "country_code", "state", "city", "county", "street", "postal_code",
    "enrich area codes", "address", "latitude", "longitude", "phone", "phone_type",
    "linkedin", "facebook", "twitter", "instagram", "tiktok", "whatsapp", "youtube", "site",
    "site_generator", "photo", "photos_count", "rating", "rating_history", "reviews",
    "reviews_link", "range", "business_status", "business_status_history", "booking_appointment_link",
    "menu_link", "verified", "owner_title", "located_in", "os_id", "google_id", "place_id",
    "cid", "gmb_link", "located_os_id", "working_hours", "area_service", "about",
    "corp_name", "corp_employees", "corp_revenue", "corp_founded_year", "corp_is_public",
    "added_at", "updated_at", "email", "email_title", "email_first_name", "email_last_name", "is_email_valid"
  ]

  const { withEmails, withoutEmails } = separateEmailData(jsonData)

  const workbook = XLSX.utils.book_new()

  if (withEmails.length > 0) {
    const sheet = createWorksheet(withEmails, columnOrder)
    applyFormatting(sheet, columnOrder)
    XLSX.utils.book_append_sheet(workbook, sheet, "With Emails")
  }

  if (withoutEmails.length > 0) {
    const sheet = createWorksheet(withoutEmails, columnOrder)
    applyFormatting(sheet, columnOrder)
    XLSX.utils.book_append_sheet(workbook, sheet, "No Emails")
  }

  const excelFilename = filename.endsWith(".xlsx")
    ? filename
    : filename.endsWith(".csv")
      ? filename.replace(".csv", ".xlsx")
      : filename + ".xlsx"

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = excelFilename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return blob
}

function separateEmailData(jsonData: any[]): { withEmails: any[], withoutEmails: any[] } {
  const withEmails: any[] = []
  const withoutEmails: any[] = []
  const seenEmails = new Set<string>()

  const emailGroups = [
    ["email_1", "email_1_title", "email_1_first_name", "email_1_last_name"],
    ["email_2", "email_2_title", "email_2_first_name", "email_2_last_name"],
    ["email_3", "email_3_title", "email_3_first_name", "email_3_last_name"],
  ]

  for (const entry of jsonData) {
    const entryCopy = { ...entry }

    // Enrich area codes based on postal code
    const rawPostal = entryCopy.postal_code || ""
    const postalKey = String(rawPostal).split(" ")[0].toUpperCase().trim()
    entryCopy["enrich area codes"] = enrichAreaCodeMap[postalKey] || ""
    
    entryCopy.is_email_valid = entryCopy.is_email_valid || "FALSE"

    if (entryCopy.phone) {
      const phoneStr = String(entryCopy.phone)
      entryCopy.phone = phoneStr.startsWith("'") ? phoneStr : `'${phoneStr}`
    }

    let hasEmail = false
    for (const [emailKey, titleKey, firstNameKey, lastNameKey] of emailGroups) {
      const emailValue = entryCopy[emailKey]
      if (emailValue && typeof emailValue === "string" && !seenEmails.has(emailValue)) {
        seenEmails.add(emailValue)
        hasEmail = true
        const newRow = { ...entryCopy }
        newRow.email = emailValue
        newRow.email_title = entryCopy[titleKey] || ""
        newRow.email_first_name = entryCopy[firstNameKey] || ""
        newRow.email_last_name = entryCopy[lastNameKey] || ""
        emailGroups.forEach(group => group.forEach(key => delete newRow[key]))
        withEmails.push(newRow)
      }
    }

    if (!hasEmail) {
      emailGroups.forEach(group => group.forEach(key => delete entryCopy[key]))
      entryCopy.email = ""
      entryCopy.email_title = ""
      entryCopy.email_first_name = ""
      entryCopy.email_last_name = ""
      withoutEmails.push(entryCopy)
    }
  }

  return { withEmails, withoutEmails }
}

function createWorksheet(data: any[], columnOrder: string[]): XLSX.WorkSheet {
  const worksheetData = data.map(item => {
    const row: any = {}
    for (const column of columnOrder) {
      let value = item[column]
      if (value === null || value === undefined) value = ""
      if (
        column === "is_email_valid" || column === "verified" || column === "area_service" || column === "corp_is_public"
      ) {
        if (typeof value === "boolean") value = value ? "TRUE" : "FALSE"
      }
      if (typeof value === "object") value = JSON.stringify(value)
      row[column] = value
    }
    return row
  })
  return XLSX.utils.json_to_sheet(worksheetData, { header: columnOrder })
}

function applyFormatting(worksheet: XLSX.WorkSheet, columnOrder: string[]): void {
  worksheet["!cols"] = columnOrder.map(col => ({ wch: Math.max(col.length, 15) }))
  const phoneIndex = columnOrder.indexOf("phone")
  if (phoneIndex !== -1) {
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1")
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: phoneIndex })
      const cell = worksheet[cellAddress]
      if (cell) {
        cell.t = "s"
        if (cell.v && typeof cell.v === "string" && !cell.v.startsWith("'")) {
          cell.v = "'" + cell.v
        }
      }
    }
  }
}

export async function fetchRecurringSchedules() {
  const { data: recurring } = await supabase
    .from("recurring_scrapes")
    .select("*")

  const { data: queued } = await supabase
    .from("scrape_queue")
    .select("*")
    .not("status", "in", '("completed", "failed", "no_results")')

  const recurringFormatted = (recurring || []).map((r) => ({
    ...r,
    source: "recurring",
  }))

  const queuedFormatted = (queued || []).map((q) => ({
    ...q,
    date: q.created_at,
    recurring_days: [],
    hour: null,
    minute: null,
    source: "queued",
  }))

  return [...recurringFormatted, ...queuedFormatted]
}

export async function verifyEmailsInXlsxFile(file: File, apiKey: string): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: "array" })

  const withEmailsSheet = workbook.Sheets["With Emails"]
  const noEmailsSheet = workbook.Sheets["No Emails"]

  const dfWith: any[] = withEmailsSheet ? XLSX.utils.sheet_to_json(withEmailsSheet) : []
  const dfNo: any[] = noEmailsSheet ? XLSX.utils.sheet_to_json(noEmailsSheet) : []

  for (let i = 0; i < dfWith.length; i++) {
    const row = dfWith[i]
    const email = row["email"]?.trim()

    if (email) {
      try {
        const result = await verifyEmailViaRoute(email, apiKey)
        row["is_email_valid"] = result?.status === "valid"
      } catch (err) {
        console.error(`❌ Verification failed for ${email}`, err)
        row["is_email_valid"] = false
      }
    } else {
      row["is_email_valid"] = false
    }
  }

  if (dfNo.length > 0) {
    dfNo.forEach(row => {
      row["is_email_valid"] = false
    })
  }

  const newWorkbook = XLSX.utils.book_new()

  if (dfWith.length > 0) {
    const sheet = XLSX.utils.json_to_sheet(dfWith)
    XLSX.utils.book_append_sheet(newWorkbook, sheet, "With Emails")
  }

  if (dfNo.length > 0) {
    const sheet = XLSX.utils.json_to_sheet(dfNo)
    XLSX.utils.book_append_sheet(newWorkbook, sheet, "No Emails")
  }

  const buffer = XLSX.write(newWorkbook, { bookType: "xlsx", type: "array" })
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}
async function verifyEmailViaRoute(email: string, apiKey: string): Promise<{ status: string }> {
  const res = await fetch("/api/verify-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, apiKey }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Backend error: ${err}`)
  }

  return await res.json()
}
