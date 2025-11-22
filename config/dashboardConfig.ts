// config/dashboardConfig.ts
// One config object, grouped + backward compatible aliases.
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
  QUALIFIED_LOSS_REASON_IDS: [] as number[],
  NOT_QUALIFIED_REASON_IDS: [] as number[],
  NON_QUALIFIED_LOSS_REASON_IDS: [] as number[],

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
  // Added courseTypeColumn because old revenueSheets.ts expects it.
  // ------------------------------------------------------------------
  REVENUE_SHEETS: {
    link: "",
    managerColumn: "",        // "Baza!A"
    dateColumn: "",           // "Baza!B"
    paymentTypeColumn: "",    // "Baza!C"
    incomeTypeColumn: "",     // "Baza!D"
    amountColumn: "",         // "Baza!E"
    courseTypeColumn: "",     // ✅ new (if your sheet has course type)
  },

  // ------------------------------------------------------------------
  // ✅ BACKWARD-COMPATIBLE ALIASES (old code expects these)
  // ------------------------------------------------------------------
  REVENUE_SHEETS_URL: "",

  REVENUE_MANAGER_COLUMN: "",
  REVENUE_DATE_COLUMN: "",
  REVENUE_PAYMENT_TYPE_COLUMN: "",
  REVENUE_INCOME_TYPE_COLUMN: "",
  REVENUE_AMOUNT_COLUMN: "",
  REVENUE_COURSE_TYPE_COLUMN: "",  // ✅ required by lib/revenueSheets.ts
};

// ------------------------------------------------------------------
// Mirror grouped config → old aliases on import
// ------------------------------------------------------------------
dashboardConfig.REVENUE_SHEETS_URL = dashboardConfig.REVENUE_SHEETS.link;
dashboardConfig.REVENUE_MANAGER_COLUMN = dashboardConfig.REVENUE_SHEETS.managerColumn;
dashboardConfig.REVENUE_DATE_COLUMN = dashboardConfig.REVENUE_SHEETS.dateColumn;
dashboardConfig.REVENUE_PAYMENT_TYPE_COLUMN =
  dashboardConfig.REVENUE_SHEETS.paymentTypeColumn;
dashboardConfig.REVENUE_INCOME_TYPE_COLUMN =
  dashboardConfig.REVENUE_SHEETS.incomeTypeColumn;
dashboardConfig.REVENUE_AMOUNT_COLUMN =
  dashboardConfig.REVENUE_SHEETS.amountColumn;
dashboardConfig.REVENUE_COURSE_TYPE_COLUMN =
  dashboardConfig.REVENUE_SHEETS.courseTypeColumn;

// Backward-compatible exports
export const DASHBOARD_CONFIG = dashboardConfig;
export const REVENUE_SHEETS = dashboardConfig.REVENUE_SHEETS;