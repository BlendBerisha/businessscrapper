"use client"

import type React from "react"

import { ReactNode, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { fetchBusinessData } from "@/actions/targetron"
import { verifyEmails } from "@/actions/million-verifier"
import { uploadToInstantly } from "@/actions/instantly"
import { sendTelegramMessage, sendTelegramFile } from "@/actions/telegram"
import { SettingsDialog } from "@/components/settings-dialog"
import { Loader2, Calendar, Settings, Plus, FileJson, FileSpreadsheet, Download } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { saveSettings, loadSettings } from "@/lib/settings-storage"
import { downloadJsonAsFile, convertJsonToCsv } from "@/lib/utils"
import { loadEnrichAreaCodesFromURL } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { fetchRecurringSchedules } from "@/lib/utils" // adjust path
import { useRouter } from "next/navigation"
import { useUser } from "@/lib/useUser"

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { user, loading } = useUser()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading || !user) return <p>Loading...</p>

  return <>{children}</>
}


// Default form data without date-specific values
const defaultFormData = {
  // API Keys and IDs
  targetronApiKey: "",
  telegramBotToken: "",
  telegramChatId: "",
  millionApiKey: "",
  instantlyApiKey: "",
  instantlyListId: "",
  instantlyCampaignId: "",

  // Scraping Parameters
  scrapeType: "profiles",
  fromDate: "",
  toDate: "",
  country: "US",
  city: "New York",
  state: "NY",
  postalCode: "",
  businessType: "restaurant",
  businessStatus: "operational",
  limit: 10,
  skipTimes: 1,

  // Phone and Email Options
  phoneFilter: "both", // "with_phone", "without_phone", "both", or "enter_phone"
  phoneNumber: "",     // optional input for "enter_phone" filter
  verifyEmails: true,
  enrichWithAreaCodes: false,

  // Output Options
  jsonFileName: "business_data.json",
  csvFileName: "business_data.csv",
  addtocampaign: false,

  // Additional Settings
  connectColdEmail: false,
  connectEmailVerification: true,
}

