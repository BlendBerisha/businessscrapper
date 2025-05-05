// Function to safely check if we're in a browser environment
const isBrowser = () => typeof window !== "undefined"

// Function to save settings to localStorage
export function saveSettings(settings: any) {
  if (isBrowser()) {
    try {
      localStorage.setItem("business-scraper-settings", JSON.stringify(settings))
    } catch (error) {
      console.error("Error saving settings:", error)
    }
  }
}

// Function to load settings from localStorage
export function loadSettings() {
  if (isBrowser()) {
    try {
      const savedSettings = localStorage.getItem("business-scraper-settings")
      if (savedSettings) {
        return JSON.parse(savedSettings)
      }
    } catch (error) {
      console.error("Error parsing saved settings:", error)
    }
  }
  return null
}

