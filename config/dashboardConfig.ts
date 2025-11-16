// config/dashboardConfig.ts

/**
 * Dashboard configuration:
 * - Which statuses mean WON / QUALIFIED / NOT QUALIFIED / ONLINE / OFFLINE
 * - Which pipelines to include
 * - How to treat non-qualified reasons
 * - Which custom field is "lead source" (Qayerdan)
 * - Whether to use amoCRM calls and/or Google Sheets calls
 */

export type DashboardConfig = {
  WON_STATUS_IDS: number[];
  QUALIFIED_STATUS_IDS: number[];
  NOT_QUALIFIED_STATUS_IDS: number[];
  ONLINE_DEAL_STATUS_IDS: number[];
  OFFLINE_DEAL_STATUS_IDS: number[];
  PIPELINE_IDS: number[]; // empty = all pipelines

  // Non-qualified reasons (amoCRM loss_reason_id).
  // If empty => use all reasons.
  // If not empty => only these IDs will be shown separately, others go into "Boshqa sabablar".
  NON_QUALIFIED_REASON_MAIN_IDS: number[];

  // Custom field id for "Qayerdan" (lead source) on lead card.
  // If null => "Lid manbalari" chart is hidden.
  LEAD_SOURCE_FIELD_ID: number | null;

  USE_AMO_CALLS: boolean;
  USE_SHEETS_CALLS: boolean;
};

export const dashboardConfig: DashboardConfig = {
  // Default amoCRM "Won" status id is often 142 – but check in your account.
  WON_STATUS_IDS: [142],

  // Statuses that mean "sifatli lid" – e.g.:
  // O‘ylab ko‘radi, Coachingga qiziqdi, Onlayn qiziqish bildirdi, ...
  QUALIFIED_STATUS_IDS: [],

  // Statuses that mean "sifatsiz lid" – e.g.:
  // Sotuv (funnel) ichidagi "Muvaffaqiyatsiz" bosqichlari.
  NOT_QUALIFIED_STATUS_IDS: [],

  // Statuses where deal is for ONLINE course (Kelishuv summasi online).
  ONLINE_DEAL_STATUS_IDS: [],

  // Statuses where deal is for OFFLINE course.
  OFFLINE_DEAL_STATUS_IDS: [],

  // If empty → include all pipelines. Otherwise, only these pipeline IDs.
  PIPELINE_IDS: [],

  // Which loss_reason_id values should be shown separately on "Sifatsiz lidlar sabablari".
  // Boshqalar "Boshqa sabablar" guruhiga tushadi.
  NON_QUALIFIED_REASON_MAIN_IDS: [],

  // Custom field id for {Qayerdan} (lead source) on lead card.
  // Put field_id here to enable "Lid manbalari" pie chart.
  LEAD_SOURCE_FIELD_ID: null,

  // Sources for call statistics:
  USE_AMO_CALLS: true, // all calls from amoCRM (call_in / call_out notes)
  USE_SHEETS_CALLS: false, // successful calls from Google Sheets (optional)
};
