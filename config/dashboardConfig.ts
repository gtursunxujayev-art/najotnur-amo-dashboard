// config/dashboardConfig.ts

export type DashboardConfig = {
  WON_STATUS_IDS: number[];
  QUALIFIED_STATUS_IDS: number[];
  QUALIFIED_LOSS_REASON_IDS: number[];
  NOT_QUALIFIED_REASON_IDS: number[];
  ONLINE_DEAL_STATUS_IDS: number[];
  OFFLINE_DEAL_STATUS_IDS: number[];
  PIPELINE_IDS: number[];
  LEAD_SOURCE_FIELD_ID: number | null;
  USE_AMO_CALLS: boolean;
  USE_SHEETS_CALLS: boolean;
};

export const dashboardConfig: DashboardConfig = {
  WON_STATUS_IDS: [],
  QUALIFIED_STATUS_IDS: [],
  QUALIFIED_LOSS_REASON_IDS: [],
  NOT_QUALIFIED_REASON_IDS: [],
  ONLINE_DEAL_STATUS_IDS: [],
  OFFLINE_DEAL_STATUS_IDS: [],
  PIPELINE_IDS: [],
  LEAD_SOURCE_FIELD_ID: null,
  USE_AMO_CALLS: true,
  USE_SHEETS_CALLS: false,
};
