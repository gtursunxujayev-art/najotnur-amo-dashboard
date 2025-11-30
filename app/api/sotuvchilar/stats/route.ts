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

    // Build dashboard data to get manager sales stats (already period-filtered)
    const dashboardData = await buildDashboardData(
      { from: fromDate, to: toDate },
      periodParam,
      { skipCalls: true }
    );

    // Calculate active leads from dashboard data (total - won) 
    // This avoids fetching ALL 28k+ leads and uses already-fetched period data
    const activeLeadsByManager = new Map<string, number>();
    dashboardData.managerSales.forEach((ms) => {
      const activeLeads = Math.max(0, ms.totalLeads - ms.wonDeals);
      activeLeadsByManager.set(ms.managerName, activeLeads);
    });

    // Fetch call data from the SAME API endpoints as the calls page for consistency
    // This ensures both pages show identical call counts
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS}` 
      : 'http://localhost:5000';
    
    // Map period to the format expected by calls APIs
    const callsPeriod = periodParam === 'today' ? 'today' : 
                        periodParam === 'month' || periodParam === 'lastmonth' ? 'month' : 'week';
    
    // For custom periods or specific date ranges, pass from/to parameters
    let onlinepbxUrl = `${baseUrl}/api/onlinepbx/calls`;
    let utelUrl = `${baseUrl}/api/utel/calls`;
    
    if (periodParam === 'custom' || periodParam === 'yesterday' || periodParam === 'lastweek' || periodParam === 'lastmonth') {
      // Pass explicit date range for non-standard periods
      const fromStr = fromDate.toISOString().split('T')[0];
      const toStr = toDate.toISOString().split('T')[0];
      onlinepbxUrl += `?from=${fromStr}&to=${toStr}`;
      utelUrl += `?from=${fromStr}&to=${toStr}`;
    } else {
      onlinepbxUrl += `?period=${callsPeriod}`;
      utelUrl += `?period=${callsPeriod}`;
    }

    console.log(`[Sotuvchilar/Stats] Fetching calls from APIs: ${onlinepbxUrl}, ${utelUrl}`);

    // Fetch from both call APIs in parallel
    const [onlinepbxRes, utelRes] = await Promise.all([
      fetch(onlinepbxUrl, { cache: 'no-store' }).catch(err => {
        console.error('[Sotuvchilar/Stats] Error fetching OnlinePBX calls:', err);
        return null;
      }),
      fetch(utelUrl, { cache: 'no-store' }).catch(err => {
        console.error('[Sotuvchilar/Stats] Error fetching Utel calls:', err);
        return null;
      })
    ]);

    // Parse responses
    let onlinepbxData: any = null;
    let utelData: any = null;
    
    if (onlinepbxRes?.ok) {
      const json = await onlinepbxRes.json();
      onlinepbxData = json.data;
    }
    if (utelRes?.ok) {
      utelData = await utelRes.json();
    }

    // Aggregate calls by manager from both sources (same logic as calls page)
    const callsByManager = new Map<string, {
      totalCalls: number;
      totalDurationSec: number;
    }>();

    // Process OnlinePBX calls (from recentCalls array)
    if (onlinepbxData?.recentCalls) {
      onlinepbxData.recentCalls.forEach((call: any) => {
        const manager = call.user || 'Unknown';
        const existing = callsByManager.get(manager) || { totalCalls: 0, totalDurationSec: 0 };
        existing.totalCalls += 1;
        existing.totalDurationSec += call.duration || 0;
        callsByManager.set(manager, existing);
      });
    }

    // Process Utel calls (from managerSummary - already aggregated)
    if (utelData?.data?.managerSummary) {
      utelData.data.managerSummary.forEach((mgr: any) => {
        const manager = mgr.manager || 'Unknown';
        const existing = callsByManager.get(manager) || { totalCalls: 0, totalDurationSec: 0 };
        existing.totalCalls += mgr.totalCalls || 0;
        existing.totalDurationSec += mgr.totalDurationSec || 0;
        callsByManager.set(manager, existing);
      });
    }

    const totalOnlinePBX = onlinepbxData?.recentCalls?.length || 0;
    const totalUtel = utelData?.data?.totalCalls || 0;
    console.log(`[Sotuvchilar/Stats] Fetched ${totalOnlinePBX} OnlinePBX calls and ${totalUtel} Utel calls`);
    console.log(`[Sotuvchilar/Stats] Aggregated calls for ${callsByManager.size} managers`);

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
      const nonQualifiedLeads = Math.max(0, totalLeads - qualifiedLeads);

      const conversionToQualified = qualifiedLeads > 0 
        ? (wonDeals / qualifiedLeads) * 100 
        : 0;

      const conversionToAllLeads = totalLeads > 0
        ? (wonDeals / totalLeads) * 100
        : 0;

      // Lost reasons from dashboard
      const lostReasons: { reason: string; count: number }[] = [];
      dashboardData.nonQualifiedReasons.forEach((reason) => {
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
