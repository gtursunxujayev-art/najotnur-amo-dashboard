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

function colLetterToIndex(letter: string): number {
  const l = letter.trim().toUpperCase();
  if (!l) return -1;
  const code = l.charCodeAt(0);
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
    const sheets = await getGoogleSheetsClient();
    
    // We read columns A:Z of the first sheet
    const range = "A:Z";

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows: string[][] = response.data.values || [];
    if (rows.length <= 1) return [];

    const dateIdx = colLetterToIndex(dashboardConfig.REVENUE_DATE_COLUMN);
    const amountIdx = colLetterToIndex(dashboardConfig.REVENUE_AMOUNT_COLUMN);
    const courseIdx = colLetterToIndex(dashboardConfig.REVENUE_COURSE_TYPE_COLUMN);
    const managerIdx = colLetterToIndex(dashboardConfig.REVENUE_MANAGER_COLUMN);
    const paymentIdx = colLetterToIndex(dashboardConfig.REVENUE_PAYMENT_TYPE_COLUMN);

    const safeIndex = (arr: any[], idx: number) =>
      idx >= 0 && idx < arr.length ? arr[idx] : "";

    return rows
      .slice(1) // skip header
      .map((r) => {
        const dateStr = String(safeIndex(r, dateIdx) || "").trim();
        if (!dateStr) return null;

        const dt = new Date(dateStr); // expects something like 2025-03-15 or with time

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
      .filter((row): row is RevenueRow => !!row && !Number.isNaN(row.amount))
      .filter(
        (row) => row.date >= from && row.date <= to
      );
  } catch (error) {
    console.error("Error fetching revenue from Google Sheets:", error);
    return [];
  }
}