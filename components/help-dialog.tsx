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
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Help & Documentation</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="targetron" className="w-full mt-4">
          <TabsList className="grid grid-cols-7">
            <TabsTrigger value="targetron">Targetron</TabsTrigger>
            <TabsTrigger value="slack">Slack</TabsTrigger>
            <TabsTrigger value="instantly">Instantly</TabsTrigger>
            <TabsTrigger value="verifier">Million Verifier</TabsTrigger>
            <TabsTrigger value="supabase">Supabase</TabsTrigger>
            <TabsTrigger value="netlify">Netlify</TabsTrigger>
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

<div className="mt-4">
  <h4 className="font-semibold mb-2">Responses</h4>
  <ul className="list-disc list-inside space-y-1">
    <li><strong>200</strong> – The response contains the status and estimated number of results (`total`) that can be fetched with the `/data/places` endpoint.</li>
    <li><strong>401</strong> – Wrong or missing API Key (token).</li>
    <li><strong>402</strong> – Not enough credits.</li>
    <li><strong>422</strong> – Wrong query URL parameters.</li>
  </ul>
</div>

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
      <h4 className="font-semibold mb-2">API Responses</h4>
  <ul className="list-disc list-inside space-y-1 text-sm">
    <li><strong>200 OK</strong> – Request was successful. Payload contains <code>"ok": true</code>.</li>
    <li><strong>200 OK + "ok": false</strong> – Slack-specific error returned:</li>
    <ul className="list-disc ml-6 space-y-1">
      <li><code>invalid_auth</code> – Bad or expired token.</li>
      <li><code>channel_not_found</code> – Channel ID is incorrect or bot not added.</li>
      <li><code>not_in_channel</code> – Bot must be in the channel to post.</li>
      <li><code>missing_scope</code> – OAuth scope not granted (e.g. <code>chat:write</code>).</li>
      <li><code>rate_limited</code> – Too many requests. Back off and retry after header timeout.</li>
      <li><code>is_archived</code> – Channel is archived.</li>
      <li><code>internal_error</code> – Slack internal error.</li>
    </ul>
    <li><strong>401 Unauthorized</strong> – Rare, typically only in OAuth flows without token.</li>
    <li><strong>429 Too Many Requests</strong> – Rate limit exceeded. Includes <code>Retry-After</code> header.</li>
    <li><strong>500 Internal Server Error</strong> – Slack server-side issue. Retry recommended.</li>
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
      <h4 className="font-semibold mb-2">API Responses</h4>
  <ul className="list-disc list-inside space-y-1 text-sm">
    <li><strong>200 OK</strong> – Request successful: Lead uploaded.</li>
    <li><strong>400 Bad Request</strong> – Invalid payload (e.g., missing "email").</li>
    <li><strong>401 Unauthorized</strong> – API key is missing or invalid.</li>
    <li><strong>402 Payment Required</strong> – Upload limit exceeded, upgrade needed.</li>
    <li><strong>403 Forbidden</strong> – API key is valid but lacks permission for this resource.</li>
    <li><strong>404 Not Found</strong> – Resource (e.g. campaign ID) not found.</li>
    <li><strong>422 Unprocessable Entity</strong> – Bad email format or semantically incorrect data.</li>
    <li><strong>429 Too Many Requests</strong> – Rate limit exceeded. Wait and retry.</li>
    <li><strong>500 Internal Server Error</strong> – Instantly server error. Try again later.</li>
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
      <TabsContent value="verifier">
  <h4 className="font-semibold mb-2">API Responses</h4>
  <ul className="list-disc list-inside space-y-1 text-sm">
    <li><strong>200 OK</strong> – Email successfully verified (e.g. <code>"result": "valid"</code>).</li>
    <li><strong>400 Bad Request</strong> – Invalid email format or missing parameters.</li>
    <li><strong>401 Unauthorized</strong> – Missing or invalid API key.</li>
    <li><strong>402 Payment Required</strong> – Not enough verification credits. Top up required.</li>
    <li><strong>403 Forbidden</strong> – Key exists but doesn't have access (e.g. disabled).</li>
    <li><strong>422 Unprocessable Entity</strong> – Cannot verify email at this time.</li>
    <li><strong>429 Too Many Requests</strong> – You're sending too many requests too fast.</li>
    <li><strong>500 Internal Server Error</strong> – MillionVerifier backend issue. Try again later.</li>
  </ul>
</TabsContent>

    </div>
  </div>
