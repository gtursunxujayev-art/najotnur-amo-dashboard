// lib/googleSheetCalls.ts
/**
 * Fetch and import historical call data from Google Sheets
 * Expected columns:
 * A - Type (Пропущенный, Входящий, Исходящий)
 * B - Caller
 * C - Call receiver  
 * D - Inside number
 * E - Date (various formats)
 * F - Call length (HH:MM:SS or seconds)
 * G - Successful call length (HH:MM:SS or seconds)
 */

import { getGoogleSheetsClient } from "@/lib/googleSheetsClient";

export type GoogleSheetCallRow = {
  callType: string;
  direction: "missed" | "in" | "out";
  caller: string;
  receiver: string;
  insideNumber?: string;
  date: Date;
  duration: number;
  successDuration: number;
};

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;

  dateStr = String(dateStr).trim();

  // Try format: "23:58:20 2025-11-24"
  let match = dateStr.match(
    /(\d{1,2}):(\d{2}):(\d{2})\s+(\d{4})-(\d{2})-(\d{2})/
  );
  if (match) {
    const [, h, m, s, year, month, day] = match;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(h),
      parseInt(m),
      parseInt(s)
    );
  }

  // Try format: "2025-10-29 12:22:09"
  match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})/);
  if (match) {
    const [, year, month, day, h, m, s] = match;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(h),
      parseInt(m),
      parseInt(s)
    );
  }

  // Try standard date parsing
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

function parseDuration(durationStr: string | undefined): number {
  if (!durationStr) return 0;

  durationStr = String(durationStr).trim();

  // If it's just a number, assume it's seconds
  const asNum = parseInt(durationStr);
  if (!isNaN(asNum) && durationStr === String(asNum)) {
    return asNum;
  }

  // Try format: "00:00:15" (HH:MM:SS)
  const match = durationStr.match(/(\d+):(\d{2}):(\d{2})/);
  if (match) {
    const [, h, m, s] = match;
    return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
  }

  return 0;
}

function parseCallType(
  typeStr: string | undefined
): "missed" | "in" | "out" {
  if (!typeStr) return "out";

  typeStr = String(typeStr).toLowerCase().trim();

  if (
    typeStr.includes("пропущен") ||
    typeStr.includes("missed") ||
    typeStr.includes("пропуск")
  ) {
    return "missed";
  }

  if (
    typeStr.includes("входящ") ||
    typeStr.includes("incoming") ||
    typeStr.includes("in")
  ) {
    return "in";
  }

  return "out";
}

export async function fetchGoogleSheetCalls(
  spreadsheetId: string,
  sheetName: string = "",
  from: Date,
  to: Date
): Promise<GoogleSheetCallRow[]> {
  try {
    console.log(
      `[GoogleSheetCalls] Fetching from spreadsheet ${spreadsheetId}`
    );

    const sheets = await getGoogleSheetsClient();
    
    // Always use just "A:G" - reads from first sheet
    const range = "A:G";

    console.log(`[GoogleSheetCalls] Fetching range: ${range}`);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows: string[][] = response.data.values || [];
    console.log(`[GoogleSheetCalls] Got ${rows.length} rows from Google Sheets`);

    if (rows.length <= 1) {
      console.log("[GoogleSheetCalls] No data rows (only header or empty)");
      return [];
    }

    const result: GoogleSheetCallRow[] = [];

    // Skip header (row 0)
    for (let i = 1; i < rows.length; i++) {
      try {
        const row = rows[i];
        const [
          typeStr,
          callerStr,
          receiverStr,
          insideNumStr,
          dateStr,
          durationStr,
          successDurationStr,
        ] = row;

        const date = parseDate(dateStr);
        if (!date || date < from || date > to) {
          continue;
        }

        const duration = parseDuration(durationStr);
        const successDuration = parseDuration(successDurationStr);
        const direction = parseCallType(typeStr);

        result.push({
          callType: typeStr || "Unknown",
          direction,
          caller: callerStr?.trim() || "Unknown",
          receiver: receiverStr?.trim() || "Unknown",
          insideNumber: insideNumStr?.trim(),
          date,
          duration,
          successDuration,
        });
      } catch (rowError) {
        console.warn(
          `[GoogleSheetCalls] Error parsing row ${i}, skipping:`,
          rowError
        );
        continue;
      }
    }

    console.log(
      `[GoogleSheetCalls] Parsed ${result.length} calls after filtering`
    );
    return result;
  } catch (error) {
    console.error(
      "[GoogleSheetCalls] Error fetching calls from Google Sheets:",
      error
    );
    return [];
  }
}
