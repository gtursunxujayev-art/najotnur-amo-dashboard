// config/dashboardConfig.ts

export type DashboardConfig = {
  WON_STATUS_IDS: number[];
  QUALIFIED_STATUS_IDS: number[];
  QUALIFIED_LOSS_REASON_IDS: number[];      
  NOT_QUALIFIED_REASON_IDS: number[];       
  PIPELINE_IDS: number[];
  LEAD_SOURCE_FIELD_ID: number | null;
  COURSE_TYPE_FIELD_ID: number | null;
  ONLINE_COURSE_ENUM_IDS: number[];
  OFFLINE_COURSE_ENUM_IDS: number[];

  ETIROZ_FIELD_ID: number | null;            // NEW
  USE_AMO_CALLS: boolean;
  USE_SHEETS_CALLS: boolean;
};

export const dashboardConfig: DashboardConfig = {
  WON_STATUS_IDS: [142], // example
  QUALIFIED_STATUS_IDS: [],
  QUALIFIED_LOSS_REASON_IDS: [],
  NOT_QUALIFIED_REASON_IDS: [],
  PIPELINE_IDS: [9975586],

  LEAD_SOURCE_FIELD_ID: 1312637,
  COURSE_TYPE_FIELD_ID: 1119699,
  ONLINE_COURSE_ENUM_IDS: [2,3,6,7],
  OFFLINE_COURSE_ENUM_IDS: [0,4,5],

  ETIROZ_FIELD_ID: 1121759,                 // ← your value

  USE_AMO_CALLS: true,
  USE_SHEETS_CALLS: false,
};