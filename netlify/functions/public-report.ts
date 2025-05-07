import { Handler } from "@netlify/functions"
import fs from "fs"
import path from "path"

const handler: Handler = async (event) => {
  const fileName = event.queryStringParameters?.file
  if (!fileName) {
    return { statusCode: 400, body: "Missing file parameter" }
  }

  const filePath = path.join("/tmp", fileName)

  if (!fs.existsSync(filePath)) {
    return { statusCode: 404, body: "File not found" }
  }

  const fileBuffer = fs.readFileSync(filePath)

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
    body: fileBuffer.toString("base64"),
    isBase64Encoded: true,
  }
}

export { handler }
