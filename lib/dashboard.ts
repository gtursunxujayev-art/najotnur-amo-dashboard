// lib/dashboard.ts
import { dashboardConfig } from "@/config/dashboardConfig";
import { getAmoLeads } from "@/lib/amoLeads";
import { getAmoCalls } from "@/lib/amoCalls";
import { getSheetRevenue } from "@/lib/sheetsRevenue";
import { getSheetCalls } from "@/lib/sheetsCalls";

export type Period = {
  from: Date;
  to: Date;
};

// Utility
function inRange(date: Date, from: Date, to: Date): boolean {
  return date >= from && date <= to;
}

export async function buildDashboardData(period: Period) {
  const { from, to } = period;

  // ---------------------------
  // 1) LEADS
  // ---------------------------
  const leads = await getAmoLeads(from, to);
  const leadsCount = leads.length;

  const qualifiedLeads = leads.filter((l) =>
    dashboardConfig.QUALIFIED_STATUS_IDS.includes(l.statusId)
  );
  const qualifiedLeadsCount = qualifiedLeads.length;

  const notQualifiedLeads = leads.filter((l) =>
    dashboardConfig.NOT_QUALIFIED_REASON_IDS.includes(l.lossReasonId || 0)
  );
  const notQualifiedLeadsCount = notQualifiedLeads.length;

  const wonLeads = leads.filter((l) =>
    dashboardConfig.WON_STATUS_IDS.includes(l.statusId)
  );
  const wonLeadsCount = wonLeads.length;

  // ---------------------------
  // 2) REVENUE
  // ---------------------------
  let revenueRows = [];
  try {
    revenueRows = await getSheetRevenue(from, to);
  } catch (e) {
    revenueRows = [];
  }

  let kelishuvSummasi = 0;
  let onlineSummasi = 0;
  let offlineSummasi = 0;

  revenueRows.forEach((r) => {
    kelishuvSummasi += r.amount;

    if (r.type === "online") onlineSummasi += r.amount;
    if (r.type === "offline") offlineSummasi += r.amount;
  });

  // ---------------------------
  // 3) NON QUALIFIED REASONS
  // ---------------------------
  const reasonMap: Record<number, number> = {};

  notQualifiedLeads.forEach((l) => {
    if (!l.lossReasonId) return;
    reasonMap[l.lossReasonId] = (reasonMap[l.lossReasonId] || 0) + 1;
  });

  const notQualifiedReasons = Object.entries(reasonMap).map(([id, count]) => ({
    id: Number(id),
    name: dashboardConfig.ALL_LOSS_REASONS[id] || `Sabab ${id}`,
    count,
  }));

  // ---------------------------
  // 4) MANAGER SALES
  // ---------------------------
  const mgrMap: Record<string, any> = {};

  leads.forEach((l) => {
    const manager = l.manager || "Unknown";

    if (!mgrMap[manager]) {
      mgrMap[manager] = {
        managerName: manager,
        totalLeads: 0,
        qualifiedLeads: 0,
        wonDeals: 0,
        wonAmount: 0,
      };
    }

    mgrMap[manager].totalLeads++;

    if (dashboardConfig.QUALIFIED_STATUS_IDS.includes(l.statusId)) {
      mgrMap[manager].qualifiedLeads++;
    }

    if (dashboardConfig.WON_STATUS_IDS.includes(l.statusId)) {
      mgrMap[manager].wonDeals++;
      mgrMap[manager].wonAmount += l.price || 0;
    }
  });

  const managersSales = Object.values(mgrMap);

  // ---------------------------
  // 5) MANAGER CALLS (optional)
  // ---------------------------
  let managerCalls: any[] = [];
  let callsRaw: any[] = [];

  try {
    if (dashboardConfig.USE_AMO_CALLS) {
      callsRaw = await getAmoCalls(from, to);
    } else if (dashboardConfig.USE_SHEETS_CALLS) {
      callsRaw = await getSheetCalls(from, to);
    }
  } catch (e) {
    callsRaw = [];
  }

  const callMap: Record<string, any> = {};

  callsRaw.forEach((c) => {
    const manager = c.manager || "Unknown";

    if (!callMap[manager]) {
      callMap[manager] = {
        managerName: manager,
        callsAll: 0,
        callsSuccess: 0,
        callSecondsAll: 0,
        avgCallSeconds: 0,
      };
    }

    const row = callMap[manager];
    row.callsAll++;
    if (c.success) row.callsSuccess++;
    row.callSecondsAll += c.duration;
  });

  managerCalls = Object.values(callMap).map((m: any) => ({
    ...m,
    avgCallSeconds:
      m.callsAll > 0 ? Math.round(m.callSecondsAll / m.callsAll) : 0,
  }));

  // ---------------------------
  // 6) CONVERSION
  // ---------------------------
  const conversionFromQualified =
    qualifiedLeadsCount > 0 ? wonLeadsCount / qualifiedLeadsCount : 0;

  // ---------------------------
  // FINAL RETURN
  // ---------------------------
  return {
    periodLabel: "",
    kelishuvSummasi,
    onlineSummasi,
    offlineSummasi,
    leadsCount,
    qualifiedLeadsCount,
    notQualifiedLeadsCount,
    wonLeadsCount,
    conversionFromQualified,
    notQualifiedReasons,
    managersSales,
    managerCalls,
  };
}