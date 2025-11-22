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

export type DashboardData = {
  leadsTotal: number;
  qualifiedLeads: number;
  notQualifiedLeads: number;
  wonLeads: number;
  onlineWonCount: number;
  offlineWonCount: number;
  conversionQualifiedToWon: number;

  notQualifiedReasons: { name: string; count: number }[];
  leadSources: { name: string; count: number }[];

  managersSales: {
    manager: string;
    leads: number;
    qualified: number;
    won: number;
    revenue: number;
  }[];

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
// ✅ helpers (local)
// -------------------------
function colLetterToIndex(letter: string) {
  return letter.toUpperCase().charCodeAt(0) - 65;
}

function inRange(d: Date, from: Date, to: Date) {
  return d >= from && d <= to;
}

function getPeriodRange(period: Period) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

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

  // lost bo‘lsa ham qualified reason bo‘lsa qualified hisoblanadi
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

/**
 * ✅ Custom field value helper
 * amo lead.custom_fields_values = [{ field_id, values:[{value, enum_id}]}]
 */
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

/**
 * ✅ E’tiroz key:
 * 1) custom field (OBJECTION_FIELD_ID)
 * 2) fallback loss_reason_id
 */
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

  // ✅ sizdagi real fetch:
  // getLeadsByCreatedAt(from,to) sizda bor deb vercel aytyapti
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

    // Lead source (Qayerdan)
    if (dashboardConfig.LEAD_SOURCE_FIELD_ID) {
      const source =
        getCustomFieldStringLocal(
          lead,
          dashboardConfig.LEAD_SOURCE_FIELD_ID
        ) || "Unknown source";
      leadSourcesCount.set(source, (leadSourcesCount.get(source) || 0) + 1);
    }

    // Not qualified reasons (lost + NOT qualified)
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

  const conversionQualifiedToWon =
    qualifiedCount > 0 ? Number(((wonCount / qualifiedCount) * 100).toFixed(1)) : 0;

  // Calls
  let callsByManagers: DashboardData["callsByManagers"] = [];
  if (dashboardConfig.USE_AMO_CALLS) {
    callsByManagers = await getAmoCalls(from, to);
  } else if (dashboardConfig.USE_SHEETS_CALLS) {
    callsByManagers = await getSheetCalls(from, to);
  }

  // Revenue
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
    name: `Reason #${id}`, // keyinchalik meta’dan nomini bog‘laymiz
    count,
  }));

  const managersSales = Array.from(managersMap.entries()).map(
    ([manager, v]) => ({
      manager,
      leads: v.leads,
      qualified: v.qualified,
      won: v.won,
      revenue: v.revenue,
    })
  );

  return {
    leadsTotal: leads.length,
    qualifiedLeads: qualifiedCount,
    notQualifiedLeads: leads.length - qualifiedCount,
    wonLeads: wonCount,
    onlineWonCount,
    offlineWonCount,
    conversionQualifiedToWon,

    notQualifiedReasons,
    leadSources,

    managersSales,
    callsByManagers,

    revenueTotal,
    revenueOnline,
    revenueOffline,
  };
}