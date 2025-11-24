// config/dashboardConfig.ts

export type RevenueSheetsConfig = {
  link: string;
  managerColumn: string;
  dateColumn: string;
  paymentTypeColumn: string;
  incomeTypeColumn: string; // online/offline income type
  amountColumn: string;
  courseTypeColumn: string;
};

export type DashboardConfig = {
  // --- amoCRM constructor ---
  PIPELINE_IDS: number[];
  QUALIFIED_STATUS_IDS: number[];
  WON_STATUS_IDS: number[];
  LOST_STATUS_IDS: number[];

  // Loss reasons (amo standard)
  QUALIFIED_LOSS_REASON_IDS: number[];
  NOT_QUALIFIED_REASON_IDS: number[];

  // ✅ NEW: custom field for objections (E’tiroz sababi)
  OBJECTION_FIELD_ID: number | null;

  // custom fields
  LEAD_SOURCE_FIELD_ID: number | null;
  COURSE_TYPE_FIELD_ID: number | null;
  
  // Partial payment field (for kelishuvSummasi calculation)
  PARTIAL_PAYMENT_FIELD_ID: number | null;
  PARTIAL_PAYMENT_STATUS_ID: number;

  ONLINE_COURSE_ENUM_IDS: number[];
  OFFLINE_COURSE_ENUM_IDS: number[];

  USE_AMO_CALLS: boolean;
  USE_SHEETS_CALLS: boolean;

  // --- tushum Sheets ---
  REVENUE_SHEETS: RevenueSheetsConfig;

  // BACKWARD-COMPAT aliases (lib/revenueSheets.ts ishlatadi)
  REVENUE_SHEETS_URL: string;
  REVENUE_MANAGER_COLUMN: string;
  REVENUE_DATE_COLUMN: string;
  REVENUE_PAYMENT_TYPE_COLUMN: string;
  REVENUE_INCOME_TYPE_COLUMN: string;
  REVENUE_AMOUNT_COLUMN: string;
  REVENUE_COURSE_TYPE_COLUMN: string;
};

function applyRevenueAliases(c: DashboardConfig) {
  c.REVENUE_SHEETS_URL = c.REVENUE_SHEETS.link || "";
  c.REVENUE_MANAGER_COLUMN = c.REVENUE_SHEETS.managerColumn || "";
  c.REVENUE_DATE_COLUMN = c.REVENUE_SHEETS.dateColumn || "";
  c.REVENUE_PAYMENT_TYPE_COLUMN = c.REVENUE_SHEETS.paymentTypeColumn || "";
  c.REVENUE_INCOME_TYPE_COLUMN = c.REVENUE_SHEETS.incomeTypeColumn || "";
  c.REVENUE_AMOUNT_COLUMN = c.REVENUE_SHEETS.amountColumn || "";
  c.REVENUE_COURSE_TYPE_COLUMN = c.REVENUE_SHEETS.courseTypeColumn || "";
}

const cfg: DashboardConfig = {
  "PIPELINE_IDS": [
    9975586
  ],
  "QUALIFIED_STATUS_IDS": [
    79198062,
    79190542,
    142,
    79199558,
    79190534,
    79190530,
    79190526
  ],
  "WON_STATUS_IDS": [
    142,
    79190542
  ],
  "LOST_STATUS_IDS": [
    143
  ],
  "QUALIFIED_LOSS_REASON_IDS": [
    923397,
    923603,
    927869,
    927871
  ],
  "NOT_QUALIFIED_REASON_IDS": [
    927873,
    930117,
    927867,
    927865,
    886101,
    885455,
    885519,
    881379,
    672845,
    672843
  ],
  "OBJECTION_FIELD_ID": 1121759,
  "LEAD_SOURCE_FIELD_ID": 1312637,
  "COURSE_TYPE_FIELD_ID": 1119699,
  "PARTIAL_PAYMENT_FIELD_ID": 1416675,
  "PARTIAL_PAYMENT_STATUS_ID": 79190542,
  "ONLINE_COURSE_ENUM_IDS": [
    865961,
    865963,
    865959,
    923327,
    923329
  ],
  "OFFLINE_COURSE_ENUM_IDS": [
    671757,
    865965,
    865967
  ],
  "USE_AMO_CALLS": true,
  "USE_SHEETS_CALLS": false,
  "REVENUE_SHEETS": {
    "link": "1WmYVOW6surq2eG03WBE8mJGn2CnTaB-cgeQTrsqJnZo",
    "managerColumn": "Asosiy!B",
    "dateColumn": "Asosiy!A",
    "paymentTypeColumn": "Asosiy!D",
    "incomeTypeColumn": "Asosiy!D",
    "amountColumn": "Asosiy!E",
    "courseTypeColumn": "Asosiy!C"
  },
  "REVENUE_SHEETS_URL": "",
  "REVENUE_MANAGER_COLUMN": "",
  "REVENUE_DATE_COLUMN": "",
  "REVENUE_PAYMENT_TYPE_COLUMN": "",
  "REVENUE_INCOME_TYPE_COLUMN": "",
  "REVENUE_AMOUNT_COLUMN": "",
  "REVENUE_COURSE_TYPE_COLUMN": ""
};

applyRevenueAliases(cfg);

export const dashboardConfig = cfg;
export const DASHBOARD_CONFIG = cfg;
export default cfg;