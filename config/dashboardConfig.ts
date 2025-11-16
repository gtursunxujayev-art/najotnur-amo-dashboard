// config/dashboardConfig.ts

export type DashboardConfig = {
  // Which statuses mean "Won deal"
  WON_STATUS_IDS: number[];

  // Which statuses mean "Qualified lead"
  QUALIFIED_STATUS_IDS: number[];

  // Lost reasons that still mean the lead was Qualified
  QUALIFIED_LOSS_REASON_IDS: number[];

  // Lost reasons that mean NOT qualified
  NOT_QUALIFIED_REASON_IDS: number[];

  // Pipelines we include in the dashboard
  PIPELINE_IDS: number[];

  // "Qayerdan" field id (lead source)
  LEAD_SOURCE_FIELD_ID: number | null;

  // "Kurs turi" custom field id (enum field)
  COURSE_TYPE_FIELD_ID: number | null;

  // Enum ids in Kurs turi that mean ONLINE course
  ONLINE_COURSE_ENUM_IDS: number[];

  // Enum ids in Kurs turi that mean OFFLINE course
  OFFLINE_COURSE_ENUM_IDS: number[];

  // Call sources
  USE_AMO_CALLS: boolean;
  USE_SHEETS_CALLS: boolean;
};

export const dashboardConfig: DashboardConfig = {
  // statuses that count as Won
  WON_STATUS_IDS: [79190542, 142],

  // statuses that count as Qualified
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

  // lost reasons that still mean Qualified lead
  QUALIFIED_LOSS_REASON_IDS: [6, 10, 7, 11],

  // lost reasons that mean NOT Qualified lead
  NOT_QUALIFIED_REASON_IDS: [0, 1, 2, 3, 4, 5, 8, 9, 12, 13],

  // Only these pipelines will be used in dashboard
  PIPELINE_IDS: [9975586],

  // "Qayerdan" custom field id
  LEAD_SOURCE_FIELD_ID: 1312637,

  // "Kurs turi" custom field id
  COURSE_TYPE_FIELD_ID: 1119699,

  // Kurs turi enum ids meaning ONLINE course
  ONLINE_COURSE_ENUM_IDS: [2, 3, 6, 7],

  // Kurs turi enum ids meaning OFFLINE course
  OFFLINE_COURSE_ENUM_IDS: [0, 4, 5],

  // Calls
  USE_AMO_CALLS: true,
  USE_SHEETS_CALLS: false,
};