export function BusinessScraperForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [formData, setFormData] = useState(defaultFormData)
  const [isClient, setIsClient] = useState(false)
  const [businessData, setBusinessData] = useState<any[]>([])
  const [hasData, setHasData] = useState(false)

  // Set isClient to true when component mounts (client-side only)
  useEffect(() => {
    setIsClient(true)

    const today = new Date().toISOString().split("T")[0]
    setFormData((prev) => ({
      ...prev,
      fromDate: today,
      toDate: today,
    }))

    const savedSettings = loadSettings()
    if (savedSettings) {
      setFormData((prev) => ({ ...prev, ...savedSettings }))
    }

    // 🔁 Load area codes automatically
    if (formData.enrichWithAreaCodes) {
      loadEnrichAreaCodesFromURL()
        .then(() => console.log("Enrich area codes loaded"))
        .catch((err) => console.error("Failed to load area codes", err))
    }
  }, [])

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value }
      // Save settings when they change, but only on client side
      if (isClient) {
        saveSettings(newData)
      }
      return newData
    })
  }
  const handleQueueScrape = async () => {
    const newJob = {
      created_at: new Date().toISOString(),
      status: "pending",
      record_limit: formData.limit,
      skip_times: formData.skipTimes,
      add_to_campaign: formData.addtocampaign,
      city: formData.city,
      state: formData.state,
      country: formData.country,
      postal_code: formData.postalCode,
      business_type: formData.businessType,
      business_status: formData.businessStatus,
      from_date: formData.fromDate,
      to_date: formData.toDate,
      phone_filter: formData.phoneFilter,
      phone_number: formData.phoneNumber,
      verify_emails: formData.verifyEmails,
      enrich_with_area_codes: formData.enrichWithAreaCodes,
      json_file_name: formData.jsonFileName,
      csv_file_name: formData.csvFileName,
    }
  
    const { error } = await supabase.from("scrape_queue").insert([newJob])
  
    if (error) {
      toast({
        title: "Failed to add scrape job",
        description: error.message,
        variant: "destructive",
      })
      return
    }
  
    toast({
      title: "Scrape job queued",
      description: "Now running scrape...",
      variant: "default",
    })
  
    // 🔁 Start scraping immediately
    document.querySelector("form")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }))
  }
    

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  setHasData(false)

  try {
    // Process 1: Fetch business data from Targetron
    toast({
      title: "Starting data collection",
      description: "Fetching business data from Targetron API...",
    })

    const data = await fetchBusinessData({
      apiKey: formData.targetronApiKey,
      country: formData.country,
      city: formData.city,
      state: formData.state,
      postalCode: formData.postalCode,
      businessType: formData.businessType || undefined,
      businessStatus: formData.businessStatus,
      limit: formData.limit,
      skipTimes: formData.skipTimes,
      addedFrom: formData.fromDate,
      addedTo: formData.toDate,
      withPhone:
        formData.phoneFilter === "with_phone" ||
        formData.phoneFilter === "both" ||
        formData.phoneFilter === "enter_phone",
      withoutPhone:
        formData.phoneFilter === "without_phone" ||
        formData.phoneFilter === "both",
      enrichWithAreaCodes: formData.enrichWithAreaCodes,
      phoneNumber:
        formData.phoneFilter === "enter_phone" ? formData.phoneNumber : undefined,
    })

    if (!data || data.length === 0) {
      toast({
        title: "No data found",
        description: "No business data was found with the provided criteria.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    // ✅ Filter data if 'without_phone' is selected
    const filteredData =
      formData.phoneFilter === "without_phone"
        ? data.filter((item) => !item.phone || item.phone.trim() === "")
        : data

    toast({
      title: "Data fetched successfully",
      description: `Found ${filteredData.length} business records.`,
      variant: "success",
    })

    setBusinessData(filteredData)

    toast({
      title: "JSON file saved",
      description: `Data saved as ${formData.jsonFileName}`,
      variant: "success",
    })

    await loadEnrichAreaCodesFromURL("/enrich-area-codes.xlsx")

    toast({
      title: "CSV file created",
      description: `Data exported as ${formData.csvFileName}`,
      variant: "success",
    })

    let verifiedData = filteredData
    if (
      formData.verifyEmails &&
      formData.connectEmailVerification &&
      formData.millionApiKey
    ) {
      try {
        toast({
          title: "Verifying emails",
          description: "Processing email verification...",
        })

        verifiedData = await verifyEmails(filteredData, formData.millionApiKey)
        console.log("📧 Verified data:", verifiedData)

        setBusinessData(verifiedData)

        downloadJsonAsFile(
          verifiedData,
          `verified_${formData.jsonFileName}`
        )
        convertJsonToCsv(
          verifiedData,
          `verified_${formData.csvFileName}`
        )

        toast({
          title: "Emails verified",
          description: "Email verification completed successfully. Updated files saved.",
          variant: "success",
        })
      } catch (error) {
        console.error("Error verifying emails:", error)
        toast({
          title: "Email verification error",
          description: "Failed to verify emails. Check your Million API key.",
          variant: "destructive",
        })
      }
    } else if (formData.verifyEmails && formData.connectEmailVerification) {
      toast({
        title: "Email verification skipped",
        description: "Million API key is not configured. Please add it in Settings.",
        variant: "destructive",
      })
    }

    if (formData.telegramBotToken && formData.telegramChatId) {
      toast({
        title: "Sending to Telegram",
        description: "Sending files to Telegram...",
      })

      try {
        await sendTelegramMessage(
          `<b>Business Scraper Results</b>\n\nFound ${filteredData.length} business records for ${formData.businessType} in ${formData.city}, ${formData.state}`,
          {
            botToken: formData.telegramBotToken,
            chatId: formData.telegramChatId,
          }
        )

        await sendTelegramFile(
          JSON.stringify(verifiedData || filteredData, null, 2),
          formData.jsonFileName,
          {
            botToken: formData.telegramBotToken,
            chatId: formData.telegramChatId,
          }
        )

        toast({
          title: "Files sent to Telegram",
          description: "Business data has been sent to Telegram.",
          variant: "success",
        })
      } catch (error) {
        console.error("Error sending to Telegram:", error)
        toast({
          title: "Telegram error",
          description: "Failed to send files to Telegram. Check your credentials.",
          variant: "destructive",
        })
      }
    }

    if (
      formData.addtocampaign &&
      formData.connectColdEmail &&
      formData.instantlyApiKey &&
      formData.instantlyListId &&
      formData.instantlyCampaignId
    ) {
      toast({
        title: "Uploading to campaign",
        description: "Adding data to Instantly campaign...",
      })

      try {
        const instantlyReadyData = (verifiedData || filteredData)
          .map((item) => {
            const email =
              item.email || item.email_1 || item.email_2 || item.email_3 || ""
            return { ...item, email }
          })
          .filter((item) => item.email.includes("@"))

        await uploadToInstantly(instantlyReadyData, {
          apiKey: formData.instantlyApiKey,
          listId: formData.instantlyListId,
          campaignId: formData.instantlyCampaignId,
        })

        toast({
          title: "Data uploaded to Instantly",
          description: "Business data has been uploaded to Instantly campaign.",
          variant: "success",
        })
      } catch (error) {
        console.error("Error uploading to Instantly:", error)
        toast({
          title: "Instantly upload error",
          description: "Failed to upload data to Instantly. Check your credentials.",
          variant: "destructive",
        })
      }
    } else if (formData.addtocampaign && formData.connectColdEmail) {
      toast({
        title: "Instantly upload skipped",
        description: "Instantly API credentials are not fully configured. Please add them in Settings.",
        variant: "destructive",
      })
    }

    setHasData(true)

    toast({
      title: "Process completed",
      description: "All operations completed successfully.",
      variant: "success",
    })
  } catch (error) {
    console.error("Error in process:", error)
    toast({
      title: "Error",
      description: "An error occurred during the process. Please check the console for details.",
      variant: "destructive",
    })
  } finally {
    setIsLoading(false)
  }
}

  const handleDownloadJson = () => {
    if (businessData.length > 0) {
      downloadJsonAsFile(businessData, formData.jsonFileName)
      toast({
        title: "JSON file saved",
        description: `Data saved as ${formData.jsonFileName}`,
        variant: "success",
      })
    }
  }

  const handleDownloadCsv = () => {
    if (businessData.length > 0) {
      convertJsonToCsv(businessData, formData.csvFileName)
      toast({
        title: "CSV file created",
        description: `Data exported as ${formData.csvFileName}`,
        variant: "success",
      })
    }
  }
  function calculateCost(recordsRequested: number, cumulativeUsage: number = 0): number {
    const tiers: [number, number | null][] = [
      [5000, 19 / 1000],
      [50000, 10 / 1000],
      [500000, 3 / 1000],
      [5000000, 1 / 1000],
      [50000000, 0.3 / 1000],
      [Infinity, null], // Custom tier
    ]

    let cost = 0
    let remaining = recordsRequested

    for (const [limit, rate] of tiers) {
      if (cumulativeUsage >= limit) continue

      const available = limit - cumulativeUsage
      const recordsInTier = Math.min(remaining, available)

      if (rate !== null) {
        cost += recordsInTier * rate
      } else {
        throw new Error("Custom tier pricing not defined")
      }

      cumulativeUsage += recordsInTier
      remaining -= recordsInTier

      if (remaining <= 0) break
    }

    return cost
  }
// 🔁 STATE HOOKS
const [recurringHour, setRecurringHour] = useState("")
const [recurringMinute, setRecurringMinute] = useState("")
const [selectedDays, setSelectedDays] = useState<string[]>([])
const [recurringSchedules, setRecurringSchedules] = useState<any[]>([])
const [useRecurringSettings, setUseRecurringSettings] = useState(false)

// ✅ ADD RECURRING SCHEDULE
const handleAddRecurring = async () => {
  if (!useRecurringSettings) return

  if (!recurringHour || !recurringMinute || selectedDays.length === 0) {
    alert("Please specify hour, minute, and at least one weekday.")
    return
  }

  // ✅ Calculate the skip time dynamically
  const nextSkip = await calculateNextSkipTime(formData.businessType)

  const newSchedule = {
    hour: parseInt(recurringHour),
    minute: parseInt(recurringMinute),
    recurring_days: selectedDays,
    created_at: new Date().toISOString(),
    record_limit: formData.limit,
    skip_times: nextSkip,
    add_to_campaign: formData.addtocampaign,
    city: formData.city,
    state: formData.state,
    country: formData.country,
    postal_code: formData.postalCode,
    business_type: formData.businessType,
    business_status: formData.businessStatus,
  }

  try {
    const { error } = await supabase.from("recurring_scrapes").insert([newSchedule])
    if (error) {
      console.error("❌ Error saving schedule:", error)
      alert("Failed to save.")
      return
    }

    alert("✅ Recurring scrape scheduled!")
    setRecurringHour("")
    setRecurringMinute("")
    setSelectedDays([])
    fetchRecurringSchedules().then(setRecurringSchedules)
  } catch (err) {
    console.error("❌ Unexpected error:", err)
    alert("Unexpected error occurred.")
  }
}


// 🗑 DELETE
async function handleDeleteRecurring(id: string) {
  const { error } = await supabase.from("recurring_scrapes").delete().eq("id", id)
  if (error) {
    console.error("Failed to delete schedule", error.message)
    return
  }
  setRecurringSchedules((prev) => prev.filter((entry) => entry.id !== id))
}

// ⏬ FETCH ON LOAD
useEffect(() => {
  fetchRecurringSchedules().then(setRecurringSchedules)
}, [])
const [currentPage, setCurrentPage] = useState(1)
const schedulesPerPage = 10

const calculateNextSkipTime = async (businessType: string): Promise<number> => {
  const { data, error } = await supabase
    .from("recurring_scrapes")
    .select("record_limit")
    .eq("business_type", businessType)

  if (error) {
    console.error("❌ Error fetching scrapes:", error.message)
    return 1
  }

  const totalLimit = data?.reduce((sum, r) => sum + (r.record_limit || 0), 0) || 0
  const skipTime = Math.floor(totalLimit / 100) + 1
  return skipTime
}


  return (
    
    <Card className="shadow-lg border-0">
      
      <CardHeader className="pb-4 border-b">
  <div className="flex justify-between items-center">
    <CardTitle className="text-xl font-semibold">Google My Business Scraper</CardTitle>

    {/* Group buttons on the right */}
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsSettingsOpen(true)}
        className="flex items-center gap-1"
      >
        <Settings className="h-4 w-4" />
        <span>Settings</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          await supabase.auth.signOut()
          window.location.href = "/login"
        }}
      >
        Logout
      </Button>
    </div>
  </div>
</CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="profiles" onValueChange={(value) => handleChange("scrapeType", value)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profiles">Scrape New Profiles</TabsTrigger>
            <TabsTrigger value="recurring">Recurring Dates</TabsTrigger>
          </TabsList>

          <TabsContent value="profiles">
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Scrape Type Selection */}

                {/* Date Range Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fromDate" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>From Date</span>
                    </Label>
                    <Input
                      id="fromDate"
                      type="date"
                      value={formData.fromDate}
                      onChange={(e) => handleChange("fromDate", e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="toDate" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>To Date</span>
                    </Label>
                    <Input
                      id="toDate"
                      type="date"
                      value={formData.toDate}
                      onChange={(e) => handleChange("toDate", e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Location Information */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select value={formData.country} onValueChange={(value) => handleChange("country", value)}>
                      <SelectTrigger id="country">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="GB">United Kingdom</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="AU">Australia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleChange("city", e.target.value)}
                      placeholder="e.g. New York"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleChange("state", e.target.value)}
                      placeholder="e.g. NY"
                    // no `required` attribute here
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => handleChange("postalCode", e.target.value)}
                      placeholder="e.g. 10001"
                    // no `required` attribute here either
                    />
                  </div>
                </div>

                {/* Business Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessType">Business Type</Label>
                    <Input
                      id="businessType"
                      value={formData.businessType}
                      onChange={(e) => handleChange("businessType", e.target.value)}
                      placeholder="e.g. restaurant, hotel, retail"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessStatus">Business Status</Label>
                    <Select
                      value={formData.businessStatus}
                      onValueChange={(value) => handleChange("businessStatus", value)}
                    >
                      <SelectTrigger id="businessStatus">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operational">Operational</SelectItem>
                        <SelectItem value="closed_temporarily">Temporarily Closed</SelectItem>
                        <SelectItem value="closed_permanently">Permanently Closed</SelectItem>
                        <SelectItem value="all">All Statuses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* API Request Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                  <Label htmlFor="limit">Limit per Request</Label>
<Input
  id="limit"
  type="number"
  value={formData.limit ?? ""}
  onChange={(e) => {
    const val = e.target.value
    handleChange("limit", val === "" ? null : Number.parseInt(val))
  }}
  min={1}
  max={100}
/>
                    <p className="text-xs text-gray-500">Number of records per API request</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="skipTimes">Skip Times</Label>
                    <Input
  id="skipTimes"
  type="number"
  value={formData.skipTimes ?? ""}
  onChange={(e) => {
    const val = e.target.value;
    handleChange("skipTimes", val === "" ? null : Number.parseInt(val));
  }}
  min={1}
/>
                    <p className="text-xs text-gray-500">Number of pagination requests</p>
                  </div>
                </div>

                {/* Phone Filter */}
                <div className="space-y-2">
                  <Label htmlFor="phoneFilter">Phone Filter</Label>
                  <Select
                    value={formData.phoneFilter}
                    onValueChange={(value) => handleChange("phoneFilter", value)}
                  >
                    <SelectTrigger id="phoneFilter">
                      <SelectValue placeholder="Select phone filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="with_phone">With Phone Only</SelectItem>
                      <SelectItem value="without_phone">Without Phone Only</SelectItem>
                      <SelectItem value="enter_phone">Enter Specific Phone Number</SelectItem>
                    </SelectContent>
                  </Select>

                  {formData.phoneFilter === "enter_phone" && (
                    <div className="pt-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <input
                        type="text"
                        id="phoneNumber"
                        className="w-full px-3 py-2 border rounded"
                        placeholder="Enter phone number"
                        value={formData.phoneNumber || ""}
                        onChange={(e) => handleChange("phoneNumber", e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Enrich With Area Codes */}
                <div className="border rounded-md p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enrichWithAreaCodes"
                      checked={formData.enrichWithAreaCodes}
                      onCheckedChange={(checked) => {
                        if (typeof checked === "boolean") {
                          handleChange("enrichWithAreaCodes", checked)
                        }
                      }}
                    />
                    <Label htmlFor="enrichWithAreaCodes" className="cursor-pointer">
                      Enrich With Area Codes
                    </Label>
                  </div>
                </div>

                {/* Output File Names */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jsonFileName" className="flex items-center gap-2">
                      <FileJson className="h-4 w-4" />
                      JSON File Name
                    </Label>
                    <Input
                      id="jsonFileName"
                      value={formData.jsonFileName}
                      onChange={(e) => handleChange("jsonFileName", e.target.value)}
                      placeholder="e.g. business_data.json"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="csvFileName" className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV File Name
                    </Label>
                    <Input
                      id="csvFileName"
                      value={formData.csvFileName}
                      onChange={(e) => handleChange("csvFileName", e.target.value)}
                      placeholder="e.g. business_data.csv"
                    />
                  </div>
                </div>

                {/* Campaign Option - Fixed to prevent event propagation issues */}
                <div className="border rounded-md p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="addtocampaign"
                      checked={formData.addtocampaign}
                      onCheckedChange={(checked) => {
                        if (typeof checked === "boolean") {
                          handleChange("addtocampaign", checked)
                        }
                      }}
                    />
                    <Label htmlFor="addtocampaign" className="cursor-pointer flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add to Instantly campaign
                    </Label>
                  </div>
                </div>
                {formData.addtocampaign && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
    <div className="space-y-2">
      <Label htmlFor="instantlyListId">Instantly List ID</Label>
      <Input
        id="instantlyListId"
        value={formData.instantlyListId}
        onChange={(e) => handleChange("instantlyListId", e.target.value)}
        placeholder="Enter your Instantly List ID"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="instantlyCampaignId">Instantly Campaign ID</Label>
      <Input
        id="instantlyCampaignId"
        value={formData.instantlyCampaignId}
        onChange={(e) => handleChange("instantlyCampaignId", e.target.value)}
        placeholder="Enter your Instantly Campaign ID"
      />
    </div>
  </div>
)}

                <div className="bg-gray-50 p-4 rounded-md space-y-4">
  <div className="flex items-center space-x-2">
    <Checkbox
      id="useRecurringSettings"
      checked={useRecurringSettings}
      onCheckedChange={(checked) => {
        if (typeof checked === "boolean") setUseRecurringSettings(checked);
      }}
    />
    <Label htmlFor="useRecurringSettings" className="cursor-pointer">
      Enable Recurring Settings
    </Label>
  </div>

  {useRecurringSettings && (
  <>
    <h3 className="text-sm font-medium">Recurring settings</h3>

    <div className="space-y-2">
      <Label>Select Days of the Week</Label>

      {/* Everyday checkbox */}
      <div className="flex items-center space-x-2 mb-2">
        <Checkbox
          id="everyday"
          checked={selectedDays.length === 7}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
            } else {
              setSelectedDays([]);
            }
          }}
        />
        <Label htmlFor="everyday" className="cursor-pointer">Everyday</Label>
      </div>

      {/* Individual day checkboxes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
          <label key={day} className="flex items-center space-x-2">
            <Checkbox
              checked={selectedDays.includes(day)}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedDays((prev) => [...prev, day])
                } else {
                  setSelectedDays((prev) => prev.filter((d) => d !== day))
                }
              }}
            />
            <span>{day}</span>
          </label>
        ))}
      </div>
    </div>

    {/* Hour & Minute Inputs */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-1">
        <Label>Hour</Label>
        <Input
          type="number"
          min="0"
          max="23"
          value={recurringHour}
          onChange={(e) => setRecurringHour(e.target.value)}
          placeholder="e.g. 13 for 1 PM"
        />
      </div>
      <div className="space-y-1">
        <Label>Minute</Label>
        <Input
          type="number"
          min="0"
          max="59"
          value={recurringMinute}
          onChange={(e) => setRecurringMinute(e.target.value)}
          placeholder="e.g. 30"
        />
      </div>
    </div>
  </>
)}
</div>


                {/* Current Settings Summary */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-sm font-medium mb-2">Current Settings</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {formData.city}, {formData.state}
                    </Badge>
                    {formData.postalCode && <Badge variant="outline">Postal: {formData.postalCode}</Badge>}
                    <Badge variant="outline">{formData.businessType}</Badge>
                    <Badge variant="outline">Status: {formData.businessStatus}</Badge>
                    <Badge variant="outline">Limit: {formData.limit}</Badge>
                    <Badge variant="outline">Skip: {formData.skipTimes}</Badge>
                    <Badge variant="outline">Phone: {formData.phoneFilter}</Badge>
                    {formData.enrichWithAreaCodes && <Badge variant="outline">Area Codes: Enabled</Badge>}
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Estimated Cost: ${calculateCost(formData.limit * formData.skipTimes).toFixed(2)}
                </p>

                {/* Submit Button */}
                <Button
  type="button"
  onClick={useRecurringSettings ? handleAddRecurring : handleQueueScrape}
  disabled={useRecurringSettings && isLoading} // ❗only lock if recurring
  className="w-full"
>
  {isLoading && useRecurringSettings ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Scheduling...
    </>
  ) : (
    useRecurringSettings ? "Start Timed Scraping" : "Start Scraping"
  )}
</Button>


                {/* Download Buttons - Only show if data is available */}
              </div>
            </form>
          </TabsContent>
          <TabsContent value="recurring">
  <div className="space-y-4">
    <h3 className="text-lg font-medium">Scheduled Scrapes</h3>
  </div>

  {recurringSchedules.length === 0 ? (
    <p className="text-sm text-muted-foreground">No schedules found.</p>
  ) : (
    <>
      <div className="overflow-auto border rounded-md">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
  <tr>
    <th className="px-4 py-2 text-left font-medium">Date</th>
    <th className="px-4 py-2 text-left font-medium">Time</th>
    <th className="px-4 py-2 text-left font-medium">Recurring Days</th>
    <th className="px-4 py-2 text-left font-medium">City</th>
    <th className="px-4 py-2 text-left font-medium">Type</th>
    <th className="px-4 py-2 text-left font-medium">Limit</th>
    <th className="px-4 py-2 text-left font-medium">Skip Times</th> {/* 👈 new column */}
    <th className="px-4 py-2 text-left font-medium">Actions</th>
  </tr>
</thead>
<tbody className="divide-y divide-gray-100">
  {recurringSchedules
    .filter((s) => s.source === "recurring" || !["completed", "failed", "no_results"].includes(s.status))
    .slice((currentPage - 1) * schedulesPerPage, currentPage * schedulesPerPage)
    .map((schedule) => (
      <tr key={schedule.id}>
        <td className="px-4 py-2">{schedule.date || "-"}</td>
        <td className="px-4 py-2">
          {schedule.hour !== null && schedule.minute !== null
            ? `${String(schedule.hour).padStart(2, "0")}:${String(schedule.minute).padStart(2, "0")}`
            : "-"}
        </td>
        <td className="px-4 py-2">
          {schedule.recurring_days?.length > 0
            ? schedule.recurring_days.join(", ")
            : "-"}
        </td>
        <td className="px-4 py-2">{schedule.city || "-"}</td>
        <td className="px-4 py-2">{schedule.business_type || "-"}</td>
        <td className="px-4 py-2">{schedule.record_limit ?? "-"}</td>
        <td className="px-4 py-2">{schedule.skip_times ?? "-"}</td> {/* 👈 show skip_times */}
        <td className="px-4 py-2">
          <button
            onClick={() => handleDeleteRecurring(schedule.id)}
            className="text-red-600 hover:text-red-800"
          >
            ❌
          </button>
        </td>
      </tr>
    ))}
</tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4 px-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <span className="text-sm">
          Page {currentPage} of {Math.ceil(recurringSchedules.length / schedulesPerPage)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setCurrentPage((prev) =>
              prev < Math.ceil(recurringSchedules.length / schedulesPerPage) ? prev + 1 : prev
            )
          }
          disabled={currentPage === Math.ceil(recurringSchedules.length / schedulesPerPage)}
        >
          Next
        </Button>
      </div>
    </>
  )}
</TabsContent>

        </Tabs>
      </CardContent>
      {isClient && (
        <SettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          formData={formData}
          onFormDataChange={setFormData}
        />
      )}
    </Card>

  )
}