</TabsContent>
<TabsContent value="supabase">
  <div className="text-sm text-muted-foreground space-y-4">
    <div>
      <p className="font-semibold mb-1">🧠 What is Supabase Used For?</p>
      <p>
        Supabase is used to store and manage queued scraping jobs, recurring scrape schedules, and app-wide settings.
        It acts as your project’s lightweight backend database with real-time capabilities.
      </p>
    </div>

    <div>
      <p className="font-semibold mb-1">🔐 Environment Variables</p>
      <ul className="list-disc list-inside space-y-1">
        <li><code>SUPABASE_URL</code> – Your Supabase project URL (e.g. <code>https://xyzcompany.supabase.co</code>)</li>
        <li><code>SUPABASE_ANON_KEY</code> – The public (anon) API key from your Supabase dashboard</li>
      </ul>
      <p className="text-xs text-gray-500">
        Add these to your <strong>.env</strong> file (locally) or to Netlify under: <code>Site Settings → Environment Variables</code>.
      </p>
    </div>

    <div>
      <p className="font-semibold mb-1">📊 Tables You Must Create</p>
      <p>Below are the key Supabase tables and their purpose in this system:</p>

      <ul className="list-disc list-inside space-y-2 mt-2">
        <li>
          <strong>scrape_queue</strong>:  
          Stores one-time scraping jobs submitted by the user.
          <br />
          Fields include: <code>status</code>, <code>city</code>, <code>record_limit</code>, <code>verify_emails</code>, <code>json_file_name</code>, etc.
        </li>
        <li>
          <strong>recurring_scrapes</strong>:  
          Used for automated weekly scraping jobs based on a recurring schedule.
          <br />
          Fields include: <code>recurring_days[]</code>, <code>hour</code>, <code>minute</code>, <code>record_limit</code>, <code>skip_times</code>, etc.
        </li>
        <li>
          <strong>settings</strong>:  
          Stores JSON-based global config, such as tokens, API keys, or user preferences.
          <br />
          Fields: <code>key (text)</code>, <code>value (jsonb)</code>
        </li>
      </ul>
    </div>

    <div>
      <p className="font-semibold mb-1">✅ How to Create Tables</p>
      <p>Go to the <strong>Supabase SQL Editor</strong> and run the following SQL snippets:</p>

      <details className="border rounded p-2 bg-gray-50">
        <summary className="cursor-pointer font-medium">scrape_queue</summary>
        <pre className="text-xs mt-2 overflow-x-auto">
CREATE TABLE scrape_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending',
  record_limit integer,
  skip_times integer,
  add_to_campaign boolean,
  city text,
  state text,
  country text,
  postal_code text,
  business_type text,
  business_status text,
  from_date date,
  to_date date,
  phone_filter text,
  phone_number text,
  verify_emails boolean,
  enrich_with_area_codes boolean,
  json_file_name text,
  csv_file_name text
);
        </pre>
      </details>

      <details className="border rounded p-2 bg-gray-50">
        <summary className="cursor-pointer font-medium">recurring_scrapes</summary>
        <pre className="text-xs mt-2 overflow-x-auto">
        CREATE TABLE recurring_scrapes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  recurring_days text[] NOT NULL,
  hour integer NOT NULL,
  minute integer NOT NULL,
  city text,
  state text,
  country text,
  postal_code text,
  business_type text,
  business_status text,
  record_limit integer,
  skip_times integer,
  add_to_campaign boolean,
  created_at timestamptz DEFAULT now(),
  with_phone boolean DEFAULT true,
  without_phone boolean DEFAULT false,
  enrich_with_area_codes boolean DEFAULT false,
  paused boolean DEFAULT false
);
        </pre>
      </details>

      <details className="border rounded p-2 bg-gray-50">
        <summary className="cursor-pointer font-medium">settings</summary>
        <pre className="text-xs mt-2 overflow-x-auto">
