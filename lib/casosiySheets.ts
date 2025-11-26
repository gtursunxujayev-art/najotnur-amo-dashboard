import { getGoogleSheetsClient } from "./googleSheetsClient";

export type CasosiyRow = {
  date: Date;
  manager: string;
  courseType: string;
  paymentType: string;
  paymentSum: number;
  debtSum: number;
  kelishuv: number;
};

/**
 * Fetches data from Casosiy sheet in Google Sheets
 * Spreadsheet: https://docs.google.com/spreadsheets/d/1WmYVOW6surq2eG03WBE8mJGn2CnTaB-cgeQTrsqJnZo
 * 
 * Columns:
 * A - Date (YYYY-MM-DD)
 * B - Managers
 * C - Course type (Ofline/Online)
 * D - Type of tarif/Payment type
 * E - Sum of payment (Tushum)
 * F - Sum of debt (Qarzdorlik)
 * G - Kelishuv (Agreement amount)
 */
export async function getCasosiyData(
  from: Date,
  to: Date
): Promise<CasosiyRow[]> {
  const SPREADSHEET_ID = "1WmYVOW6surq2eG03WBE8mJGn2CnTaB-cgeQTrsqJnZo";
  const RANGE = "Casosiy!A:G";

  try {
    console.log(`[CasosiySheets] Fetching data from spreadsheet ${SPREADSHEET_ID}`);
    const sheets = await getGoogleSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows: string[][] = response.data.values || [];
    console.log(`[CasosiySheets] Got ${rows.length} rows from Google Sheets`);

    if (rows.length <= 1) {
      console.log(`[CasosiySheets] No data rows found (only header or empty)`);
      return [];
    }

    const processedRows: CasosiyRow[] = rows
      .slice(1) // Skip header
      .map((row) => {
        const [dateStr, manager, courseType, paymentType, paymentSumStr, debtSumStr, kelishuvStr] = row;
        
        try {
          const date = new Date(dateStr);
          const paymentSum = parseInt(paymentSumStr?.replace(/\s+/g, "") || "0", 10);
          const debtSum = parseInt(debtSumStr?.replace(/\s+/g, "") || "0", 10);
          const kelishuv = parseInt(kelishuvStr?.replace(/\s+/g, "") || "0", 10);
          
          return {
            date,
            manager: manager?.trim() || "Unknown",
            courseType: courseType?.trim() || "Unknown",
            paymentType: paymentType?.trim() || "Unknown",
            paymentSum,
            debtSum,
            kelishuv,
          };
        } catch (err) {
          console.error(`[CasosiySheets] Error parsing row:`, row, err);
          return null;
        }
      })
      .filter((row): row is CasosiyRow => row !== null && row.date >= from && row.date <= to);

    console.log(`[CasosiySheets] Returning ${processedRows.length} rows after filtering`);
    return processedRows;
  } catch (error) {
    console.error("[CasosiySheets] Error fetching data:", error);
    return [];
  }
}
