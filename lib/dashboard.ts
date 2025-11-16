// lib/dashboard.ts
import {
  getLeadsByCreatedAt,
  getUsers,
  getLossReasons,
  AmoLead,
} from "@/lib/amocrm";
import { dashboardConfig } from "@/config/dashboardConfig";
import { getSheetCalls } from "@/lib/googleSheets";
import { getAmoCalls } from "@/lib/amoCalls";

export type Period = {
  from: Date;
  to: Date;
};

export type ManagerSalesStats = {
  managerId: number;
  managerName: string;
  totalLeads: number;
  qualifiedLeads: number;
  wonDeals: number;
  wonAmount: number;
};

export type ManagerCallsStats = {
  managerName: string;
  callsAll: number;
  callsSuccess: number;
  callSecondsAll: number;
  callSecondsSuccess: number;
  avgCallSeconds: number;
};

export type Slice = {
  label: string;
  value: number;
};

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
  conversionFromQualified: number; // 0–1
  nonQualifiedReasons: Slice[]; // actually: ALL lost leads by loss reason
  leadSources: Slice[];
  managerSales: ManagerSalesStats[];
  managerCalls: ManagerCallsStats[];
};

function toUnixSeconds(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

function getCustomFieldString(lead: AmoLead, fieldId: number): string | null {
  const cf = (lead as any).custom_fields_values as
    | Array<{
        field_id: number;
        values?: { value?: any }[];
      }>
    | undefined;

  if (!cf) return null;
  const f = cf.find((x) => x.field_id === fieldId);
  if (!f || !f.values || !f.values[0]) return null;
  const v = f.values[0].value;
  if (v == null) return null;
  return String(v);
}

export async function buildDashboardData(
  period: Period,
  periodLabel: string
): Promise<DashboardData> {
  const [users, reasonsMap, leads, sheetCalls, amoCalls] = await Promise.all([
    getUsers(),
    getLossReasons(), // returns { [id]: name }
    getLeadsByCreatedAt(toUnixSeconds(period.from), toUnixSeconds(period.to)),
    dashboardConfig.USE_SHEETS_CALLS
      ? getSheetCalls(period.from, period.to)
      : Promise.resolve([]),
    dashboardConfig.USE_AMO_CALLS
      ? getAmoCalls(period.from, period.to)
      : Promise.resolve([]),
  ]);

  const usersMap = new Map<number, string>();
  users.forEach((u) => usersMap.set(u.id, u.name));

  const managerSalesMap = new Map<number, ManagerSalesStats>();
  const lostReasonMap = new Map<number, number>();
  const leadSourcesMap = new Map<string, number>();

  let kelishuvSummasi = 0;
  let onlineSummasi = 0;
  let offlineSummasi = 0;
  let leadsCount = 0;
  let qualifiedLeadsCount = 0;
  let nonQualifiedLeadsCount = 0;
  let wonFromQualifiedCount = 0;

  const hasPipelineFilter = dashboardConfig.PIPELINE_IDS.length > 0;

  const isWon = (lead: AmoLead) =>
    dashboardConfig.WON_STATUS_IDS.includes(lead.status_id || -1);

  const isOnlineDeal = (lead: AmoLead) =>
    dashboardConfig.ONLINE_DEAL_STATUS_IDS.includes(lead.status_id || -1);

  const isOfflineDeal = (lead: AmoLead) =>
    dashboardConfig.OFFLINE_DEAL_STATUS_IDS.includes(lead.status_id || -1);

  const isLost = (lead: AmoLead) => lead.loss_reason_id != null;

  const isQualified = (lead: AmoLead) => {
    const statusId = lead.status_id || -1;
    const lossReasonId = lead.loss_reason_id ?? null;

    if (dashboardConfig.QUALIFIED_STATUS_IDS.includes(statusId)) {
      return true;
    }
    if (
      lossReasonId != null &&
      dashboardConfig.QUALIFIED_LOSS_REASON_IDS.includes(lossReasonId)
    ) {
      // Lost lead but with a "qualified" reason → still counted as qualified
      return true;
    }
    return false;
  };

  const isNotQualified = (lead: AmoLead) => {
    if (!isLost(lead)) return false;
    const reasonId = lead.loss_reason_id!;
    return dashboardConfig.NOT_QUALIFIED_REASON_IDS.includes(reasonId);
  };

  leads.forEach((lead) => {
    const pipelineId = lead.pipeline_id || -1;

    if (
      hasPipelineFilter &&
      !dashboardConfig.PIPELINE_IDS.includes(pipelineId)
    ) {
      // skip leads from other pipelines
      return;
    }

    leadsCount++;

    const managerId = lead.responsible_user_id || 0;
    const managerName = usersMap.get(managerId) || `User ${managerId}`;
    const price = lead.price || 0;

    if (!managerSalesMap.has(managerId)) {
      managerSalesMap.set(managerId, {
        managerId,
        managerName,
        totalLeads: 0,
        qualifiedLeads: 0,
        wonDeals: 0,
        wonAmount: 0,
      });
    }
    const ms = managerSalesMap.get(managerId)!;
    ms.totalLeads++;

    // Lost reason map (for pie chart)
    if (isLost(lead) && lead.loss_reason_id != null) {
      const rId = lead.loss_reason_id;
      lostReasonMap.set(rId, (lostReasonMap.get(rId) || 0) + 1);
    }

    // Qualified / Not qualified counters
    if (isQualified(lead)) {
      qualifiedLeadsCount++;
      ms.qualifiedLeads++;
    }

    if (isNotQualified(lead)) {
      nonQualifiedLeadsCount++;
    }

    // Won / deals
    if (isWon(lead)) {
      kelishuvSummasi += price;
      ms.wonDeals++;
      ms.wonAmount += price;

      if (isQualified(lead)) {
        wonFromQualifiedCount++;
      }

      if (isOnlineDeal(lead)) {
        onlineSummasi += price;
      }
      if (isOfflineDeal(lead)) {
        offlineSummasi += price;
      }
    }

    // Lead sources ("Qayerdan")
    if (dashboardConfig.LEAD_SOURCE_FIELD_ID != null) {
      const srcVal = getCustomFieldString(
        lead,
        dashboardConfig.LEAD_SOURCE_FIELD_ID
      );
      const label =
        srcVal && srcVal.trim().length > 0
          ? srcVal.trim()
          : "Unknown source";
      leadSourcesMap.set(label, (leadSourcesMap.get(label) || 0) + 1);
    }
  });

  // For now, oylik / haftalik tushum = kelishuvSummasi for selected period.
  const oylikTushum = kelishuvSummasi;
  const haftalikTushum = kelishuvSummasi;

  const nonQualifiedReasons: Slice[] = Array.from(
    lostReasonMap.entries()
  ).map(([reasonId, count]) => ({
    label: reasonsMap[reasonId] || `Reason ${reasonId}`,
    value: count,
  }));

  const conversionFromQualified =
    qualifiedLeadsCount > 0 ? wonFromQualifiedCount / qualifiedLeadsCount : 0;

  const leadSources: Slice[] = Array.from(leadSourcesMap.entries()).map(
    ([label, value]) => ({ label, value })
  );

  // Calls per manager
  const callsPerManager = new Map<string, ManagerCallsStats>();

  const ensureManagerCalls = (managerName: string): ManagerCallsStats => {
    if (!callsPerManager.has(managerName)) {
      callsPerManager.set(managerName, {
        managerName,
        callsAll: 0,
        callsSuccess: 0,
        callSecondsAll: 0,
        callSecondsSuccess: 0,
        avgCallSeconds: 0,
      });
    }
    return callsPerManager.get(managerName)!;
  };

  // 1) amoCRM calls
  if (dashboardConfig.USE_AMO_CALLS) {
    amoCalls.forEach((c) => {
      const managerName =
        usersMap.get(c.managerId) || `User ${c.managerId}`;
      const cs = ensureManagerCalls(managerName);
      cs.callsAll++;
      cs.callSecondsAll += c.durationSec;
    });
  }

  // 2) Google Sheets calls (successful)
  if (dashboardConfig.USE_SHEETS_CALLS) {
    sheetCalls.forEach((c) => {
      const cs = ensureManagerCalls(c.managerName);
      if (c.isSuccess) {
        cs.callsSuccess++;
        cs.callSecondsSuccess += c.durationSec;
      }
    });
  }

  // 3) Average call length
  callsPerManager.forEach((cs) => {
    cs.avgCallSeconds =
      cs.callsAll > 0 ? Math.round(cs.callSecondsAll / cs.callsAll) : 0;
  });

  return {
    periodLabel,
    kelishuvSummasi,
    onlineSummasi,
    offlineSummasi,
    oylikTushum,
    haftalikTushum,
    leadsCount,
    qualifiedLeadsCount,
    nonQualifiedLeadsCount,
    conversionFromQualified,
    nonQualifiedReasons, // lost leads by loss reason
    leadSources,
    managerSales: Array.from(managerSalesMap.values()),
    managerCalls: Array.from(callsPerManager.values()),
  };
}