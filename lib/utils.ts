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

// Enrich Area Codes
let enrichAreaCodeMap: Record<string, string> = {}
export async function loadEnrichAreaCodesFromURL(url: string): Promise<Record<string, string>> {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to load enrich-area-codes.xlsx")

  const arrayBuffer = await res.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: "array" })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet)

  const map: Record<string, string> = {}
  rows.forEach((row: any) => {
    const postcode = (row["postcode"] || "").toString().split(" ")[0].trim().toUpperCase()
    const areaCode = (row["telephone area code"] || "").toString().trim()
    if (postcode && areaCode) {
      map[postcode] = areaCode
    }
  })

  return map
}


// XLSX Export
export function convertJsonToCsv(jsonData: any[], filename: string) {
  if (!isBrowser()) return

  const columnOrder = [
    "display_name", "types", "type", "country_code", "state", "city", "county", "street", "postal_code",
    "enrich_area_codes", "address", "latitude", "longitude", "phone", "phone_type", "linkedin", "facebook", "twitter",
    "instagram", "tiktok", "whatsapp", "youtube", "site", "site_generator", "photo", "photos_count", "rating",
    "rating_history", "reviews", "reviews_link", "range", "business_status", "business_status_history",
    "booking_appointment_link", "menu_link", "verified", "owner_title", "located_in", "os_id", "google_id", "place_id",
    "cid", "gmb_link", "located_os_id", "working_hours", "area_service", "about", "corp_name", "corp_employees",
    "corp_revenue", "corp_founded_year", "corp_is_public", "added_at", "updated_at", "email", "email_title",
    "email_first_name", "email_last_name", "is_email_valid"
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
  if (withEmails.length === 0 && withoutEmails.length === 0) {
    const sheet = XLSX.utils.aoa_to_sheet([["No data available"]])
    XLSX.utils.book_append_sheet(workbook, sheet, "No Data")
  }

  const finalName = filename.endsWith(".xlsx") ? filename : filename.replace(/\.csv$/, "") + ".xlsx"
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = finalName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return blob
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

function applyFormatting(sheet: XLSX.WorkSheet, columns: string[]): void {
  sheet["!cols"] = columns.map(col => ({ wch: Math.max(col.length, 15) }))
  const phoneIndex = columns.indexOf("phone")
  if (phoneIndex !== -1) {
    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1")
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const cellAddr = XLSX.utils.encode_cell({ r: row, c: phoneIndex })
      const cell = sheet[cellAddr]
      if (cell) {
        cell.t = "s"
        if (typeof cell.v === "string" && !cell.v.startsWith("'")) {
          cell.v = `'${cell.v}`
        }
      }
    }
  }
}

// Email Verification Integration
export async function verifyEmailsInXlsxFile(file: File, apiKey: string): Promise<Blob> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: "array" })
  const sheetWith = workbook.Sheets["With Emails"]
  const sheetNo = workbook.Sheets["No Emails"]

  const dfWith = sheetWith ? XLSX.utils.sheet_to_json<any>(sheetWith) : []
  const dfNo = sheetNo ? XLSX.utils.sheet_to_json<any>(sheetNo) : []

  for (const row of dfWith) {
    const email = row.email?.trim()
    if (email) {
      try {
        const result = await verifyEmailViaRoute(email, apiKey)
        row.is_email_valid = ["ok", "valid", "catch_all"].includes(result.result?.toLowerCase?.()) && result.quality?.toLowerCase?.() !== "risky"
        row.email_result = result.result
        row.email_quality = result.quality
        row.email_resultcode = result.resultcode
        console.log("📧 Verified", email, "→", result.quality, "→ is_email_valid =", row.is_email_valid)
      } catch (err) {
        console.error("❌ Error verifying", email, err)
        row.is_email_valid = false
      }
    } else {
      row.is_email_valid = false
    }
  }

  dfNo.forEach(row => row.is_email_valid = false)

  const newWorkbook = XLSX.utils.book_new()
  if (dfWith.length > 0) XLSX.utils.book_append_sheet(newWorkbook, XLSX.utils.json_to_sheet(dfWith), "With Emails")
  if (dfNo.length > 0) XLSX.utils.book_append_sheet(newWorkbook, XLSX.utils.json_to_sheet(dfNo), "No Emails")

  const buffer = XLSX.write(newWorkbook, { bookType: "xlsx", type: "array" })
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}

interface EmailVerificationResult {
  status: string
  result: string
  quality: string
  resultcode: number
  free: boolean
  role: boolean
  email: string
}
async function verifyEmailViaRoute(email: string, apiKey: string): Promise<EmailVerificationResult> {
  const res = await fetch("/api/verify-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, apiKey }),
  })
  const result = await res.json()
  if (!res.ok || !result?.status) throw new Error("Invalid response from email verification API")
  return result
}

// For displaying recurring jobs in UI
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


