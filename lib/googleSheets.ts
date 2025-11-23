// lib/googleSheets.ts
import { getGoogleSheetsClient } from "./googleSheetsClient";

const SPREADSHEET_ID = process.env.SHEETS_SPREADSHEET_ID;
const CALLS_RANGE = process.env.SHEETS_CALLS_RANGE || "Calls!A:D";

export type SheetCallRow = {
  datetime: Date;
  managerName: string;
  durationSec: number;
  isSuccess: boolean;
};

/**
 * Optional call stats from Google Sheets.
 * Expected columns:
 *  A – datetime (YYYY-MM-DD HH:MM)
 *  B – manager name
 *  C – duration in seconds
 *  D – result ("success" / anything else)
 */
export async function getSheetCalls(
  from: Date,
  to: Date
): Promise<SheetCallRow[]> {
  if (!SPREADSHEET_ID) {
    console.log("SHEETS_SPREADSHEET_ID not set, skipping call stats");
    return [];
  }

  try {
    const sheets = await getGoogleSheetsClient();
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: CALLS_RANGE,
    });

    const rows: string[][] = response.data.values || [];

    return rows
      .slice(1) // skip header
      .map((r) => {
        const [dateStr, mgr, durationStr, result] = r;
        const dt = new Date(dateStr);
        return {
          datetime: dt,
          managerName: mgr || "Unknown",
          durationSec: Number(durationStr || 0),
          isSuccess: (result || "").toLowerCase() === "success",
        };
      })
      .filter((row) => row.datetime >= from && row.datetime <= to);
  } catch (error) {
    console.error("Error fetching Google Sheets calls:", error);
    return [];
  }
}