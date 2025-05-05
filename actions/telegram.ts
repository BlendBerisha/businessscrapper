"use server"

interface TelegramCredentials {
  botToken: string
  chatId: string
}

export async function sendTelegramMessage(message: string, credentials: TelegramCredentials) {
  const { botToken, chatId } = credentials

  if (!botToken || !chatId) {
    throw new Error("Telegram credentials are not configured")
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    })

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error sending Telegram message:", error)
    throw error
  }
}

export async function sendTelegramFile(fileContent: string, fileName: string, credentials: TelegramCredentials) {
  const { botToken, chatId } = credentials

  if (!botToken || !chatId) {
    throw new Error("Telegram credentials are not configured")
  }

  const url = `https://api.telegram.org/bot${botToken}/sendDocument`

  try {
    // Create a FormData object to send the file
    const formData = new FormData()
    formData.append("chat_id", chatId)

    // Create a Blob from the file content
    const blob = new Blob([fileContent], { type: "application/octet-stream" })

    // Append the file to the FormData
    formData.append("document", blob, fileName)

    const response = await fetch(url, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error sending Telegram file:", error)
    throw error
  }
}

