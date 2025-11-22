// config/dashboardConfig.ts
// Must match fields used inside lib/dashboard.ts

export const dashboardConfig = {
  // ------------------------------------------------------------------
  // amoCRM pipeline filter
  // ------------------------------------------------------------------
  PIPELINE_IDS: [] as number[],         // used in dashboard.ts
  PIPELINE_ID: null as number | null,   // kept for old UI (optional)

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
  // Course type mapping
  // Your dashboard.ts uses enum IDs; keep both IDs + string values
  // ------------------------------------------------------------------
  ONLINE_COURSE_ENUM_IDS: [] as number[],  // ✅ expected in dashboard.ts
  OFFLINE_COURSE_ENUM_IDS: [] as number[],// ✅ expected in dashboard.ts

  // (backward-compatible string values if somewhere else used)
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