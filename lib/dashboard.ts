// lib/dashboard.ts
import { AmoLead, getLeadsByCreatedAt } from "@/lib/amocrm";
import { dashboardConfig } from "@/config/dashboardConfig";
import { getSheetCalls } from "@/lib/googleSheets";
import { getAmoCalls } from "@/lib/amoCalls";
import { getSheetRevenue } from "@/lib/revenueSheets";

export type Period =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth";

export type ManagerSalesRow = {
  manager: string;
  leads: number;
  qualified: number;
  won: number;
  revenue: number;
};

export type DashboardData = {
  // ✅ legacy fields for current UI (aliases)
  periodLabel: string;

  kelishuvSummasi: number;
  onlineSummasi: number;
  offlineSummasi: number;

  leadsCount: number;
  qualifiedLeadsCount: number;
  notQualifiedLeadsCount: number;
  nonQualifiedLeadsCount: number;
  wonLeadsCount: number;

  conversionFromQualified: number; // ratio [0..1]

  // ✅ Revenue legacy + new universal field
  tushum: number;           // universal "tushum" (periodga qarab)
  haftalikTushum: number;  // legacy
  kunlikTushum: number;    // legacy
  oylikTushum: number;     // legacy

  // ✅ legacy array alias
  nonQualifiedReasons: { name: string; count: number }[]; // UI uses this
  notQualifiedReasons: { name: string; count: number }[]; // new name

  // ✅ legacy managers sales alias
  managerSales: ManagerSalesRow[];   // UI uses this
  managersSales: ManagerSalesRow[];  // new name

  // main stats (new names)
  leadsTotal: number;
  qualifiedLeads: number;
  notQualifiedLeads: number;
  wonLeads: number;
  onlineWonCount: number;
  offlineWonCount: number;
  conversionQualifiedToWon: number; // percentage [0..100]

  leadSources: { name: string; count: number }[];

  callsByManagers: {
    manager: string;
    totalCalls: number;
    successCalls: number;
    totalDurationMin: number;
    avgDurationSec: number;
  }[];

  revenueTotal: number;
  revenueOnline: number;
  revenueOffline: number;
};

// -------------------------
// helpers
// -------------------------
function inRange(d: Date, from: Date, to: Date) {
  return d >= from && d <= to;
}

function getPeriodRange(period: Period) {
  const now = new Date();

  const dayStart = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate(), 0, 0, 0);
  const dayEnd = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate(), 23, 59, 59);

  if (period === "today") return { from: dayStart(now), to: dayEnd(now) };

  if (period === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { from: dayStart(y), to: dayEnd(y) };
  }

  if (period === "thisWeek" || period === "lastWeek") {
    const d = new Date(now);
    const day = d.getDay(); // 0 sunday
    const mondayOffset = (day + 6) % 7;
    d.setDate(d.getDate() - mondayOffset);

    const weekStart = dayStart(d);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    if (period === "thisWeek")
      return { from: weekStart, to: dayEnd(weekEnd) };

    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
    return { from: lastWeekStart, to: dayEnd(lastWeekEnd) };
  }

  if (period === "thisMonth" || period === "lastMonth") {
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    if (period === "thisMonth")
      return { from: dayStart(mStart), to: dayEnd(mEnd) };

    const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: dayStart(lmStart), to: dayEnd(lmEnd) };
  }

  return { from: dayStart(now), to: dayEnd(now) };
}

function periodLabel(period: Period) {
  switch (period) {
    case "today":
      return "Bugun (kunlik hisobot)";
    case "yesterday":
      return "Kecha (kunlik hisobot)";
    case "thisWeek":
      return "Bu hafta (haftalik hisobot)";
    case "lastWeek":
      return "O‘tgan hafta (haftalik hisobot)";
    case "thisMonth":
      return "Bu oy (oylik hisobot)";
    case "lastMonth":
      return "O‘tgan oy (oylik hisobot)";
    default:
      return "Hisobot";
  }
}

function leadCreatedAt(lead: AmoLead): Date {
  return new Date((lead.created_at || 0) * 1000);
}

function isInSelectedPipeline(lead: AmoLead) {
  if (!dashboardConfig.PIPELINE_IDS?.length) return true;
  return dashboardConfig.PIPELINE_IDS.includes(lead.pipeline_id || -1);
}

