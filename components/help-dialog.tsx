"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface HelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Help & Documentation</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="targetron" className="w-full mt-4">
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="targetron">Targetron</TabsTrigger>
            <TabsTrigger value="slack">Slack</TabsTrigger>
            <TabsTrigger value="instantly">Instantly</TabsTrigger>
            <TabsTrigger value="verifier">Million Verifier</TabsTrigger>
            <TabsTrigger value="scraping">Start Scraping</TabsTrigger>
          </TabsList>
          <TabsContent value="targetron">
  <div className="text-sm text-muted-foreground space-y-4">
    <div>
      <p className="font-semibold mb-1">🔑 Where to Get Your API Key</p>
      <p>
        To connect to <strong>Targetron</strong>, you need an API key that authorizes access to the scraping engine.
      </p>
    </div>

    <div>
      <ol className="list-decimal list-inside space-y-1">
        <li>
          <strong>Create a Targetron Account:</strong> Visit{" "}
          <a href="https://app.targetron.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
          https://app.targetron.com/
          </a>{" "}
          and sign up (or log in if you already have an account).
        </li>
        <li>
          <strong>Navigate to API Settings:</strong> After logging in, click targetron logo to go to /profile
           or go directly to{" "}
          <a
            href="https://app.targetron.com/profile"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            https://app.targetron.com/profile
          </a>.
        </li>
        <li>
          <strong>Generate API Key:</strong> Click <em>“Generate New API Token</em>, 
          and copy the key.
        </li>
        <li>
          <strong>Paste the Key:</strong> Go to the <strong>Settings</strong> tab in this app and paste your API key into
          the <em>“Targetron API Key”</em> input, then click <strong>Save Changes</strong>.
        </li>
      </ol>
    </div>

    <div>
      <p className="font-semibold text-red-600">⚠️ Important Notes</p>
      <ul className="list-disc list-inside space-y-1">
        <li>Keep your API key private and secure.</li>
        <li>Never expose it in public GitHub repos or frontend code.</li>
        <li>If compromised, revoke it immediately and generate a new one.</li>
      </ul>
    </div>
  </div>
</TabsContent>

<TabsContent value="slack">
  <div className="text-sm text-muted-foreground space-y-4">
    <div>
      <p className="font-semibold mb-1">🔔 How to Set Up Slack Notifications</p>
      <p>
        To receive notifications in a Slack channel, you’ll need to create a bot and retrieve two values:
        <strong> Slack Bot Token</strong> and <strong>Slack Channel ID</strong>.
      </p>
    </div>

    <div>
      <ol className="list-decimal list-inside space-y-1">
        <li>
          <strong>Create a Slack App:</strong>  
          Visit{" "}
          <a
            href="https://api.slack.com/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            https://api.slack.com/apps
          </a>{" "}
          and click <em>“Create New App”</em>. Choose <strong>From scratch</strong> and give your app a name.
        </li>

        <li>
          <strong>Enable Bot Token Scope:</strong>  
          Go to <em>OAuth & Permissions</em> in the sidebar, scroll to <strong>Bot Token Scopes</strong>, and add:
          <ul className="list-disc list-inside ml-5 space-y-1 mt-1">
            <li><code className="bg-gray-100 px-1 rounded">chat:write</code></li>
            <li><code className="bg-gray-100 px-1 rounded">channels:read</code> (optional for listing channels)</li>
          </ul>
        </li>

        <li>
          <strong>Install the App to Your Workspace:</strong>  
          Scroll to the top and click <strong>Install App</strong>. After installing, you’ll see your
          <code className="bg-gray-100 px-1 mx-1 rounded">Bot User OAuth Token</code>. Copy this — it's your **Slack Bot Token**.
        </li>

        <li>
          <strong>Find Your Slack Channel ID:</strong>  
          - Open Slack in your browser.  
          - Click on the target channel.  
          - The URL will look like:  
            <code className="block bg-gray-100 rounded p-1 text-sm">
              https://app.slack.com/client/TXXXXX/CYYYYYY
            </code>  
          - The part starting with <code>C</code> is the **Channel ID** (e.g., <code>C04ABCD123</code>).
        </li>

        <li>
          <strong>Paste and Save:</strong>  
          - Enter the **Bot Token** and **Channel ID** in the Settings form.  
          - Click <strong>Save Changes</strong> to enable Slack notifications.
        </li>
      </ol>
    </div>

    <div>
      <p className="font-semibold text-red-600">⚠️ Tips & Security</p>
      <ul className="list-disc list-inside space-y-1">
        <li>Never share your Bot Token publicly or expose it in frontend code.</li>
        <li>Ensure your bot is invited to the target Slack channel using <code>/invite @your-bot-name</code>.</li>
        <li>If you rotate your token, be sure to update it here immediately.</li>
      </ul>
    </div>
  </div>
