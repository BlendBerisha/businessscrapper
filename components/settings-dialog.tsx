"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  MapPin,
  Building,
  Hash,
  Key,
  CreditCard,
  Link,
  Mail,
  Server,
  DollarSign,
  MessageSquare,
  Calendar,
  Phone,
  FileSpreadsheet,
} from "lucide-react"
import { PasswordInput } from "@/components/ui/password-input"
import { supabase } from "@/lib/supabase"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: any
  onFormDataChange: (data: any) => void
}

export function SettingsDialog({ open, onOpenChange, formData, onFormDataChange }: SettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState({ ...formData })
  const [loading, setLoading] = useState(false)

  // Load settings from Supabase on first open
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true)
      const res = await fetch("/api/get-settings")
      const data = await res.json()

      // Merge with form defaults
      const merged = {
        ...formData,
        ...data,
      }

      setLocalSettings(merged)
      onFormDataChange(merged)
      setLoading(false)
    }

    if (open) {
      fetchSettings()
    }
  }, [open])

  const handleChange = (field: string, value: any) => {
    setLocalSettings((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    const updatedSettings = {
      ...formData,
      ...localSettings,
    }

    setLocalSettings(updatedSettings)
    onFormDataChange(updatedSettings)

    try {
      await fetch("/api/save-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      })
    } catch (err) {
      console.error("Failed to save to Supabase", err)
    }

    onOpenChange(false)
  }

  const serverBalance = 5.57
  const costPerScrape = 0.02
  const estimatedCost = (localSettings.limit * localSettings.skipTimes * costPerScrape).toFixed(2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scraper Settings</DialogTitle>
          <DialogDescription>Configure the parameters for your business data scraping</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            {/* <TabsTrigger value="server">Server</TabsTrigger> */}
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>


          <TabsContent value="api-keys" className="space-y-4">
            <Card className="p-4 space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Key className="h-4 w-4" />
                Targetron API
              </h3>
              <div className="space-y-2">
                <Label htmlFor="targetronApiKey">Targetron API Key</Label>
                <PasswordInput
                  id="targetronApiKey"
                  value={localSettings.targetronApiKey || process.env.TARGETRON_API_KEY || ""}
                  onChange={(e) => handleChange("targetronApiKey", e.target.value)}
                  placeholder="Enter your Targetron API key"
                />
              </div>
            </Card>

            <Card className="p-4 space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Telegram API
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telegramBotToken">Telegram Bot Token</Label>
                  <PasswordInput
                    id="telegramBotToken"
                    value={localSettings.telegramBotToken}
                    onChange={(e) => handleChange("telegramBotToken", e.target.value)}
                    placeholder="Enter your Telegram bot token"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telegramChatId">Telegram Chat ID</Label>
                  <Input
                    id="telegramChatId"
                    value={localSettings.telegramChatId}
                    onChange={(e) => handleChange("telegramChatId", e.target.value)}
                    placeholder="Enter your Telegram chat ID"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="server" className="space-y-4">
            <Card className="p-4 space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Server className="h-4 w-4" />
                Server Status
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Server Balance</Label>
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
                    <CreditCard className="h-4 w-4 text-green-500" />
                    <span className="font-medium">${serverBalance.toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cost per Record</Label>
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
                    <DollarSign className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">${costPerScrape.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Estimated Cost for Current Settings</Label>
                <div className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
                  <DollarSign className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">
                    ${estimatedCost} for {localSettings.limit * localSettings.skipTimes} records
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Based on {localSettings.limit} records per request × {localSettings.skipTimes} requests × $
                  {costPerScrape} per record
                </p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-4">
            <Card className="p-4 space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Link className="h-4 w-4" />
                Cold Email Software
              </h3>
              <div className="flex items-center justify-between">
                <Label htmlFor="connectColdEmail" className="cursor-pointer">
                  Connect Instantly
                </Label>
                <Switch
                  id="connectColdEmail"
                  checked={localSettings.connectColdEmail}
                  onCheckedChange={(checked) => handleChange("connectColdEmail", checked)}
                />
              </div>
              {localSettings.connectColdEmail && (
                <div className="grid grid-cols-1 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="instantlyApiKey">Instantly API Key</Label>
                    <PasswordInput
                      id="instantlyApiKey"
                      value={localSettings.instantlyApiKey}
                      onChange={(e) => handleChange("instantlyApiKey", e.target.value)}
                      placeholder="Enter your Instantly API key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instantlyListId">Instantly List ID</Label>
                    <Input
                      id="instantlyListId"
                      value={localSettings.instantlyListId}
                      onChange={(e) => handleChange("instantlyListId", e.target.value)}
                      placeholder="Enter your Instantly List ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instantlyCampaignId">Instantly Campaign ID</Label>
                    <Input
                      id="instantlyCampaignId"
                      value={localSettings.instantlyCampaignId}
                      onChange={(e) => handleChange("instantlyCampaignId", e.target.value)}
                      placeholder="Enter your Instantly Campaign ID"
                    />
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-4 space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Verification Tool
              </h3>
              <div className="flex items-center justify-between">
                <Label htmlFor="connectEmailVerification" className="cursor-pointer">
                  Connect Million Verifier
                </Label>
                <Switch
                  id="connectEmailVerification"
                  checked={localSettings.connectEmailVerification}
                  onCheckedChange={(checked) => handleChange("connectEmailVerification", checked)}
                />
              </div>
              {localSettings.connectEmailVerification && (
                <div className="grid grid-cols-1 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="millionApiKey">Million Verifier API Key</Label>
                    <PasswordInput
                      id="millionApiKey"
                      value={localSettings.millionApiKey}
                      onChange={(e) => handleChange("millionApiKey", e.target.value)}
                      placeholder="Enter your Million Verifier API key"
                    />
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