CREATE TABLE settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL
);
        </pre>
      </details>
    </div>

    <div>
      <p className="font-semibold text-red-600">⚠️ Tips</p>
      <ul className="list-disc list-inside space-y-1">
        <li>Only use <code>anon</code> keys in your frontend app.</li>
        <li>Use RLS (Row-Level Security) only if you configure user auth — otherwise disable it.</li>
        <li>Monitor API usage in the Supabase dashboard to avoid rate limits.</li>
      </ul>
      <h4 className="font-semibold mb-2">API Responses</h4>
  <ul className="list-disc list-inside space-y-1 text-sm">
    <li><strong>200 OK</strong> – Successful response from Supabase Auth, Storage, or Database API.</li>
    <li><strong>400 Bad Request</strong> – Malformed request or missing fields (e.g. email required, invalid syntax).</li>
    <li><strong>401 Unauthorized</strong> – Missing or invalid JWT/token. Used for endpoints requiring auth.</li>
    <li><strong>402 Payment Required</strong> – Project quota exceeded (e.g. free plan limit reached).</li>
    <li><strong>403 Forbidden</strong> – Access denied due to Row Level Security (RLS) or missing permissions.</li>
    <li><strong>404 Not Found</strong> – Table, record, or resource not found.</li>
    <li><strong>422 Unprocessable Entity</strong> – Semantic issue with input (e.g. JSON syntax valid but logic is bad).</li>
    <li><strong>429 Too Many Requests</strong> – Rate limit hit. Supabase is throttling your requests.</li>
    <li><strong>500 Internal Server Error</strong> – Server-side issue on Supabase. Retry later.</li>
  </ul>

    </div>
  </div>
</TabsContent>
<TabsContent value="netlify">
  <div className="text-sm text-muted-foreground space-y-4">
    <div>
      <p className="font-semibold mb-1">🚀 Netlify Setup & Debugging Guide</p>
      <p>
        Netlify hosts your frontend and connects it to APIs and Supabase. Here's how to deploy, debug, and monitor it effectively.
      </p>
    </div>

    <div>
      <p className="font-semibold">1. Local Development</p>
      <ul className="list-disc list-inside">
        <li>Run the app locally using <code>npm run dev</code> or <code>yarn dev</code>.</li>
        <li>This uses the <strong>.env</strong> file located at the root of your project.</li>
        <li>Make sure all required variables are present: <code>SUPABASE_URL</code>, <code>SUPABASE_ANON_KEY</code>, etc.</li>
      </ul>
    </div>

    <div>
      <p className="font-semibold">2. Deploying to Netlify</p>
      <ol className="list-decimal list-inside space-y-1">
        <li>Push your project to GitHub.</li>
        <li>Connect your GitHub repo to Netlify via the Netlify dashboard.</li>
        <li>Set your build command to <code>npm run build</code> and publish directory to <code>.next</code> or <code>out</code> depending on your framework.</li>
        <li>Set environment variables from your local <code>.env</code> into Netlify: go to <strong>Site settings → Environment Variables</strong>.</li>
      </ol>
    </div>

    <div>
      <p className="font-semibold">3. Debugging & Logs</p>
      <ul className="list-disc list-inside">
        <li>Go to your site → <strong>Deploys</strong> tab → click on the latest deploy → <strong>View logs</strong></li>
        <li>This will show you build errors, runtime exceptions, and console logs</li>
        <li>You can also add <code>console.log()</code> in your app to debug in Netlify Functions or static render.</li>
      </ul>
    </div>

    <div>
      <p className="font-semibold">4. Common Errors</p>
      <ul className="list-disc list-inside space-y-2">
        <li>
          <strong>503 – API Service Unavailable:</strong><br />
          This usually means your backend (like Targetron or Supabase) is either down, blocking the request, or hit rate limits.
        </li>
        <li>
          <strong>Failed to load resource (CORS):</strong><br />
          Your external API is not allowing calls from your Netlify domain. Fix by adjusting CORS headers.
        </li>
        <li>
          <strong>Missing environment variables:</strong><br />
          You may see undefined values or fetch errors — confirm Netlify env vars match your local <code>.env</code>.
        </li>
        <li>
          <strong>Runtime errors (undefined, null, etc.):</strong><br />
          Check your browser console and Netlify logs to trace back.
        </li>
      </ul>
    </div>

    <div>
      <p className="font-semibold text-red-600">✅ Best Practices</p>
      <ul className="list-disc list-inside">
        <li>Deploy preview builds from branches before merging to main.</li>
        <li>Use Netlify Functions if you need server-side logic with secrets (like Telegram API, custom scrapers).</li>
        <li>Always test new features locally with <code>npm run dev</code> before deploying.</li>
      </ul>
    </div>
  </div>
</TabsContent>

<TabsContent value="scraping">
  <div className="text-sm text-muted-foreground space-y-4">
    <div>
      <p className="font-semibold mb-1">🚀 How to Start Scraping</p>
      <p>
        This application allows you to scrape business data using Targetron, validate emails via Million Verifier, and optionally send results to Slack or upload to Instantly. Here’s how the process works:
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
