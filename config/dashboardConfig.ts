// config/dashboardConfig.ts

/**
 * Dashboard configuration:
 * - Which statuses mean WON / QUALIFIED / NOT QUALIFIED / ONLINE / OFFLINE
 * - Which pipelines to include
 * - Whether to use amoCRM calls and/or Google Sheets calls
 */

export type DashboardConfig = {
  WON_STATUS_IDS: number[];
  QUALIFIED_STATUS_IDS: number[];
  NOT_QUALIFIED_STATUS_IDS: number[];
  ONLINE_DEAL_STATUS_IDS: number[];
  OFFLINE_DEAL_STATUS_IDS: number[];
  PIPELINE_IDS: number[]; // empty = all pipelines
  USE_AMO_CALLS: boolean;
  USE_SHEETS_CALLS: boolean;
};

export const dashboardConfig: DashboardConfig = {
  // Default amoCRM "Won" status id is often 142 – but check in your account.
  WON_STATUS_IDS: [142],

  // Statuses that mean "qualified lead" (client is suitable, we can sell).
  QUALIFIED_STATUS_IDS: [],

  // Statuses that mean "not qualified lead"
  NOT_QUALIFIED_STATUS_IDS: [],

  // Statuses where deal is for ONLINE course (Kelishuv summasi online)
  ONLINE_DEAL_STATUS_IDS: [],

  // Statuses where deal is for OFFLINE course
  OFFLINE_DEAL_STATUS_IDS: [],

  // If empty → include all pipelines. Otherwise, only these pipeline IDs.
  PIPELINE_IDS: [],

  // Sources for call statistics:
  USE_AMO_CALLS: true,   // all calls from amoCRM notes
  USE_SHEETS_CALLS: false, // successful calls from Google Sheets (optional)
};
