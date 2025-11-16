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
  // Stages that mean deal is Won
  WON_STATUS_IDS: [79190542, 142],

  // Stages that mean the lead is Qualified (active interest)
  QUALIFIED_STATUS_IDS: [
    79190526,
    79190530,
    79190534,
    79199558,
    79198062,
    79190538,
    79190542,
    142,
  ],

  // Lost reasons that STILL mean "Qualified" (good lead, but something happened)
  QUALIFIED_LOSS_REASON_IDS: [6, 10, 7, 11],

  // Lost reasons that mean "Not qualified" lead
  NOT_QUALIFIED_REASON_IDS: [0, 1, 2, 3, 4, 5, 8, 9, 12, 13],

  // Kept only for backward compatibility – now we use Kurs turi enums instead.
  ONLINE_DEAL_STATUS_IDS: [],
  OFFLINE_DEAL_STATUS_IDS: [],

  // Pipelines used for dashboard (usually only Sotuv pipeline)
  PIPELINE_IDS: [9975586],

  // Custom field IDs from amoCRM
  LEAD_SOURCE_FIELD_ID: 1312637, // Qayerdan
  COURSE_TYPE_FIELD_ID: 1119699, // Kurs turi

  // Kurs turi enum ids for ONLINE and OFFLINE
  ONLINE_COURSE_ENUM_IDS: [2, 3, 6, 7],
  OFFLINE_COURSE_ENUM_IDS: [0, 4, 5],

  // Calls sources
  USE_AMO_CALLS: true,
  USE_SHEETS_CALLS: false,
};