</TabsContent>
<TabsContent value="instantly">
  <div className="text-sm text-muted-foreground space-y-4">
    <div>
      <p className="font-semibold mb-1">📤 How to Connect Instantly (Cold Email)</p>
      <p>
        To integrate with <strong>Instantly</strong>, you’ll need your <strong>API Key</strong>, a <strong>Campaign ID</strong>, and a <strong>List ID</strong>. These allow you to send leads into your Instantly workspace.
      </p>
    </div>

    <div>
      <ol className="list-decimal list-inside space-y-1">
        <li>
          <strong>Log In to Instantly:</strong>  
          Go to{" "}
          <a
            href="https://app.instantly.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            https://app.instantly.ai
          </a>{" "}
          and sign in to your account.
        </li>

        <li>
          <strong>Find Your API Key:</strong>  
          - Click your profile image in the top-right.  
          - Select <em>Settings</em> <em>API</em>.  
          - Click <strong>Generate Key</strong> if you don’t already have one.  
          - Copy the API key — this will be used in your integration.
        </li>

        <li>
          <strong>Get a Campaign ID:</strong>  
          - In your Instantly dashboard, go to the <strong>Campaigns</strong> tab.  
          - Click on the campaign you want to use.  
          - Look at the URL:  
            <code className="block bg-gray-100 rounded p-1 text-sm">
              https://app.instantly.ai/campaigns/<strong>abc123</strong>
            </code>  
          - The last part is your <strong>Campaign ID</strong>.
        </li>

        <li>
          <strong>Get a List ID:</strong>  
          - Click the campaign and go to the <em>Leads</em> tab.  
          - Click on any list you've created, or create a new one.  
          - Again, the List ID is found in the URL after <code>/leads/</code>:
            <code className="block bg-gray-100 rounded p-1 text-sm">
              https://app.instantly.ai/leads/<strong>xyz456</strong>
            </code>
        </li>

        <li>
          <strong>Create a Profile:</strong>  
          - In the <strong>Settings</strong> tab of this app, scroll to the Instantly section.  
          - Enter your API Key, Campaign ID, List ID, and a name for the profile.  
          - Click <strong>Save Profile</strong>.  
          - It will be saved for quick selection later.
        </li>

        <li>
          <strong>Use a Profile:</strong>  
          - Select a saved profile from the dropdown to auto-fill the campaign and list IDs.  
          - This makes sending leads much faster.
        </li>
      </ol>
    </div>

    <div>
      <p className="font-semibold text-red-600">⚠️ Things to Keep in Mind</p>
      <ul className="list-disc list-inside space-y-1">
        <li>Use correct Campaign and List IDs to avoid lead delivery issues.</li>
        <li>Make sure the campaign is live and the list is not archived.</li>
        <li>Do not share your API key publicly or in frontend code.</li>
      </ul>
    </div>
  </div>
