import { NextRequest, NextResponse } from 'next/server';
import { buildDashboardData, Period } from '@/lib/dashboard';
import { prisma } from '@/lib/prisma';
import { getManagerNameFromExtension } from '@/lib/extensionMapping';
import { dashboardConfig } from '@/config/dashboardConfig';
import { getNowGMT5, getTodayStartGMT5, getTodayEndGMT5, getWeekStartGMT5, getMonthStartGMT5, getYesterdayRangeGMT5, getLastWeekRangeGMT5, getLastMonthRangeGMT5 } from '@/lib/timezoneGMT5';

export const dynamic = 'force-dynamic';

interface ManagerStats {
  name: string;
  activeLeads: number;
  newLeads: number;
  sales: number;
  qualifiedLeads: number;
  nonQualifiedLeads: number;
  conversionToQualified: number;
  conversionToAllLeads: number;
  totalCalls: number;
  totalCallLength: number;
  dailyAvgCalls: number;
  dailyAvgCallLength: number;
  revenue: number;
  averageReachTime: number; // minutes from lead creation to first call
  completedFollowUps: number; // follow-ups/tasks completed in the period
  lostLeadReasons: { reason: string; count: number }[];
}

function getPeriodDates(period: string): { from: Date; to: Date; label: string } {
  // Use GMT+5 (Asia/Tashkent) for all period calculations
  // These dates are now proper UTC timestamps representing GMT+5 boundaries
  const now = getNowGMT5();
  const todayStart = getTodayStartGMT5();
  const todayEnd = getTodayEndGMT5();

  if (period === 'today') {
    return { from: todayStart, to: todayEnd, label: 'Bugun' };
  }

  if (period === 'yesterday') {
    const { from, to } = getYesterdayRangeGMT5();
    return { from, to, label: 'Kecha' };
  }

  if (period === 'week') {
    const weekStart = getWeekStartGMT5();
    return { from: weekStart, to: now, label: 'Bu hafta' };
  }

  if (period === 'lastweek') {
    const { from, to } = getLastWeekRangeGMT5();
    return { from, to, label: "O'tgan hafta" };
  }

  if (period === 'month') {
    const monthStart = getMonthStartGMT5();
    return { from: monthStart, to: now, label: 'Bu oy' };
  }

  if (period === 'lastmonth') {
    const { from, to } = getLastMonthRangeGMT5();
    return { from, to, label: "O'tgan oy" };
  }

  if (period === 'custom') {
    // Will be handled by caller with start/end params
    return { from: todayStart, to: todayEnd, label: 'Maxsus davr' };
  }

  const monthStart = getMonthStartGMT5();
  return { from: monthStart, to: now, label: 'Bu oy' };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get('period') || 'week';
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    let fromDate: Date;
    let toDate: Date;

    if (periodParam === 'custom' && startParam && endParam) {
      fromDate = new Date(startParam);
      toDate = new Date(endParam);
    } else {
      const dates = getPeriodDates(periodParam);
      fromDate = dates.from;
      toDate = dates.to;
    }

    console.log(`[Sotuvchilar/Stats] Fetching stats for period: ${periodParam} (${fromDate.toISOString()} to ${toDate.toISOString()}) - GMT+5`);

    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS}` 
      : 'http://localhost:5000';
    
    const fromISO = fromDate.toISOString();
    const toISO = toDate.toISOString();
    const aggregationLimit = 10000;
    
    const onlinepbxUrl = `${baseUrl}/api/onlinepbx/calls?fromISO=${encodeURIComponent(fromISO)}&toISO=${encodeURIComponent(toISO)}&limit=${aggregationLimit}`;
    const utelUrl = `${baseUrl}/api/utel/calls?fromISO=${encodeURIComponent(fromISO)}&toISO=${encodeURIComponent(toISO)}&limit=${aggregationLimit}`;

    console.log(`[Sotuvchilar/Stats] Fetching calls and active leads (in parallel)...`);

    // PARALLELIZE all data fetching: dashboard + active leads + calls APIs + follow-ups
    // This is much faster than sequential fetching
    const [dashboardData, activeLeadsData, onlinepbxRes, utelRes, followUpsData] = await Promise.all([
      // Get dashboard data for period-based stats
      buildDashboardData(
        { from: fromDate, to: toDate },
        periodParam,
        { skipCalls: true }
      ),
      
      // Get current active leads from amoCRM with timeout to prevent blocking
      (async () => {
        try {
          const { getCurrentActiveLeadsPerManager, getUsers } = await import('@/lib/amocrm');
          
          // Add timeout of 30 seconds to prevent blocking the entire request
          const timeoutPromise = new Promise<Map<string, number>>((resolve) => {
            setTimeout(() => {
              console.warn('[Sotuvchilar/Stats] Active leads fetch timed out, using empty map');
              resolve(new Map<string, number>());
            }, 30000); // 30 second timeout
          });
          
          const fetchPromise = (async () => {
            const users = await getUsers();
            const usersMap = new Map<number, string>();
            users.forEach((u) => usersMap.set(u.id, u.name));
            
            const currentActiveLeadsByManagerId = await getCurrentActiveLeadsPerManager(
              dashboardConfig.ACTIVE_LEADS_PIPELINE_IDS || dashboardConfig.PIPELINE_IDS,
              dashboardConfig.WON_STATUS_IDS,
              dashboardConfig.LOST_STATUS_IDS
            );
            
            // Convert manager IDs to names
            const activeLeadsByManager = new Map<string, number>();
            currentActiveLeadsByManagerId.forEach((count, managerId) => {
              const name = usersMap.get(managerId) || `User ${managerId}`;
              activeLeadsByManager.set(name, count);
            });
            
            return activeLeadsByManager;
          })();
          
          // Return whichever completes first
          return Promise.race([fetchPromise, timeoutPromise]);
        } catch (err) {
          console.error('[Sotuvchilar/Stats] Error fetching active leads:', err);
          return new Map<string, number>();
        }
      })(),
      
      // Fetch from both call APIs
      fetch(onlinepbxUrl, { cache: 'no-store' }).catch(err => {
        console.error('[Sotuvchilar/Stats] Error fetching OnlinePBX calls:', err);
        return null;
      }),
      fetch(utelUrl, { cache: 'no-store' }).catch(err => {
        console.error('[Sotuvchilar/Stats] Error fetching Utel calls:', err);
        return null;
      }),
      
      // Fetch completed follow-ups per manager
      (async () => {
        try {
          const { getCompletedFollowUpsByManager, getUsers } = await import('@/lib/amocrm');
          const fromUnix = Math.floor(fromDate.getTime() / 1000);
          const toUnix = Math.floor(toDate.getTime() / 1000);
          
          const completedByManagerId = await getCompletedFollowUpsByManager(fromUnix, toUnix);
          
          // Get users map for ID to name conversion
          const users = await getUsers();
          const usersMap = new Map<number, string>();
          users.forEach((u) => usersMap.set(u.id, u.name));
          
          // Convert manager IDs to names
          const completedByManager = new Map<string, number>();
          completedByManagerId.forEach((count, managerId) => {
            const name = usersMap.get(managerId) || `User ${managerId}`;
            completedByManager.set(name, count);
          });
          
          return completedByManager;
        } catch (err) {
          console.error('[Sotuvchilar/Stats] Error fetching follow-ups:', err);
          return new Map<string, number>();
        }
      })()
    ]);

    const activeLeadsByManager = activeLeadsData;
    const completedFollowUpsByManager = followUpsData;

    // Parse responses
    let onlinepbxCalls: any[] = [];
    let utelManagerSummary: any[] = [];
    
    if (onlinepbxRes?.ok) {
      const json = await onlinepbxRes.json();
      onlinepbxCalls = json.calls || [];
    }
    if (utelRes?.ok) {
      const json = await utelRes.json();
      utelManagerSummary = json.managerSummary || [];
    }

    // Aggregate calls by manager and store all call details for reach time calculation
    const callsByManager = new Map<string, {
      totalCalls: number;
      totalDurationSec: number;
      calls: any[];
    }>();

    // Process OnlinePBX calls
    onlinepbxCalls.forEach((call: any) => {
      const manager = call.user || 'Unknown';
      const existing = callsByManager.get(manager) || { totalCalls: 0, totalDurationSec: 0, calls: [] };
      existing.totalCalls += 1;
      existing.totalDurationSec += call.duration || 0;
      existing.calls.push({ timestamp: call.timestamp, duration: call.duration });
      callsByManager.set(manager, existing);
    });

    // Process OnlinePBX calls array for reach time (with timestamps)
    const callsForReachTime = new Map<string, any[]>();
    onlinepbxCalls.forEach((call: any) => {
      const manager = call.user || 'Unknown';
      if (!callsForReachTime.has(manager)) {
        callsForReachTime.set(manager, []);
      }
      callsForReachTime.get(manager)!.push({ timestamp: call.timestamp, dateTime: call.timestamp });
    });

    // Process Utel calls for reach time
    if (Array.isArray(onlinepbxCalls)) {
      onlinepbxCalls.forEach((call: any) => {
        const manager = call.user || 'Unknown';
        if (!callsForReachTime.has(manager)) {
          callsForReachTime.set(manager, []);
        }
        callsForReachTime.get(manager)!.push({ timestamp: call.timestamp, dateTime: call.timestamp });
      });
    }

    // Process Utel calls (already aggregated by manager)
    utelManagerSummary.forEach((mgr: any) => {
      const manager = mgr.manager || 'Unknown';
      const existing = callsByManager.get(manager) || { totalCalls: 0, totalDurationSec: 0, calls: [] };
      existing.totalCalls += mgr.totalCalls || 0;
      existing.totalDurationSec += mgr.totalDurationSec || 0;
      callsByManager.set(manager, existing);
    });

    const totalOnlinePBX = onlinepbxCalls.length;
    const totalUtel = utelManagerSummary.reduce((sum, m) => sum + (m.totalCalls || 0), 0);
    console.log(`[Sotuvchilar/Stats] Fetched ${totalOnlinePBX} OnlinePBX calls and ${totalUtel} Utel calls`);
    console.log(`[Sotuvchilar/Stats] Aggregated calls for ${callsByManager.size} managers`);

    // Use dashboard data for lost reasons (fast, already calculated)
    let reachTimeByManager = new Map<string, number>();
    let lostReasonsByManager = new Map<string, Map<string, number>>();
    console.log(`[Sotuvchilar/Stats] Using pre-calculated dashboard data for lost reasons`);

    // Calculate number of days in period for daily averages
    const daysDiff = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Build manager stats combining dashboard data with calls
    const managers: ManagerStats[] = dashboardData.managerSales.map((managerSale) => {
      const callData = callsByManager.get(managerSale.managerName) || { totalCalls: 0, totalDurationSec: 0 };
      if (callData.totalCalls > 0) {
        console.log(`[Sotuvchilar/Stats] ${managerSale.managerName}: ${callData.totalCalls} calls, ${callData.totalDurationSec}s`);
      }
      
      // Calculate conversions
      const totalLeads = managerSale.totalLeads || 1;
      const qualifiedLeads = managerSale.qualifiedLeads || 0;
      const wonDeals = managerSale.wonDeals || 0;
      // Use per-manager non-qualified leads (Lost leads with specific non-qualified reasons)
      const nonQualifiedLeads = managerSale.nonQualifiedLeads || 0;

      const conversionToQualified = qualifiedLeads > 0 
        ? (wonDeals / qualifiedLeads) * 100 
        : 0;

      const conversionToAllLeads = totalLeads > 0
        ? (wonDeals / totalLeads) * 100
        : 0;

      // Lost reasons - use manager's own lost reasons (per-manager breakdown)
      const lostReasons: { reason: string; count: number }[] = [];
      managerSale.lostReasons.forEach((reason) => {
        lostReasons.push({
          reason: reason.label,
          count: reason.value,
        });
      });

      return {
        name: managerSale.managerName,
        activeLeads: activeLeadsByManager.get(managerSale.managerName) || 0,
        newLeads: totalLeads,
        sales: wonDeals,
        qualifiedLeads,
        nonQualifiedLeads,
        conversionToQualified: parseFloat(conversionToQualified.toFixed(1)),
        conversionToAllLeads: parseFloat(conversionToAllLeads.toFixed(1)),
        totalCalls: callData.totalCalls,
        totalCallLength: callData.totalDurationSec,
        dailyAvgCalls: callData.totalCalls / daysDiff,
        dailyAvgCallLength: callData.totalDurationSec / daysDiff,
        revenue: managerSale.revenue || 0,
        averageReachTime: reachTimeByManager.get(managerSale.managerName) || 0,
        completedFollowUps: completedFollowUpsByManager.get(managerSale.managerName) || 0,
        lostLeadReasons: lostReasons,
      };
    });

    console.log(`[Sotuvchilar/Stats] Returning stats for ${managers.length} managers`);
    return NextResponse.json({ managers });
  } catch (error) {
    console.error('[SotuvchilarAPI] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manager statistics', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
