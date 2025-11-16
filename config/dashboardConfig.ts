// config/dashboardConfig.ts

export type DashboardConfig = {
  WON_STATUS_IDS: number[];              // stages counted as Won
  QUALIFIED_STATUS_IDS: number[];        // stages counted as Qualified
  QUALIFIED_LOSS_REASON_IDS: number[];   // loss reasons that still count as Qualified
  NOT_QUALIFIED_REASON_IDS: number[];    // loss reasons for Not Qualified
  ONLINE_DEAL_STATUS_IDS: number[];      // stages for Online deals
  OFFLINE_DEAL_STATUS_IDS: number[];     // stages for Offline deals
  PIPELINE_IDS: number[];                // limit to these pipelines (empty = all)
  LEAD_SOURCE_FIELD_ID: number | null;   // {Qayerdan} custom field id
  USE_AMO_CALLS: boolean;
  USE_SHEETS_CALLS: boolean;
};

// DEFAULTS — change later via Admin constructor.
export const dashboardConfig: DashboardConfig = {
  WON_STATUS_IDS: [],                    // e.g. [555555]
  QUALIFIED_STATUS_IDS: [],              // e.g. [222222, 333333, 444444]
  QUALIFIED_LOSS_REASON_IDS: [],         // e.g. [1, 2]
  NOT_QUALIFIED_REASON_IDS: [],          // e.g. [3, 4]
  ONLINE_DEAL_STATUS_IDS: [],
  OFFLINE_DEAL_STATUS_IDS: [],
  PIPELINE_IDS: [],
  LEAD_SOURCE_FIELD_ID: null,
  USE_AMO_CALLS: true,
  USE_SHEETS_CALLS: false,
};
