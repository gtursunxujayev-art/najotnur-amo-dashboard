import { google } from "googleapis";

/**
 * Google Sheets client for Vercel / generic Node.js using a
 * Google Cloud **service account**.
 *
 * It reads credentials from environment variables:
 * - GOOGLE_PROJECT_ID
 * - GOOGLE_CLIENT_EMAIL
 * - GOOGLE_PRIVATE_KEY   (with \n line breaks or real newlines)
 *
 * NOTE: The old Replit Connector based implementation has been removed
 * for production. If you still run this on Replit with connectors,
 * prefer setting these env vars instead of relying on REPLIT_CONNECTORS.
 */

let sheetsClient: ReturnType<typeof google.sheets> | null = null;

function createJwtClient() {
  const projectId = process.env.GOOGLE_PROJECT_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawPrivateKey) {
    throw new Error(
      "Missing Google service account env vars. Please set GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY."
    );
  }

  // Vercel and many env systems store the key with literal '\n' sequences.
  // Convert them to real newlines so Google client can parse it.
  const privateKey = rawPrivateKey.replace(/\\n/g, "\n");

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    subject: undefined,
  });
}

export async function getGoogleSheetsClient() {
  if (sheetsClient) {
    return sheetsClient;
  }

  const auth = createJwtClient();
  sheetsClient = google.sheets({ version: "v4", auth });

  return sheetsClient;
}