export async function convertAndVerifyJson(
  jsonData: any[],
  apiKey: string,
  jsonFileName = "business-verified-clean.json",
  xlsxFileName = "business-verified-clean.xlsx"
) {
  if (typeof window === "undefined") return []
  const { withEmails, withoutEmails } = separateEmailData(jsonData)
  const workbook = XLSX.utils.book_new()
  const batchSize = 25
  const verifiedResults: { email: string; is_email_valid: boolean }[] = []
  let i = 0
  const startTime = Date.now()
  while (i < withEmails.length) {
    const rowBatch = withEmails.slice(i, i + batchSize)
    const emailsToVerify = rowBatch
      .map(row => (row.email as string)?.trim())
      .filter(email => email && email.includes("@"))
    try {
      const res = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: emailsToVerify, apiKey }),
      })
      const result: { email: string; is_email_valid: boolean }[] = await res.json()
      if (Array.isArray(result)) {
        verifiedResults.push(...result)
      } else {
        console.warn(":x: Unexpected batch result format", result)
        emailsToVerify.forEach(email =>
          verifiedResults.push({ email, is_email_valid: false })
        )
      }
    } catch (err) {
      console.error(":x: Error verifying batch:", err)
      emailsToVerify.forEach(email =>
        verifiedResults.push({ email, is_email_valid: false })
      )
    }
    i += batchSize
    // Stop loop if time limit exceeded (~9.5s)
    if (Date.now() - startTime > 9500) {
      console.warn(":hourglass_flowing_sand: Execution nearing timeout in browser, stopping verification loop early.")
      break
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  const validationMap = Object.fromEntries(
    verifiedResults.map(({ email, is_email_valid }) => [email.toLowerCase(), is_email_valid])
  )
const updatedWithEmails = withEmails.map((entry) => {
  const copy = { ...entry }
  const email = (copy.email as string)?.toLowerCase?.() ?? ""

  const postalKey = String(copy.postal_code || "").split(" ")[0].toUpperCase().trim()
  copy["enrich area codes"] = enrichAreaCodeMap[postalKey] || ""
  copy.is_email_valid = validationMap[email] ?? false

  return copy
})

  // :white_check_mark: Save to Supabase for server-side full verification later
  try {
    const { error } = await supabase.from("saved_json").insert([
      {
        json_data: updatedWithEmails,
        verified: false,
        created_at: new Date().toISOString(),
      },
    ])
    if (error) console.error(":x: Supabase insert in convertAndVerifyJson failed:", error.message)
  } catch (err) {
    console.error(":x: Supabase insert threw error:", err)
  }
  // :white_check_mark: XLSX generation
  if (updatedWithEmails.length > 0) {
    const sheetWith = XLSX.utils.json_to_sheet(updatedWithEmails)
    XLSX.utils.book_append_sheet(workbook, sheetWith, "With Emails")
  }
  if (withoutEmails.length > 0) {
    const sheetNo = XLSX.utils.json_to_sheet(withoutEmails)
    XLSX.utils.book_append_sheet(workbook, sheetNo, "No Emails")
  }
  if (updatedWithEmails.length === 0 && withoutEmails.length === 0) {
    const sheetEmpty = XLSX.utils.aoa_to_sheet([["No data available"]])
    XLSX.utils.book_append_sheet(workbook, sheetEmpty, "No Data")
  }
  // :white_check_mark: Create XLSX Blob
  const xlsxBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
  const xlsxBlob = new Blob([xlsxBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  // :white_check_mark: Upload XLSX to Supabase
  const finalName = xlsxFileName.endsWith(".xlsx") ? xlsxFileName : `${xlsxFileName}.xlsx`
  const { error: uploadError } = await supabase.storage
    .from("scrapes")
    .upload(finalName, xlsxBlob, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: true,
    })
  let fileUrl: string | null = null
  fileUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/scrapes/${finalName}`
  if (uploadError) {
    console.warn(":warning: Upload may have failed, but assuming file already exists.")
  } else {
    console.error(":x: XLSX upload failed:", uploadError)
  }
  // :white_check_mark: Notify Slack
  if (fileUrl) {
    try {
      await fetch("/api/notify-slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `✅ Manual verification complete.\n📎 [Download XLSXXX](${fileUrl}) – ${updatedWithEmails.length} rows.`,
          rows: updatedWithEmails, // 👈 send the data here
        }),
      })
          } catch (err) {
      console.error(":x: Slack notification failed:", err)
    }
  }
  // :white_check_mark: Trigger browser download
  const xlsxUrl = URL.createObjectURL(xlsxBlob)
  const a1 = document.createElement("a")
  a1.href = xlsxUrl
  a1.download = finalName
  document.body.appendChild(a1)
  a1.click()
  document.body.removeChild(a1)
  URL.revokeObjectURL(xlsxUrl)
  // :white_check_mark: JSON download
  const jsonBlob = new Blob([JSON.stringify(updatedWithEmails, null, 2)], {
    type: "application/json",
  })
  const jsonUrl = URL.createObjectURL(jsonBlob)
  const a2 = document.createElement("a")
  a2.href = jsonUrl
  a2.download = jsonFileName.endsWith(".json") ? jsonFileName : `${jsonFileName}.json`
  document.body.appendChild(a2)
  a2.click()
  document.body.removeChild(a2)
  URL.revokeObjectURL(jsonUrl)
  return updatedWithEmails
}





