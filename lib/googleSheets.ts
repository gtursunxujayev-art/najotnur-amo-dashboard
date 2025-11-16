// lib/googleSheets.ts

const API_KEY = process.env.SHEETS_API_KEY;
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
  if (!API_KEY || !SPREADSHEET_ID) {
    // No config – just return empty, dashboard will show 0
    return [];
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
    CALLS_RANGE
  )}?key=${API_KEY}`;

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    const txt = await res.text();
    console.error("Sheets error", txt);
    return [];
  }

  const data = await res.json();
  const rows: string[][] = data.values || [];

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
}