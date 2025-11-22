// config/dashboardConfig.ts
// One config object, but grouped + backward compatible aliases.
// Your code imports { dashboardConfig }.

export const dashboardConfig = {
  // ------------------------------------------------------------------
  // amoCRM pipeline filter
  // ------------------------------------------------------------------
  PIPELINE_IDS: [] as number[],
  PIPELINE_ID: null as number | null,

  // ------------------------------------------------------------------
  // Status IDs
  // ------------------------------------------------------------------
  QUALIFIED_STATUS_IDS: [] as number[],
  WON_STATUS_IDS: [] as number[],
  LOST_STATUS_IDS: [] as number[],

  // ------------------------------------------------------------------
  // Loss reason logic
  // ------------------------------------------------------------------
  QUALIFIED_LOSS_REASON_IDS: [] as number[], // lost but still qualified
  NOT_QUALIFIED_REASON_IDS: [] as number[],  // lost and not qualified
  NON_QUALIFIED_LOSS_REASON_IDS: [] as number[], // optional alias

  // ------------------------------------------------------------------
  // Custom field IDs (amoCRM)
  // ------------------------------------------------------------------
  LEAD_SOURCE_FIELD_ID: null as number | null,
  COURSE_TYPE_FIELD_ID: null as number | null,

  // ------------------------------------------------------------------
  // Course type mapping (enum IDs + string values)
  // ------------------------------------------------------------------
  ONLINE_COURSE_ENUM_IDS: [] as number[],
  OFFLINE_COURSE_ENUM_IDS: [] as number[],

  ONLINE_TYPES: [] as string[],
  OFFLINE_TYPES: [] as string[],

  // ------------------------------------------------------------------
  // Calls sources toggles
  // ------------------------------------------------------------------
  USE_AMO_CALLS: false,
  USE_SHEETS_CALLS: false,

  // ------------------------------------------------------------------
  // ✅ NEW grouped revenue config (Admin → Tushum tab)
  // ------------------------------------------------------------------
  REVENUE_SHEETS: {
    link: "",                // Google sheets full link
    managerColumn: "",       // example: "Baza!A"
    dateColumn: "",          // example: "Baza!B"
    paymentTypeColumn: "",   // example: "Baza!C"
    incomeTypeColumn: "",    // example: "Baza!D"
    amountColumn: "",        // example: "Baza!E"
  },

  // ------------------------------------------------------------------
  // ✅ BACKWARD-COMPATIBLE ALIASES (old code expects these)
  // We keep them so lib/revenueSheets.ts and others don’t break.
  // They always mirror REVENUE_SHEETS above.
  // ------------------------------------------------------------------

  // old name for link
  REVENUE_SHEETS_URL: "",

  // old column names (if your revenueSheets.ts uses them)
  REVENUE_MANAGER_COLUMN: "",
  REVENUE_DATE_COLUMN: "",
  REVENUE_PAYMENT_TYPE_COLUMN: "",
  REVENUE_INCOME_TYPE_COLUMN: "",
  REVENUE_AMOUNT_COLUMN: "",
};

// --------------------------------------------------------------
// Small helper to sync aliases when Admin saves grouped config.
// IMPORTANT: save-config route should update BOTH grouped + aliases,
// but even if it only updates grouped, we can mirror here on import.
// --------------------------------------------------------------
dashboardConfig.REVENUE_SHEETS_URL = dashboardConfig.REVENUE_SHEETS.link;
dashboardConfig.REVENUE_MANAGER_COLUMN = dashboardConfig.REVENUE_SHEETS.managerColumn;
dashboardConfig.REVENUE_DATE_COLUMN = dashboardConfig.REVENUE_SHEETS.dateColumn;
dashboardConfig.REVENUE_PAYMENT_TYPE_COLUMN =
  dashboardConfig.REVENUE_SHEETS.paymentTypeColumn;
dashboardConfig.REVENUE_INCOME_TYPE_COLUMN =
  dashboardConfig.REVENUE_SHEETS.incomeTypeColumn;
dashboardConfig.REVENUE_AMOUNT_COLUMN =
  dashboardConfig.REVENUE_SHEETS.amountColumn;

// Backward-compatible exports
export const DASHBOARD_CONFIG = dashboardConfig;
export const REVENUE_SHEETS = dashboardConfig.REVENUE_SHEETS;