// config/dashboardConfig.ts
// Main config used by lib/dashboard.ts and lib/revenueSheets.ts
// ✅ MUST export `dashboardConfig` because your code imports it.

// ------------------------------------------------------------------
// amoCRM mapping (filled by Admin → Constructor tab)
// ------------------------------------------------------------------
export const dashboardConfig = {
  // amoCRM base settings
  PIPELINE_ID: null as number | null,

  // Status IDs
  QUALIFIED_STATUS_IDS: [] as number[],
  WON_STATUS_IDS: [] as number[],
  LOST_STATUS_IDS: [] as number[],

  // Custom field IDs (Amo fields)
  LEAD_SOURCE_FIELD_ID: null as number | null, // "Qayerdan"
  COURSE_TYPE_FIELD_ID: null as number | null, // "Kurs turi"

  // Course type values (string values from Amo custom field)
  ONLINE_TYPES: [] as string[],
  OFFLINE_TYPES: [] as string[],

  // Calls sources toggles
  USE_AMO_CALLS: false,
  USE_SHEETS_CALLS: false,

  // ------------------------------------------------------------------
  // ✅ NEW: Google Sheets revenue integration (Admin → Tushum tab)
  // ------------------------------------------------------------------
  REVENUE_SHEETS: {
    link: "",
    managerColumn: "",       // example: "Baza!A"
    dateColumn: "",          // example: "Baza!B"
    paymentTypeColumn: "",   // example: "Baza!C" (first/middle/last)
    incomeTypeColumn: "",    // example: "Baza!D" (online/offline)
    amountColumn: "",        // example: "Baza!E"
  },
};

// ------------------------------------------------------------------
// ✅ Backward-compatible named exports
// (some files may import these separately)
// ------------------------------------------------------------------
export const DASHBOARD_CONFIG = dashboardConfig;
export const REVENUE_SHEETS = dashboardConfig.REVENUE_SHEETS;