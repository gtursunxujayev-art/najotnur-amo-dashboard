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

// ---------------- Manager sales row ----------------
export type ManagerSalesRow = {
  // ✅ legacy fields expected by UI
  managerId: string;
  managerName: string;
  totalLeads: number;
  qualifiedLeads: number;
  wonLeads: number;
  totalRevenue: number;
  wonDeals: number;
  wonAmount: number;

  // 🔮 possible extra legacy fields (optional)
  conversionPercent?: number;
  onlineRevenue?: number;
  offlineRevenue?: number;

  // ✅ actual fields (yangi nomlar)
  manager: string;
  leads: number;
  qualified: number;
  won: number;
  revenue: number;
};

// ---------------- Manager calls row ----------------
export type ManagerCallsRow = {
  // ✅ legacy fields expected by UI
  managerId: string;
  managerName: string;

  // asosiy raqamlar
  totalCalls: number;
  successCalls: number;
  totalDurationMin: number; // umumiy daqiqa
  avgDurationSec: number;   // o‘rtacha soniya

  // 🔁 qo‘shimcha legacy aliaslar
  totalDurationMinutes?: number;
  avgDurationSeconds?: number;

  callsAll: number;          // = totalCalls
  callsSuccess: number;      // = successCalls
  durationTotalMin: number;  // = totalDurationMin
  durationAvgSec: number;    // = avgDurationSec

  // ❗ yangi legacy nomlar (UI dagi)
  callSecondsAll: number;    // = totalDurationMin * 60
  avgCallSeconds: number;    // = avgDurationSec

  // ✅ actual field
  manager: string;
};

// ---------------- Dashboard data -------------------
export type DashboardData = {
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

  tushum: number;
  haftalikTushum: number;
  kunlikTushum: number;
  oylikTushum: number;

  nonQualifiedReasons: { name: string; count: number }[];
  notQualifiedReasons: { name: string; count: number }[];

  managerSales: ManagerSalesRow[];   // legacy name
  managersSales: ManagerSalesRow[];  // new name

  // ✅ calls aliases
  managerCalls: ManagerCallsRow[];     // legacy
  callsByManagers: ManagerCallsRow[];  // new name

  leadsTotal: number;
  qualifiedLeads: number;
  notQualifiedLeads: number;
  wonLeads: number;
  onlineWonCount: number;
  offlineWonCount: number;
  conversionQualifiedToWon: number; // percentage [0..100]

  leadSources: { name: string; count: number }[];

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

function slugify(str: string) {
  return String(str || "unknown")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_.]/g, "");
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
    const day = d.getDay();
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

  // 🔧 getLeadsByCreatedAt son kutadi, shuning uchun Date → unix timestamp (sec)
  const allLeads = await getLeadsByCreatedAt(
    Math.floor(from.getTime() / 1000),
    Math.floor(to.getTime() / 1000)
  );

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

  // leads + manager counters
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

  const conversionFromQualified =
    qualifiedCount > 0 ? wonCount / qualifiedCount : 0;

  const conversionQualifiedToWon =
    qualifiedCount > 0
      ? Number(((wonCount / qualifiedCount) * 100).toFixed(1))
      : 0;

  // ------------- Calls (amo / sheets) -------------
  let rawCalls:
    | {
        manager: string;
        totalCalls: number;
        successCalls: number;
        totalDurationMin: number;
        avgDurationSec: number;
      }[] = [];

  if (dashboardConfig.USE_AMO_CALLS) {
    rawCalls = await getAmoCalls(from, to);
  } else if (dashboardConfig.USE_SHEETS_CALLS) {
    rawCalls = await getSheetCalls(from, to);
  }

  const callsByManagers: ManagerCallsRow[] = rawCalls.map((c) => ({
    managerId: slugify(c.manager),
    managerName: c.manager,
    manager: c.manager,

    totalCalls: c.totalCalls,
    successCalls: c.successCalls,
    totalDurationMin: c.totalDurationMin,
    avgDurationSec: c.avgDurationSec,

    totalDurationMinutes: c.totalDurationMin,
    avgDurationSeconds: c.avgDurationSec,

    callsAll: c.totalCalls,
    callsSuccess: c.successCalls,
    durationTotalMin: c.totalDurationMin,
    durationAvgSec: c.avgDurationSec,

    callSecondsAll: c.totalDurationMin * 60,
    avgCallSeconds: c.avgDurationSec,
  }));

  const managerCalls = callsByManagers; // ✅ legacy alias

  // ------------- Revenue (Sheets) ------------------
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
    // legacy ids/names
    managerId: slugify(manager),
    managerName: manager,

    // legacy totals
    totalLeads: v.leads,
    qualifiedLeads: v.qualified,
    wonLeads: v.won,
    totalRevenue: v.revenue,
    wonDeals: v.won,
    wonAmount: v.revenue,

    // new fields
    manager,
    leads: v.leads,
    qualified: v.qualified,
    won: v.won,
    revenue: v.revenue,
  }));
  const managerSales = managersSales;

  const leadsTotal = leads.length;
  const qualifiedLeads = qualifiedCount;
  const wonLeads = wonCount;
  const notQualifiedLeads = leadsTotal - qualifiedLeads;

  const kelishuvSummasi = revenueTotal;
  const onlineSummasi = revenueOnline;
  const offlineSummasi = revenueOffline;

  const tushum = revenueTotal;
  const haftalikTushum = revenueTotal;
  const kunlikTushum = revenueTotal;
  const oylikTushum = revenueTotal;

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

    managerCalls,
    callsByManagers,

    leadsTotal,
    qualifiedLeads,
    notQualifiedLeads,
    wonLeads,
    onlineWonCount,
    offlineWonCount,
    conversionQualifiedToWon,

    revenueTotal,
    revenueOnline,
    revenueOffline,
  };
}