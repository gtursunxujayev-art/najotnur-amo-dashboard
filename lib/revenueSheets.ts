// lib/revenueSheets.ts
import { dashboardConfig } from "@/config/dashboardConfig";
import { getGoogleSheetsClient } from "./googleSheetsClient";

export type RevenueRow = {
  date: Date;
  amount: number;
  managerName: string;
  courseType: string;
  paymentType: string;
};

function extractSpreadsheetIdFromUrl(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

function colLetterToIndex(columnRef: string): number {
  // Handle both "A" and "Sheet!A" formats
  const ref = columnRef.trim();
  if (!ref) return -1;
  
  // Extract column letter from formats like "Asosiy!B" or just "B"
  const match = ref.match(/([A-Z]+)$/i);
  if (!match) return -1;
  
  const letter = match[1].toUpperCase();
  const code = letter.charCodeAt(0);
  return code - "A".charCodeAt(0);
}

/**
 * Reads revenue data from Google Sheets for the configured sheet & columns.
 * Expected sheet: first sheet in the document, header in row 1, data from row 2.
 */
export async function getSheetRevenue(
  from: Date,
  to: Date
): Promise<RevenueRow[]> {
  if (!dashboardConfig.REVENUE_SHEETS_URL) {
    console.log("REVENUE_SHEETS_URL not configured, skipping revenue data");
    return [];
  }

  const spreadsheetId = extractSpreadsheetIdFromUrl(
    dashboardConfig.REVENUE_SHEETS_URL
  );
  if (!spreadsheetId) {
    console.error("RevenueSheets: cannot parse spreadsheet id from url");
    return [];
  }

  try {
    console.log(`[RevenueSheets] Fetching data from spreadsheet ${spreadsheetId}`);
    const sheets = await getGoogleSheetsClient();
    
    // Extract sheet name from column reference if present (e.g., "Asosiy!A" -> "Asosiy")
    const sheetName = dashboardConfig.REVENUE_DATE_COLUMN.includes('!')
      ? dashboardConfig.REVENUE_DATE_COLUMN.split('!')[0]
      : '';
    
    // We read columns A:Z from the specified sheet
    const range = sheetName ? `${sheetName}!A:Z` : "A:Z";
    console.log(`[RevenueSheets] Reading range: ${range}`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows: string[][] = response.data.values || [];
    console.log(`[RevenueSheets] Got ${rows.length} rows from Google Sheets`);
    if (rows.length <= 1) {
      console.log(`[RevenueSheets] No data rows found (only header or empty)`);
      return [];
    }

    const dateIdx = colLetterToIndex(dashboardConfig.REVENUE_DATE_COLUMN);
    const amountIdx = colLetterToIndex(dashboardConfig.REVENUE_AMOUNT_COLUMN);
    const courseIdx = colLetterToIndex(dashboardConfig.REVENUE_COURSE_TYPE_COLUMN);
    const managerIdx = colLetterToIndex(dashboardConfig.REVENUE_MANAGER_COLUMN);
    const paymentIdx = colLetterToIndex(dashboardConfig.REVENUE_PAYMENT_TYPE_COLUMN);

    console.log(`[RevenueSheets] Column indices - Date: ${dateIdx}, Amount: ${amountIdx}, Manager: ${managerIdx}`);
    console.log(`[RevenueSheets] Filtering data from ${from.toISOString()} to ${to.toISOString()}`);

    const safeIndex = (arr: any[], idx: number) =>
      idx >= 0 && idx < arr.length ? arr[idx] : "";

    const processedRows = rows
      .slice(1) // skip header
      .map((r) => {
        const dateStr = String(safeIndex(r, dateIdx) || "").trim();
        if (!dateStr) return null;

        // Parse date - handle common formats: dd.mm.yyyy, yyyy-mm-dd, mm/dd/yyyy
        let dt: Date;
        if (dateStr.includes('.')) {
          // dd.mm.yyyy format (e.g., "24.11.2025")
          const parts = dateStr.split('.');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
            const year = parseInt(parts[2], 10);
            dt = new Date(year, month, day);
          } else {
            dt = new Date(dateStr);
          }
        } else {
          dt = new Date(dateStr);
        }

        const amountRaw = String(safeIndex(r, amountIdx) || "").replace(/\s/g, "");
        const amount = Number(amountRaw || 0);

        const managerName = String(safeIndex(r, managerIdx) || "").trim();
        const courseType = String(safeIndex(r, courseIdx) || "").trim();
        const paymentType = String(safeIndex(r, paymentIdx) || "").trim();

        return {
          date: dt,
          amount,
          managerName: managerName || "Unknown",
          courseType,
          paymentType,
        } as RevenueRow;
      })
      .filter((row): row is RevenueRow => {
        if (!row) return false;
        if (Number.isNaN(row.amount)) return false;
        // Check if date is valid
        if (!row.date || isNaN(row.date.getTime())) {
          console.warn(`[RevenueSheets] Invalid date found, skipping row`);
          return false;
        }
        return true;
      })
      .filter((row) => {
        const isInRange = row.date >= from && row.date <= to;
        return isInRange;
      });
    
    console.log(`[RevenueSheets] Returning ${processedRows.length} revenue rows after filtering`);
    if (processedRows.length > 0) {
      console.log(`[RevenueSheets] Sample row:`, processedRows[0]);
    }
    return processedRows;
  } catch (error) {
    console.error("[RevenueSheets] Error fetching revenue from Google Sheets:", error);
    return [];
  }
}