function isQualified(lead: AmoLead) {
  const sid = lead.status_id || -1;
  if (dashboardConfig.QUALIFIED_STATUS_IDS.includes(sid)) return true;

  if (dashboardConfig.LOST_STATUS_IDS.includes(sid)) {
    const lr = lead.loss_reason_id;
    if (
      lr != null &&
      dashboardConfig.QUALIFIED_LOSS_REASON_IDS.includes(lr)
    ) {
      return true;
    }
  }
  return false;
}

function isWon(lead: AmoLead) {
  return dashboardConfig.WON_STATUS_IDS.includes(lead.status_id || -1);
}

function isLost(lead: AmoLead) {
  return dashboardConfig.LOST_STATUS_IDS.includes(lead.status_id || -1);
}

// amo lead.custom_fields_values helper
function getCustomField(lead: any, fieldId: number) {
  const arr = lead?.custom_fields_values || [];
  return arr.find((f: any) => f.field_id === fieldId);
}

function getCustomFieldStringLocal(lead: any, fieldId: number): string | null {
  const f = getCustomField(lead, fieldId);
  if (!f?.values?.length) return null;
  const v = f.values[0]?.value;
  return v == null ? null : String(v);
}

function getCustomFieldEnumIdLocal(lead: any, fieldId: number): number | null {
  const f = getCustomField(lead, fieldId);
  if (!f?.values?.length) return null;
  const e = f.values[0]?.enum_id;
  return typeof e === "number" ? e : null;
}

function getObjectionKey(lead: AmoLead): number | null {
  if (dashboardConfig.OBJECTION_FIELD_ID) {
    const enumId = getCustomFieldEnumIdLocal(
      lead,
      dashboardConfig.OBJECTION_FIELD_ID
    );
    if (enumId != null) return enumId;
  }

  if (lead.loss_reason_id != null) return lead.loss_reason_id;
  return null;
}

