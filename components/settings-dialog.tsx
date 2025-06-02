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
import { Switch } from "@/components/ui/switch"
import { PasswordInput } from "@/components/ui/password-input"
import { supabase } from "@/lib/supabase"
import {
  Key,
  MessageSquare,
  Link,
  Mail,
  DollarSign,
  CreditCard,
} from "lucide-react"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: any
  onFormDataChange: (data: any) => void
}

export function SettingsDialog({ open, onOpenChange, formData, onFormDataChange }: SettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState({ ...formData })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true)
      const res = await fetch("/api/get-settings")
      const data = await res.json()
      const merged = { ...formData, ...data }

      if (process.env.NODE_ENV === "development") {
        console.log("🔑 Loaded Targetron API Key:", merged.targetronApiKey)
      }
  
      setLocalSettings(merged)
      onFormDataChange(merged)  
      setLoading(false)
    }
    if (open) fetchSettings()
  }, [open])

  const handleChange = (field: string, value: any) => {
    setLocalSettings((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    const updatedSettings = { ...formData, ...localSettings }
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
          <DialogDescription>Configure all your settings below in one view.</DialogDescription>
        </DialogHeader>

        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Key className="h-4 w-4" /> Targetron API
          </h3>
          <div className="space-y-2">
            <Label htmlFor="targetronApiKey">Targetron API Key</Label>
            <PasswordInput
              id="targetronApiKey"
              value={localSettings.targetronApiKey || ""}
              onChange={(e) => handleChange("targetronApiKey", e.target.value)}
              placeholder="Enter your Targetron API key"
            />
          </div>
        </Card>
        <Card className="p-4 space-y-4">
  <h3 className="text-sm font-medium flex items-center gap-2">
    <MessageSquare className="h-4 w-4" /> Slack Notifications
  </h3>

  <div className="space-y-2">
    <Label htmlFor="slackBotToken">Slack Bot Token</Label>
    <PasswordInput
      id="slackBotToken"
      value={localSettings.slackBotToken || ""}
      onChange={(e) => handleChange("slackBotToken", e.target.value)}
      placeholder="Enter your Slack Bot token"
    />
  </div>

  <div className="space-y-2">
    <Label htmlFor="slackChannelId">Slack Channel ID</Label>
    <Input
      id="slackChannelId"
      value={localSettings.slackChannelId || ""}
      onChange={(e) => handleChange("slackChannelId", e.target.value)}
      placeholder="Enter your Slack Channel ID"
    />
  </div>
</Card>
        <Card className="p-4 space-y-4">
  <h3 className="text-sm font-medium flex items-center gap-2">
    <Link className="h-4 w-4" /> Instantly (Cold Email)
  </h3>

  <div className="flex items-center justify-between">
    <Label htmlFor="connectColdEmail">Connect Instantly</Label>
    <Switch
      id="connectColdEmail"
      checked={localSettings.connectColdEmail}
      onCheckedChange={(checked) => handleChange("connectColdEmail", checked)}
    />
  </div>

  {localSettings.connectColdEmail && (
    <div className="grid grid-cols-1 gap-4">
      <div className="space-y-2">
        <Label htmlFor="instantlyApiKey">Instantly API Key</Label>
        <PasswordInput
          id="instantlyApiKey"
          value={localSettings.instantlyApiKey || ""}
          onChange={(e) => handleChange("instantlyApiKey", e.target.value)}
          placeholder="Enter your Instantly API key"
        />
      </div>

      {/* Profile input */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="instantlyProfileName">Profile Name</Label>
          <Input
            id="instantlyProfileName"
            value={localSettings.tempInstantlyProfileName || ""}
            onChange={(e) => handleChange("tempInstantlyProfileName", e.target.value)}
            placeholder="e.g.  profile 1"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="instantlyListId">List ID</Label>
<Input
  id="instantlyListId"
  value={localSettings.tempInstantlyListId || ""}
  onChange={(e) => handleChange("tempInstantlyListId", e.target.value)}
  required={false}
/>
        </div>
        <div className="space-y-2">
          <Label htmlFor="instantlyCampaignId">Campaign ID</Label>
          <Input
            id="instantlyCampaignId"
            value={localSettings.tempInstantlyCampaignId || ""}
            onChange={(e) => handleChange("tempInstantlyCampaignId", e.target.value)}
          />
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const newProfile = {
            name: localSettings.tempInstantlyProfileName,
            listId: localSettings.tempInstantlyListId,
            campaignId: localSettings.tempInstantlyCampaignId,
          }

if (!newProfile.name || !newProfile.campaignId) {
  alert("Please fill in both Profile Name and Campaign ID.")
  return
}

          const updatedProfiles = [
            ...(localSettings.instantlyProfiles || []),
            newProfile,
          ]

          handleChange("instantlyProfiles", updatedProfiles)
          handleChange("tempInstantlyProfileName", "")
          handleChange("tempInstantlyListId", "")
          handleChange("tempInstantlyCampaignId", "")
        }}
      >
        Save Profile
      </Button>

      {localSettings.instantlyProfiles?.length > 0 && (
        <div className="space-y-2">
          <Label>Select Profile to Use</Label>
          <Select
            onValueChange={(value) => {
              const selected = localSettings.instantlyProfiles.find((p) => p.name === value)
              if (selected) {
                handleChange("instantlyListId", selected.listId)
                handleChange("instantlyCampaignId", selected.campaignId)
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a saved Instantly profile" />
            </SelectTrigger>
            <SelectContent>
              {localSettings.instantlyProfiles.map((p, index) => (
                <SelectItem key={index} value={p.name}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )}
</Card>


        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" /> Email Verification
          </h3>
          <div className="flex items-center justify-between">
            <Label htmlFor="connectEmailVerification">Connect Million Verifier</Label>
            <Switch
              id="connectEmailVerification"
              checked={localSettings.connectEmailVerification}
              onCheckedChange={(checked) => handleChange("connectEmailVerification", checked)}
            />
          </div>
          {localSettings.connectEmailVerification && (
            <div className="space-y-2">
              <Label htmlFor="millionApiKey">Million Verifier API Key</Label>
              <PasswordInput
                id="millionApiKey"
                value={localSettings.millionApiKey || ""}
                onChange={(e) => handleChange("millionApiKey", e.target.value)}
                placeholder="Enter your Million Verifier API key"
              />
            </div>
          )}
        </Card>

        {/* <Card className="p-4 space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Cost Estimation
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
            <Label>Estimated Cost</Label>
            <div className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
              <DollarSign className="h-4 w-4 text-amber-500" />
              <span className="font-medium">
                ${estimatedCost} for {localSettings.limit * localSettings.skipTimes} records
              </span>
            </div>
          </div>
        </Card> */}

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
