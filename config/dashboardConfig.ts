// config/dashboardConfig.ts
// MUST stay compatible with current imports in lib/dashboard.ts

export const dashboardConfig = {
  // ------------------------------------------------------------------
  // amoCRM pipeline filter
  // Your dashboard.ts expects PIPELINE_IDS (array)
  // ------------------------------------------------------------------
  PIPELINE_IDS: [] as number[], // ✅ used in dashboard.ts
  PIPELINE_ID: null as number | null, // ✅ kept for old UI/logic (optional)

  // ------------------------------------------------------------------
  // Status IDs
  // ------------------------------------------------------------------
  QUALIFIED_STATUS_IDS: [] as number[],
  WON_STATUS_IDS: [] as number[],
  LOST_STATUS_IDS: [] as number[],

  // ------------------------------------------------------------------
  // Custom field IDs (amoCRM)
  // ------------------------------------------------------------------
  LEAD_SOURCE_FIELD_ID: null as number | null, // "Qayerdan"
  COURSE_TYPE_FIELD_ID: null as number | null, // "Kurs turi"

  // ------------------------------------------------------------------
  // Course type values (strings from Amo custom field)
  // ------------------------------------------------------------------
  ONLINE_TYPES: [] as string[],
  OFFLINE_TYPES: [] as string[],

  // ------------------------------------------------------------------
  // Calls sources toggles
  // ------------------------------------------------------------------
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

// Backward-compatible named exports
export const DASHBOARD_CONFIG = dashboardConfig;
export const REVENUE_SHEETS = dashboardConfig.REVENUE_SHEETS;