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
  "PIPELINE_IDS": [],
  "QUALIFIED_STATUS_IDS": [],
  "WON_STATUS_IDS": [],
  "LOST_STATUS_IDS": [],
  "QUALIFIED_LOSS_REASON_IDS": [],
  "NOT_QUALIFIED_REASON_IDS": [],
  "OBJECTION_FIELD_ID": 1121759,
  "LEAD_SOURCE_FIELD_ID": null,
  "COURSE_TYPE_FIELD_ID": null,
  "ONLINE_COURSE_ENUM_IDS": [],
  "OFFLINE_COURSE_ENUM_IDS": [],
  "USE_AMO_CALLS": false,
  "USE_SHEETS_CALLS": false,
  "REVENUE_SHEETS": {
    "link": "https://docs.google.com/spreadsheets/d/1WmYVOW6surq2eG03WBE8mJGn2CnTaB-cgeQTrsqJnZo",
    "managerColumn": "Asosiy!B",
    "dateColumn": "Asosiy!A",
    "paymentTypeColumn": "Asosiy!B",
    "incomeTypeColumn": "Asosiy!B",
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