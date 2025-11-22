// config/dashboardConfig.ts
// Must match all fields referenced in lib/dashboard.ts

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
  QUALIFIED_LOSS_REASON_IDS: [] as number[], // lost reasons that still count as qualified
  NOT_QUALIFIED_REASON_IDS: [] as number[],  // ✅ required by dashboard.ts
  NON_QUALIFIED_LOSS_REASON_IDS: [] as number[], // optional alias/safety

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
  // ✅ Google Sheets revenue integration (Admin → Tushum tab)
  // ------------------------------------------------------------------
  REVENUE_SHEETS: {
    link: "",
    managerColumn: "",
    dateColumn: "",
    paymentTypeColumn: "",
    incomeTypeColumn: "",
    amountColumn: "",
  },
};

// Backward-compatible named exports
export const DASHBOARD_CONFIG = dashboardConfig;
export const REVENUE_SHEETS = dashboardConfig.REVENUE_SHEETS;