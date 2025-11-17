// lib/dashboard.ts
import {
  getLeadsByCreatedAt,
  getUsers,
  AmoLead
} from "@/lib/amocrm";
import { dashboardConfig } from "@/config/dashboardConfig";
import { getSheetCalls } from "@/lib/googleSheets";
import { getAmoCalls } from "@/lib/amoCalls";

export type Period = { from: Date; to: Date };
export type Slice = { label: string; value: number };

export type DashboardData = {
  periodLabel: string;
  kelishuvSummasi: number;
  onlineSummasi: number;
  offlineSummasi: number;
  oylikTushum: number;
  haftalikTushum: number;
  leadsCount: number;
  qualifiedLeadsCount: number;
  nonQualifiedLeadsCount: number;
  conversionFromQualified: number;
  nonQualifiedReasons: Slice[];
  leadSources: Slice[];
  managerSales: any[];
  managerCalls: any[];
};

function toUnix(d: Date) {
  return Math.floor(d.getTime() / 1000);
}

function getCF(lead: AmoLead, fieldId: number): string | null {
  const cf = (lead as any).custom_fields_values;
  if (!cf) return null;
  const f = cf.find((x: any) => x.field_id === fieldId);
  if (!f || !f.values || !f.values[0]) return null;
  return f.values[0].value ? String(f.values[0].value) : null;
}

export async function buildDashboardData(
  period: Period,
  periodLabel: string
): Promise<DashboardData> {

  const [users, leads, sheetCalls, amoCalls] = await Promise.all([
    getUsers(),
    getLeadsByCreatedAt(toUnix(period.from), toUnix(period.to)),
    dashboardConfig.USE_SHEETS_CALLS ? getSheetCalls(period.from, period.to) : Promise.resolve([]),
    dashboardConfig.USE_AMO_CALLS ? getAmoCalls(period.from, period.to) : Promise.resolve([])
  ]);

  const activeUserMap = new Map(users.map(u => [u.id, u.name]));
  const pipelineIds = dashboardConfig.PIPELINE_IDS;

  let kelishuvSummasi = 0;
  let onlineSummasi = 0;
  let offlineSummasi = 0;
  let wonFromQualified = 0;

  let leadsCount = 0;
  let qualifiedCount = 0;
  let nonQualifiedCount = 0;

  const lostMap = new Map<string, number>();
  const sourceMap = new Map<string, number>();
  const managerSales = new Map<number, any>();

  leads.forEach(lead => {
    if (!pipelineIds.includes(lead.pipeline_id)) return;

    leadsCount++;

    const managerId = lead.responsible_user_id;
    const managerName = activeUserMap.get(managerId) || `User ${managerId}`;

    if (!managerSales.has(managerId)) {
      managerSales.set(managerId, {
        managerId,
        managerName,
        totalLeads: 0,
        qualifiedLeads: 0,
        wonDeals: 0,
        wonAmount: 0
      });
    }

    const ms = managerSales.get(managerId);
    ms.totalLeads++;

    const courseTypeVal = dashboardConfig.COURSE_TYPE_FIELD_ID
      ? getCF(lead, dashboardConfig.COURSE_TYPE_FIELD_ID)
      : null;

    // Qualified logic (only stage-based)
    const isQualified = dashboardConfig.QUALIFIED_STATUS_IDS.includes(lead.status_id);

    if (isQualified) {
      qualifiedCount++;
      ms.qualifiedLeads++;
    }

    // Lost → reason by custom field
    const isLost = !!lead.cl osed_at && lead.status_id !== 142;
    if (isLost && dashboardConfig.ETIROZ_FIELD_ID) {
      const reason = getCF(lead, dashboardConfig.ETIROZ_FIELD_ID) || "Noma’lum";
      lostMap.set(reason, (lostMap.get(reason) || 0) + 1);
      nonQualifiedCount++;
    }

    // WON logic = closed_at exists + status_id in WON_STATUS_IDS
    const isWon = lead.closed_at && dashboardConfig.WON_STATUS_IDS.includes(lead.status_id);

    if (isWon) {
      const price = lead.price || 0;
      kelishuvSummasi += price;
      ms.wonAmount += price;
      ms.wonDeals++;

      if (isQualified) wonFromQualified++;

      // Online/Offline by enum
      const enumId = (lead.custom_fields_values || [])
        .find((c: any) => c.field_id === dashboardConfig.COURSE_TYPE_FIELD_ID)
        ?.values?.[0]?.enum_id;

      if (dashboardConfig.ONLINE_COURSE_ENUM_IDS.includes(enumId)) {
        onlineSummasi += price;
      }

      if (dashboardConfig.OFFLINE_COURSE_ENUM_IDS.includes(enumId)) {
        offlineSummasi += price;
      }
    }

    // Lead source
    if (dashboardConfig.LEAD_SOURCE_FIELD_ID) {
      const src = getCF(lead, dashboardConfig.LEAD_SOURCE_FIELD_ID) || "Unknown";
      sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
    }
  });

  const conversionFromQualified =
    qualifiedCount > 0 ? wonFromQualified / qualifiedCount : 0;

  const nonQualifiedReasons = [...lostMap.entries()].map(([label, value]) => ({
    label,
    value
  }));

  const leadSources = [...sourceMap.entries()].map(([label, value]) => ({
    label,
    value
  }));

  // CALL METRICS FILTER (active managers only)
  const managerCalls = new Map<string, any>();

  function ensureCallManager(name: string) {
    if (!managerCalls.has(name)) {
      managerCalls.set(name, {
        managerName: name,
        callsAll: 0,
        callsSuccess: 0,
        callSecondsAll: 0,
        callSecondsSuccess: 0,
        avgCallSeconds: 0
      });
    }
    return managerCalls.get(name);
  }

  if (dashboardConfig.USE_AMO_CALLS) {
    amoCalls.forEach(c => {
      if (!activeUserMap.has(c.managerId)) return;
      const name = activeUserMap.get(c.managerId)!;
      const mc = ensureCallManager(name);
      mc.callsAll++;
      mc.callSecondsAll += c.durationSec;
    });
  }

  if (dashboardConfig.USE_SHEETS_CALLS) {
    sheetCalls.forEach(c => {
      if (!activeUserMap.has(c.managerName)) return;
      const mc = ensureCallManager(c.managerName);
      if (c.isSuccess) {
        mc.callsSuccess++;
        mc.callSecondsSuccess += c.durationSec;
      }
    });
  }

  managerCalls.forEach(mc => {
    mc.avgCallSeconds =
      mc.callsAll > 0 ? Math.round(mc.callSecondsAll / mc.callsAll) : 0;
  });

  return {
    periodLabel,
    kelishuvSummasi,
    onlineSummasi,
    offlineSummasi,
    oylikTushum: kelishuvSummasi,
    haftalikTushum: kelishuvSummasi,
    leadsCount,
    qualifiedLeadsCount: qualifiedCount,
    nonQualifiedLeadsCount: nonQualifiedCount,
    conversionFromQualified,
    nonQualifiedReasons,
    leadSources,
    managerSales: [...managerSales.values()],
    managerCalls: [...managerCalls.values()]
  };
}