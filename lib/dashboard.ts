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
import { getSheetRevenue } from "@/lib/revenueSheets";

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
  onlineSalesCount: number;       // Count of online won deals (from amoCRM)
  offlineSalesCount: number;      // Count of offline won deals (from amoCRM)
  onlineRevenue: number;          // Revenue from Google Sheets (courseType = "Online")
  offlineRevenue: number;         // Revenue from Google Sheets (courseType = "Offline")
  oylikTushum: number;            // Total from Google Sheets
  haftalikTushum: number;         // Total from Google Sheets
  leadsCount: number;
  qualifiedLeadsCount: number;
  nonQualifiedLeadsCount: number;
  conversionFromQualified: number; // 0–1
  nonQualifiedReasons: Slice[];    // ALL lost leads by loss reason
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
        values?: { value?: any; enum_id?: any }[];
      }>
    | undefined;

  if (!cf) return null;
  const f = cf.find((x) => x.field_id === fieldId);
  if (!f || !f.values || !f.values[0]) return null;
  
  // For dropdown fields, use enum_id (amoCRM stores dropdown as enum_id, not value)
  const v = f.values[0].enum_id ?? f.values[0].value;
  if (v == null) return null;
  return String(v);
}

function getCustomFieldNumber(lead: AmoLead, fieldId: number): number {
  const cf = (lead as any).custom_fields_values as
    | Array<{
        field_id: number;
        values?: { value?: any }[];
      }>
    | undefined;

  if (!cf) return 0;
  const f = cf.find((x) => x.field_id === fieldId);
  if (!f || !f.values || !f.values[0]) return 0;
  
  const v = f.values[0].value;
  if (v == null) return 0;
  
  const num = Number(v);
  return isNaN(num) ? 0 : num;
}

