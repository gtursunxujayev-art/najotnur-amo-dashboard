// config/dashboardConfig.ts
// Example baseline config (merge with your real CRM IDs)

export const DASHBOARD_CONFIG = {
  // your CRM pipeline and status mapping here
  QUALIFIED_STATUSES: [],
  WON_STATUSES: [],
  LOST_STATUSES: [],
  ONLINE_TYPES: [],
  OFFLINE_TYPES: [],
};

// === Google Sheets revenue integration ===
export const REVENUE_SHEETS = {
  link: "",
  managerColumn: "",
  dateColumn: "",
  paymentTypeColumn: "",
  incomeTypeColumn: "",
  amountColumn: "",
};