</TabsContent>
<TabsContent value="verifier">
  <div className="text-sm text-muted-foreground space-y-4">
    <div>
      <p className="font-semibold mb-1">📧 Connect Million Verifier for Email Validation</p>
      <p>
        Million Verifier allows you to validate email addresses before sending cold outreach, ensuring better deliverability and fewer bounces.
        You'll only need your <strong>API Key</strong> to integrate.
      </p>
    </div>

    <div>
      <ol className="list-decimal list-inside space-y-1">
        <li>
          <strong>Create or Log In to Your Account:</strong>  
          Visit{" "}
          <a
            href="https://app.millionverifier.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            https://app.millionverifier.com
          </a>{" "}
          and log in to your dashboard.
        </li>

        <li>
          <strong>Go to API Access:</strong>  
          - In the top navigation, click <em>“Developer API”</em>.  
          - Or directly go to:{" "}
          <a
            href="https://app.millionverifier.com/api"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            https://app.millionverifier.com/api
          </a>
        </li>

        <li>
          <strong>Copy Your API Key:</strong>  
          - Your key will look like:  
            <code className="block bg-gray-100 rounded p-1 text-sm">
              mv-api-xxxxxxxxxxxxxxxxxxxx
            </code>  
          - Copy this key — this is what you’ll use for validation.
        </li>

        <li>
          <strong>Paste and Save:</strong>  
          - Go to the <strong>Settings</strong> tab in this app.  
          - Find the section labeled <em>“Million Verifier API Key”</em>.  
          - Paste your key and click <strong>Save Changes</strong>.
        </li>

        <li>
          <strong>Start Verifying:</strong>  
          - Once connected, emails will be automatically validated after scraping or before exporting data.
        </li>
      </ol>
    </div>

    <div>
      <p className="font-semibold text-red-600">⚠️ Notes & Best Practices</p>
      <ul className="list-disc list-inside space-y-1">
        <li>Each verification consumes credits — monitor your balance regularly.</li>
        <li>If the key stops working, recheck the Developer API section for a refreshed key.</li>
        <li>Do not expose your key in public environments or client-side code.</li>
      </ul>
    </div>
  </div>
</TabsContent>
<TabsContent value="scraping">
  <div className="text-sm text-muted-foreground space-y-4">
    <div>
      <p className="font-semibold mb-1">🚀 How to Start Scraping</p>
      <p>
        This application allows you to scrape business data using Targetron, validate emails via Million Verifier, and optionally send results to Telegram or upload to Instantly. Here’s how the process works:
      </p>
    </div>

    <div>
      <ol className="list-decimal list-inside space-y-1">
        <li>
          <strong>Set Your Search Filters:</strong><br />
          Fill in filters such as <em>City</em>, <em>State</em>, <em>Business Type</em>, and date range. These control what kind of businesses will be scraped.
        </li>

        <li>
          <strong>Configure Output Settings:</strong><br />
          Set the number of records to scrape with <code>Limit</code> and how many times to paginate using <code>Skip Times</code>.
        </li>

        <li>
          <strong>Choose Phone Filters:</strong><br />
          Decide whether you want businesses with phones, without phones, or a specific phone number.
        </li>

        <li>
          <strong>Enable Enrichment (Optional):</strong><br />
          You can enrich the data with area codes by toggling the corresponding option.
        </li>

        <li>
          <strong>Email Verification:</strong><br />
          If you’ve connected your Million Verifier API key, the system will automatically verify emails.
        </li>

        <li>
          <strong>Telegram Delivery:</strong><br />
          Enter your Telegram Bot Token and Chat ID in Settings if you want the results to be sent to your Telegram channel.
        </li>

        <li>
          <strong>Upload to Instantly (Optional):</strong><br />
          If enabled, data with valid emails will be uploaded directly to your selected Instantly List & Campaign.
        </li>

        <li>
          <strong>Submit the Form:</strong><br />
          Press the <strong>Start Scraping</strong> button. The job will be queued and immediately executed. The results will be downloaded and optionally sent/uploaded depending on your configuration.
        </li>

        <li>
          <strong>Recurring Scheduling:</strong><br />
          Want to automate scrapes on specific weekdays? Enable <strong>Recurring Settings</strong>, pick days and time, and the system will schedule scraping jobs for you automatically.
        </li>
      </ol>
    </div>

    <div>
      <p className="font-semibold text-red-600">⚠️ Final Tips</p>
      <ul className="list-disc list-inside space-y-1">
        <li>Be mindful of your API limits and credit usage for Targetron and Million Verifier.</li>
        <li>You can export results as JSON or CSV anytime after scraping.</li>
        <li>For best results, ensure all keys and profiles are configured before starting.</li>
      </ul>
    </div>
  </div>
</TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
