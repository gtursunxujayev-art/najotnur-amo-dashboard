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

export type NonQualifiedReasonSlice = {
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
  nonQualifiedReasons: NonQualifiedReasonSlice[];
  managerSales: ManagerSalesStats[];
  managerCalls: ManagerCallsStats[];
};

function toUnixSeconds(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

export async function buildDashboardData(
  period: Period,
  periodLabel: string
): Promise<DashboardData> {
  const [users, reasonsMap, leads, sheetCalls, amoCalls] = await Promise.all([
    getUsers(),
    getLossReasons(),
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
  const nonQualifiedReasonMap = new Map<number, number>();

  let kelishuvSummasi = 0;
  let onlineSummasi = 0;
  let offlineSummasi = 0;
  let leadsCount = 0;
  let qualifiedLeadsCount = 0;
  let nonQualifiedLeadsCount = 0;
  let wonFromQualifiedCount = 0;

  const isWon = (lead: AmoLead) =>
    dashboardConfig.WON_STATUS_IDS.includes(lead.status_id || -1);

  const isQualified = (lead: AmoLead) =>
    dashboardConfig.QUALIFIED_STATUS_IDS.includes(lead.status_id || -1);

  const isNotQualified = (lead: AmoLead) =>
    dashboardConfig.NOT_QUALIFIED_STATUS_IDS.includes(lead.status_id || -1);

  const isOnlineDeal = (lead: AmoLead) =>
    dashboardConfig.ONLINE_DEAL_STATUS_IDS.includes(lead.status_id || -1);

  const isOfflineDeal = (lead: AmoLead) =>
    dashboardConfig.OFFLINE_DEAL_STATUS_IDS.includes(lead.status_id || -1);

  const pipelineFilterActive = dashboardConfig.PIPELINE_IDS.length > 0;

  leads.forEach((lead) => {
    const pipelineId = lead.pipeline_id || -1;

    if (
      pipelineFilterActive &&
      !dashboardConfig.PIPELINE_IDS.includes(pipelineId)
    ) {
      // Skip leads from pipelines that are not selected
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

    if (isQualified(lead)) {
      qualifiedLeadsCount++;
      ms.qualifiedLeads++;
    }

    if (isNotQualified(lead)) {
      nonQualifiedLeadsCount++;
      if (lead.loss_reason_id != null) {
        nonQualifiedReasonMap.set(
          lead.loss_reason_id,
          (nonQualifiedReasonMap.get(lead.loss_reason_id) || 0) + 1
        );
      }
    }

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
  });

  // For now, oylik/haftalik tushum equals kelishuvSummasi for the chosen period.
  const oylikTushum = kelishuvSummasi;
  const haftalikTushum = kelishuvSummasi;

  const nonQualifiedReasons: NonQualifiedReasonSlice[] = Array.from(
    nonQualifiedReasonMap.entries()
  ).map(([reasonId, count]) => ({
    label: reasonsMap[reasonId] || `Reason ${reasonId}`,
    value: count,
  }));

  const conversionFromQualified =
    qualifiedLeadsCount > 0 ? wonFromQualifiedCount / qualifiedLeadsCount : 0;

  // Calls grouped by manager (name)
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

  // 1) All calls from amoCRM
  if (dashboardConfig.USE_AMO_CALLS) {
    amoCalls.forEach((c) => {
      const managerName =
        usersMap.get(c.managerId) || `User ${c.managerId}`;
      const cs = ensureManagerCalls(managerName);
      cs.callsAll++;
      cs.callSecondsAll += c.durationSec;
    });
  }

  // 2) Successful calls from Google Sheets (optional)
  if (dashboardConfig.USE_SHEETS_CALLS) {
    sheetCalls.forEach((c) => {
      const cs = ensureManagerCalls(c.managerName);
      if (c.isSuccess) {
        cs.callsSuccess++;
        cs.callSecondsSuccess += c.durationSec;
      }
    });
  }

  // 3) Compute average
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
    nonQualifiedReasons,
    managerSales: Array.from(managerSalesMap.values()),
    managerCalls: Array.from(callsPerManager.values()),
  };
}
