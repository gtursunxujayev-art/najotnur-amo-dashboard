// config/dashboardConfig.ts

export type DashboardConfig = {
  WON_STATUS_IDS: number[];
  QUALIFIED_STATUS_IDS: number[];
  QUALIFIED_LOSS_REASON_IDS: number[];
  NOT_QUALIFIED_REASON_IDS: number[];
  ONLINE_DEAL_STATUS_IDS: number[]; // deprecated, kept for compatibility
  OFFLINE_DEAL_STATUS_IDS: number[]; // deprecated, kept for compatibility
  PIPELINE_IDS: number[];
  LEAD_SOURCE_FIELD_ID: number | null;
  COURSE_TYPE_FIELD_ID: number | null;
  ONLINE_COURSE_ENUM_IDS: number[];
  OFFLINE_COURSE_ENUM_IDS: number[];
  USE_AMO_CALLS: boolean;
  USE_SHEETS_CALLS: boolean;
};

export const dashboardConfig: DashboardConfig = {
  WON_STATUS_IDS: [79190542, 142],
  QUALIFIED_STATUS_IDS: [79190526, 79190530, 79190534, 79199558, 79198062, 79190538, 79190542, 142],
  QUALIFIED_LOSS_REASON_IDS: [6, 10, 7, 11],
  NOT_QUALIFIED_REASON_IDS: [0, 1, 2, 3, 4, 5, 8, 9, 12, 13],
  ONLINE_DEAL_STATUS_IDS: [], // now we use Kurs turi enums instead
  OFFLINE_DEAL_STATUS_IDS: [], // now we use Kurs turi enums instead
  PIPELINE_IDS: [9975586],
  LEAD_SOURCE_FIELD_ID: 1312637,
  COURSE_TYPE_FIELD_ID: 1119699,
  ONLINE_COURSE_ENUM_IDS: [2, 3, 6, 7],
  OFFLINE_COURSE_ENUM_IDS: [0, 4, 5],
  USE_AMO_CALLS: true,
  USE_SHEETS_CALLS: false,
};