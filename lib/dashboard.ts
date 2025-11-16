// lib/dashboard.ts
import {
  getLeadsByCreatedAt,
  getUsers,
  getLossReasons,
  AmoLead,
} from "@/lib/amocrm";
import { dashboardConfig } from "@/config/dashboardConfig";
import { getCalls } from "@/lib/googleSheets";

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
  const [users, reasonsMap, leads, calls] = await Promise.all([
    getUsers(),
    getLossReasons(),
    getLeadsByCreatedAt(toUnixSeconds(period.from), toUnixSeconds(period.to)),
    getCalls(period.from, period.to),
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

  leads.forEach((lead) => {
    leadsCount++;

    const statusId = lead.status_id || -1;
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
      // add reason slice
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

  // For monthly / weekly income we simply reuse kelishuvSummasi, because
  // API already filtered by period. In future you can request larger range.
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

  // Calls grouped by manager
  const callsPerManager = new Map<string, ManagerCallsStats>();

  calls.forEach((c) => {
    if (!callsPerManager.has(c.managerName)) {
      callsPerManager.set(c.managerName, {
        managerName: c.managerName,
        callsAll: 0,
        callsSuccess: 0,
        callSecondsAll: 0,
        callSecondsSuccess: 0,
        avgCallSeconds: 0,
      });
    }
    const cs = callsPerManager.get(c.managerName)!;
    cs.callsAll++;
    cs.callSecondsAll += c.durationSec;
    if (c.isSuccess) {
      cs.callsSuccess++;
      cs.callSecondsSuccess += c.durationSec;
    }
  });

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