// -------------------------
// MAIN
// -------------------------
export async function buildDashboardData(
  period: Period
): Promise<DashboardData> {
  const { from, to } = getPeriodRange(period);

  const allLeads = await getLeadsByCreatedAt(from, to);

  const leads = allLeads
    .filter((l) => inRange(leadCreatedAt(l), from, to))
    .filter(isInSelectedPipeline);

  let qualifiedCount = 0;
  let wonCount = 0;
  let onlineWonCount = 0;
  let offlineWonCount = 0;

  const notQualifiedReasonsCount = new Map<number, number>();
  const leadSourcesCount = new Map<string, number>();
  const managersMap = new Map<
    string,
    { leads: number; qualified: number; won: number; revenue: number }
  >();

  const isOnlineDeal = (lead: AmoLead) =>
    dashboardConfig.ONLINE_COURSE_ENUM_IDS.length > 0 &&
    dashboardConfig.COURSE_TYPE_FIELD_ID != null &&
    dashboardConfig.ONLINE_COURSE_ENUM_IDS.includes(
      getCustomFieldEnumIdLocal(
        lead,
        dashboardConfig.COURSE_TYPE_FIELD_ID
      ) ?? -1
    );

  const isOfflineDeal = (lead: AmoLead) =>
    dashboardConfig.OFFLINE_COURSE_ENUM_IDS.length > 0 &&
    dashboardConfig.COURSE_TYPE_FIELD_ID != null &&
    dashboardConfig.OFFLINE_COURSE_ENUM_IDS.includes(
      getCustomFieldEnumIdLocal(
        lead,
        dashboardConfig.COURSE_TYPE_FIELD_ID
      ) ?? -1
    );

  leads.forEach((lead) => {
    const manager = (lead as any).responsible_user_name || "Unknown";
    const m =
      managersMap.get(manager) || { leads: 0, qualified: 0, won: 0, revenue: 0 };

    m.leads += 1;

    const q = isQualified(lead);
    const w = isWon(lead);

    if (q) {
      qualifiedCount += 1;
      m.qualified += 1;
    }

    if (w) {
      wonCount += 1;
      m.won += 1;

      if (isOnlineDeal(lead)) onlineWonCount += 1;
      if (isOfflineDeal(lead)) offlineWonCount += 1;
    }

    if (dashboardConfig.LEAD_SOURCE_FIELD_ID) {
      const source =
        getCustomFieldStringLocal(
          lead,
          dashboardConfig.LEAD_SOURCE_FIELD_ID
        ) || "Unknown source";
      leadSourcesCount.set(source, (leadSourcesCount.get(source) || 0) + 1);
    }

    if (isLost(lead) && !q) {
      const key = getObjectionKey(lead);
      if (key != null) {
        notQualifiedReasonsCount.set(
          key,
          (notQualifiedReasonsCount.get(key) || 0) + 1
        );
      }
    }

    managersMap.set(manager, m);
  });

  // conversions
  const conversionFromQualified =
    qualifiedCount > 0 ? wonCount / qualifiedCount : 0;

  const conversionQualifiedToWon =
    qualifiedCount > 0
      ? Number(((wonCount / qualifiedCount) * 100).toFixed(1))
      : 0;

  // Calls
  let callsByManagers: DashboardData["callsByManagers"] = [];
  if (dashboardConfig.USE_AMO_CALLS) {
    callsByManagers = await getAmoCalls(from, to);
  } else if (dashboardConfig.USE_SHEETS_CALLS) {
    callsByManagers = await getSheetCalls(from, to);
  }

  // Revenue (Sheets)
  const revenueRows = await getSheetRevenue(from, to);
  let revenueTotal = 0;
  let revenueOnline = 0;
  let revenueOffline = 0;

  revenueRows.forEach((r) => {
    revenueTotal += r.amount;
    if (r.incomeType === "online") revenueOnline += r.amount;
    if (r.incomeType === "offline") revenueOffline += r.amount;

    const manager = r.manager || "Unknown";
    const m =
      managersMap.get(manager) || { leads: 0, qualified: 0, won: 0, revenue: 0 };
    m.revenue += r.amount;
    managersMap.set(manager, m);
  });

  const leadSources = Array.from(leadSourcesCount.entries()).map(
    ([name, count]) => ({ name, count })
  );

  const notQualifiedReasons = Array.from(
    notQualifiedReasonsCount.entries()
  ).map(([id, count]) => ({
    name: `Reason #${id}`,
    count,
  }));

  const nonQualifiedReasons = notQualifiedReasons;

  const managersSales: ManagerSalesRow[] = Array.from(
    managersMap.entries()
  ).map(([manager, v]) => ({
    manager,
    leads: v.leads,
    qualified: v.qualified,
    won: v.won,
    revenue: v.revenue,
  }));

  const managerSales = managersSales; // ✅ legacy alias

  // new names
  const leadsTotal = leads.length;
  const qualifiedLeads = qualifiedCount;
  const wonLeads = wonCount;
  const notQualifiedLeads = leadsTotal - qualifiedLeads;

  // legacy money fields
  const kelishuvSummasi = revenueTotal;
  const onlineSummasi = revenueOnline;
  const offlineSummasi = revenueOffline;

  // universal + legacy tushum fields
  const tushum = revenueTotal;
  const haftalikTushum = revenueTotal;
  const kunlikTushum = revenueTotal;
  const oylikTushum = revenueTotal;

  // legacy count aliases
  const leadsCount = leadsTotal;
  const qualifiedLeadsCount = qualifiedLeads;
  const wonLeadsCount = wonLeads;
  const notQualifiedLeadsCount = notQualifiedLeads;
  const nonQualifiedLeadsCount = notQualifiedLeads;

  return {
    periodLabel: periodLabel(period),

    kelishuvSummasi,
    onlineSummasi,
    offlineSummasi,

    leadsCount,
    qualifiedLeadsCount,
    wonLeadsCount,
    notQualifiedLeadsCount,
    nonQualifiedLeadsCount,

    conversionFromQualified,

    tushum,
    haftalikTushum,
    kunlikTushum,
    oylikTushum,

    nonQualifiedReasons,
    notQualifiedReasons,
    leadSources,

    managerSales,
    managersSales,

    leadsTotal,
    qualifiedLeads,
    notQualifiedLeads,
    wonLeads,
    onlineWonCount,
    offlineWonCount,
    conversionQualifiedToWon,

    callsByManagers,

    revenueTotal,
    revenueOnline,
    revenueOffline,
  };
}