export async function buildDashboardData(
  period: Period,
  periodLabel: string,
  options?: { skipCalls?: boolean }
): Promise<DashboardData> {
  console.log(`[Dashboard] Building dashboard data for period: ${periodLabel} (${period.from.toISOString()} to ${period.to.toISOString()})`);
  
  const skipCalls = options?.skipCalls ?? false;
  
  const [users, reasonsMap, leads, sheetCalls, amoCalls, revenueRows] =
    await Promise.all([
      getUsers(),
      getLossReasons(), // { [id]: name }
      getLeadsByCreatedAt(toUnixSeconds(period.from), toUnixSeconds(period.to)),
      dashboardConfig.USE_SHEETS_CALLS && !skipCalls
        ? getSheetCalls(period.from, period.to).catch(err => {
            console.error("[Dashboard] Error fetching Google Sheets calls:", err);
            return [];
          })
        : Promise.resolve([]),
      dashboardConfig.USE_AMO_CALLS && !skipCalls
        ? getAmoCalls(period.from, period.to).catch(err => {
            console.error("[Dashboard] Error fetching amoCRM calls:", err);
            return [];
          })
        : Promise.resolve([]),
      getSheetRevenue(period.from, period.to).catch(err => {
        console.error("[Dashboard] Error fetching revenue data:", err);
        return [];
      }),
    ]);

  console.log(`[Dashboard] Data fetched - Leads: ${leads.length}, Sheet Calls: ${sheetCalls.length}, Amo Calls: ${amoCalls.length}, Revenue Rows: ${revenueRows.length}`);

  const usersMap = new Map<number, string>();
  users.forEach((u) => usersMap.set(u.id, u.name));

  const managerSalesMap = new Map<number, ManagerSalesStats>();
  const lostReasonMap = new Map<number, number>();
  const leadSourcesMap = new Map<string, number>();

  let kelishuvSummasi = 0;
  let onlineSummasi = 0;
  let offlineSummasi = 0;
  let onlineSalesCount = 0;
  let offlineSalesCount = 0;
  let leadsCount = 0;
  let qualifiedLeadsCount = 0;
  let nonQualifiedLeadsCount = 0;
  let wonFromQualifiedCount = 0;

  const hasPipelineFilter = dashboardConfig.PIPELINE_IDS.length > 0;

  const isWon = (lead: AmoLead) =>
    dashboardConfig.WON_STATUS_IDS.includes(lead.status_id || -1);

  const isOnlineDeal = (lead: AmoLead) =>
    dashboardConfig.ONLINE_COURSE_ENUM_IDS.length > 0 &&
    (() => {
      if (!dashboardConfig.COURSE_TYPE_FIELD_ID) return false;
      const val = getCustomFieldString(lead, dashboardConfig.COURSE_TYPE_FIELD_ID);
      if (!val) return false;
      // For dropdown CFs, amoCRM stores enum ID in "enum_id" – but we
      // get it via API in custom_fields_values; here we assume value is string enum_id
      const num = Number(val);
      return dashboardConfig.ONLINE_COURSE_ENUM_IDS.includes(num);
    })();

  const isOfflineDeal = (lead: AmoLead) =>
    dashboardConfig.OFFLINE_COURSE_ENUM_IDS.length > 0 &&
    (() => {
      if (!dashboardConfig.COURSE_TYPE_FIELD_ID) return false;
      const val = getCustomFieldString(lead, dashboardConfig.COURSE_TYPE_FIELD_ID);
      if (!val) return false;
      const num = Number(val);
      return dashboardConfig.OFFLINE_COURSE_ENUM_IDS.includes(num);
    })();

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

  // Note: This function is ONLY for categorizing loss reasons
  // The actual nonQualifiedLeadsCount is computed as: total - qualified
  const hasNotQualifiedLossReason = (lead: AmoLead) => {
    if (!isLost(lead)) return false;
    const reasonId = lead.loss_reason_id!;
    return dashboardConfig.NOT_QUALIFIED_REASON_IDS.includes(reasonId);
  };

  leads.forEach((lead) => {
    const pipelineId = lead.pipeline_id || -1;

    if (hasPipelineFilter && !dashboardConfig.PIPELINE_IDS.includes(pipelineId)) {
      // skip leads from other pipelines
      return;
    }

    leadsCount++;

    const managerId = lead.responsible_user_id || 0;
    const managerName = usersMap.get(managerId) || `User ${managerId}`;
    const price = lead.price || 0;

    // Debug logging - show ALL custom fields for first few leads to diagnose issue
    if (leadsCount <= 5) {
      const customFields = (lead as any).custom_fields_values || [];
      console.log(`[Dashboard] Lead #${leadsCount} (ID: ${lead.id}):`, {
        status_id: lead.status_id,
        loss_reason_id: lead.loss_reason_id,
        price,
        isWon: isWon(lead),
        isQualified: isQualified(lead),
        isLost: isLost(lead),
      });
      
      if (customFields.length > 0) {
        console.log(`[Dashboard]   Custom fields:`, customFields.map((f: any) => ({
          field_id: f.field_id,
          field_name: f.field_name,
          values: f.values?.map((v: any) => ({ value: v.value, enum_id: v.enum_id }))
        })));
      } else {
        console.log(`[Dashboard]   No custom fields on this lead`);
      }
    }

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
    
    // Don't count nonQualifiedLeadsCount here - will compute after loop

    // Won / deals
    if (isWon(lead)) {
      // For "Qisman to'lov qildi" status, use custom field 1416675 for kelishuvSummasi
      let dealAmount = price;
      if (lead.status_id === dashboardConfig.PARTIAL_PAYMENT_STATUS_ID && 
          dashboardConfig.PARTIAL_PAYMENT_FIELD_ID != null) {
        dealAmount = getCustomFieldNumber(lead, dashboardConfig.PARTIAL_PAYMENT_FIELD_ID);
        
        if (leadsCount <= 5) {
          console.log(`[Dashboard] Lead #${leadsCount} using partial payment field:`, {
            lead_id: lead.id,
            status_id: lead.status_id,
            price: price,
            partialPaymentAmount: dealAmount,
            field_id: dashboardConfig.PARTIAL_PAYMENT_FIELD_ID
          });
        }
      }
      
      kelishuvSummasi += dealAmount;
      ms.wonDeals++;
      ms.wonAmount += dealAmount;

      if (isQualified(lead)) {
        wonFromQualifiedCount++;
      }

      if (isOnlineDeal(lead)) {
        onlineSummasi += dealAmount;
        onlineSalesCount++;
      }
      if (isOfflineDeal(lead)) {
        offlineSummasi += dealAmount;
        offlineSalesCount++;
      }
    }

    // Lead sources ("Qayerdan")
    if (dashboardConfig.LEAD_SOURCE_FIELD_ID != null) {
      const srcVal = getCustomFieldString(
        lead,
        dashboardConfig.LEAD_SOURCE_FIELD_ID
      );
      const label =
        srcVal && srcVal.trim().length > 0 ? srcVal.trim() : "Unknown source";
      leadSourcesMap.set(label, (leadSourcesMap.get(label) || 0) + 1);
    }
  });

  // FIX: Non-qualified count should be total leads minus qualified leads
  // This is the correct calculation, not based on specific loss reasons
  nonQualifiedLeadsCount = leadsCount - qualifiedLeadsCount;

  // Revenue from Google Sheets for selected period
  const revenueSum = revenueRows.reduce((sum, r) => sum + r.amount, 0);
  
  // Separate revenue by course type (Online/Offline from Column C)
  const onlineRevenue = revenueRows
    .filter(r => r.courseType.toLowerCase() === 'online')
    .reduce((sum, r) => sum + r.amount, 0);
  
  const offlineRevenue = revenueRows
    .filter(r => r.courseType.toLowerCase() === 'offline')
    .reduce((sum, r) => sum + r.amount, 0);

  const oylikTushum = revenueSum;
  const haftalikTushum = revenueSum;

  // Detailed metrics summary with warnings
  console.log(`[Dashboard] Metrics Summary:`, {
    leadsCount,
    qualifiedLeadsCount,
    nonQualifiedLeadsCount,
    kelishuvSummasi,
    onlineSummasi,
    offlineSummasi,
    onlineSalesCount,
    offlineSalesCount,
    onlineRevenue,
    offlineRevenue,
    haftalikTushum,
    oylikTushum,
  });

  // Check for potential configuration issues and log warnings
  const wonLeadsCount = leads.filter(l => isWon(l)).length;
  const lostLeadsCount = leads.filter(l => isLost(l)).length;
  const leadsWithCourseType = leads.filter(l => 
    getCustomFieldString(l, dashboardConfig.COURSE_TYPE_FIELD_ID || 0) !== null
  ).length;

  if (wonLeadsCount > 0 && onlineSummasi === 0 && offlineSummasi === 0) {
    console.warn(`[Dashboard] WARNING: Found ${wonLeadsCount} won leads but Online/Offline sales are 0. Possible issues:
      1. Course Type custom field (ID: ${dashboardConfig.COURSE_TYPE_FIELD_ID}) is not set on leads
      2. Course Type values don't match configured enum IDs
      3. Lead prices are 0
      - Leads with Course Type set: ${leadsWithCourseType}/${leadsCount}`);
  }

  if (lostLeadsCount > 0 && nonQualifiedLeadsCount === 0) {
    console.warn(`[Dashboard] WARNING: Found ${lostLeadsCount} lost leads but no non-qualified leads counted. Check if loss_reason_id matches configured NOT_QUALIFIED_REASON_IDS`);
  }

  if (revenueRows.length === 0) {
    console.warn(`[Dashboard] WARNING: No revenue data found in Google Sheets for period ${period.from.toISOString()} to ${period.to.toISOString()}`);
  }

  const nonQualifiedReasons: Slice[] = Array.from(lostReasonMap.entries()).map(
    ([reasonId, count]) => ({
      label: reasonsMap[reasonId] || `Reason ${reasonId}`,
      value: count,
    })
  );

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

  // 1) amoCRM calls (all calls)
  if (dashboardConfig.USE_AMO_CALLS) {
    amoCalls.forEach((c) => {
      const managerName = usersMap.get(c.managerId) || `User ${c.managerId}`;
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
    onlineSalesCount,
    offlineSalesCount,
    onlineRevenue,
    offlineRevenue,
    oylikTushum,
    haftalikTushum,
    leadsCount,
    qualifiedLeadsCount,
    nonQualifiedLeadsCount,
    conversionFromQualified,
    nonQualifiedReasons,
    leadSources,
    managerSales: Array.from(managerSalesMap.values()),
    managerCalls: Array.from(callsPerManager.values()),
  };
}