// config/dashboardConfig.ts
// One config object, grouped + backward compatible aliases.
// Your code imports { dashboardConfig }.

export const dashboardConfig = {
  PIPELINE_IDS: [
    9975586
  ],
  QUALIFIED_STATUS_IDS: [],
  WON_STATUS_IDS: [],
  LOST_STATUS_IDS: [],
  QUALIFIED_LOSS_REASON_IDS: [
    6,
    9,
    7,
    10
  ],
  NOT_QUALIFIED_REASON_IDS: [
    5,
    4,
    3,
    2,
    1,
    0,
    13,
    12,
    11,
    8
  ],
  LEAD_SOURCE_FIELD_ID: 1312637,
  COURSE_TYPE_FIELD_ID: 1119699,
  ONLINE_COURSE_ENUM_IDS: [
    3,
    1,
    2,
    7,
    6
  ],
  OFFLINE_COURSE_ENUM_IDS: [
    0,
    5,
    4
  ],
  USE_AMO_CALLS: false,
  USE_SHEETS_CALLS: false,
  REVENUE_SHEETS_URL: "",
  REVENUE_MANAGER_COLUMN: "",
  REVENUE_DATE_COLUMN: "",
  REVENUE_PAYMENT_TYPE_COLUMN: "",
  REVENUE_INCOME_TYPE_COLUMN: "",
  REVENUE_AMOUNT_COLUMN: "",
  REVENUE_COURSE_TYPE_COLUMN: ""
};

dashboardConfig.REVENUE_SHEETS_URL = dashboardConfig.REVENUE_SHEETS.link;
dashboardConfig.REVENUE_MANAGER_COLUMN = dashboardConfig.REVENUE_SHEETS.managerColumn;
dashboardConfig.REVENUE_DATE_COLUMN = dashboardConfig.REVENUE_SHEETS.dateColumn;
dashboardConfig.REVENUE_PAYMENT_TYPE_COLUMN = dashboardConfig.REVENUE_SHEETS.paymentTypeColumn;
dashboardConfig.REVENUE_INCOME_TYPE_COLUMN = dashboardConfig.REVENUE_SHEETS.incomeTypeColumn;
dashboardConfig.REVENUE_AMOUNT_COLUMN = dashboardConfig.REVENUE_SHEETS.amountColumn;
dashboardConfig.REVENUE_COURSE_TYPE_COLUMN = dashboardConfig.REVENUE_SHEETS.courseTypeColumn;

export const DASHBOARD_CONFIG = dashboardConfig;
export const REVENUE_SHEETS = dashboardConfig.REVENUE_SHEETS;
