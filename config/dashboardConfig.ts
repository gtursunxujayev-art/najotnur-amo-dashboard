// config/dashboardConfig.ts

/**
 * Here you configure which amoCRM status IDs mean:
 * - Won
 * - Qualified
 * - Not qualified (with reasons)
 * - Online deals
 * - Offline deals
 *
 * You MUST open your pipeline settings in amoCRM and put correct IDs here.
 */

export type DashboardConfig = {
  WON_STATUS_IDS: number[];
  QUALIFIED_STATUS_IDS: number[];
  NOT_QUALIFIED_STATUS_IDS: number[];
  ONLINE_DEAL_STATUS_IDS: number[];
  OFFLINE_DEAL_STATUS_IDS: number[];
};

export const dashboardConfig: DashboardConfig = {
  // Default amoCRM "Won" status id is usually 142 – check in your pipeline.
  WON_STATUS_IDS: [142],

  // Statuses that mean "qualified lead" (client is suitable, we can sell).
  QUALIFIED_STATUS_IDS: [],

  // Statuses that mean "not qualified lead"
  NOT_QUALIFIED_STATUS_IDS: [],

  // Statuses where deal is for ONLINE course (Kelishuv summasi online)
  ONLINE_DEAL_STATUS_IDS: [],

  // Statuses where deal is for OFFLINE course
  OFFLINE_DEAL_STATUS_IDS: [],
};
