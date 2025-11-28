import { NextRequest, NextResponse } from 'next/server';
import { buildDashboardData, Period } from '@/lib/dashboard';
import { prisma } from '@/lib/prisma';
import { getManagerNameFromExtension } from '@/lib/extensionMapping';
import { dashboardConfig } from '@/config/dashboardConfig';

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
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  if (period === 'today') {
    return { from: todayStart, to: now, label: 'Bugun' };
  }

  if (period === 'yesterday') {
    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);
    return { from: yesterday, to: yesterdayEnd, label: 'Kecha' };
  }

  if (period === 'week') {
    const from = new Date(todayStart);
    const day = from.getDay();
    const diffToMonday = (day + 6) % 7;
    from.setDate(from.getDate() - diffToMonday);
    return { from, to: now, label: 'Bu hafta' };
  }

  if (period === 'lastweek') {
    const from = new Date(todayStart);
    const day = from.getDay();
    const diffToMonday = (day + 6) % 7;
    from.setDate(from.getDate() - diffToMonday - 7);
    const to = new Date(from);
    to.setDate(to.getDate() + 6);
    to.setHours(23, 59, 59, 999);
    return { from, to, label: "O'tgan hafta" };
  }

  if (period === 'month') {
    const from = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
    return { from, to: now, label: 'Bu oy' };
  }

  if (period === 'lastmonth') {
    const from = new Date(todayStart.getFullYear(), todayStart.getMonth() - 1, 1);
    const to = new Date(todayStart.getFullYear(), todayStart.getMonth(), 0);
    to.setHours(23, 59, 59, 999);
    return { from, to, label: "O'tgan oy" };
  }

  if (period === 'custom') {
    // Will be handled by caller with start/end params
    return { from: todayStart, to: now, label: 'Maxsus davr' };
  }

  const from = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  return { from, to: now, label: 'Bu oy' };
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

    console.log(`[Sotuvchilar/Stats] Fetching stats for period: ${periodParam} (${fromDate.toISOString()} to ${toDate.toISOString()})`);

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

    // Fetch call data from OnlinePBX database
    const onlinepbxCalls = await prisma.onlinePBXCall.findMany({
      where: {
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
    }).catch((err) => {
      console.error('[Sotuvchilar/Stats] Error fetching OnlinePBX calls:', err);
      return [];
    });

    // Fetch call data from Utel database
    const utelCalls = await prisma.utelCall.findMany({
      where: {
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
    }).catch((err) => {
      console.error('[Sotuvchilar/Stats] Error fetching Utel calls:', err);
      return [];
    });

    console.log(`[Sotuvchilar/Stats] Fetched ${onlinepbxCalls.length} OnlinePBX calls and ${utelCalls.length} Utel calls`);

    // Aggregate calls by manager from both sources
    const callsByManager = new Map<string, {
      totalCalls: number;
      totalDurationSec: number;
    }>();

    // Process OnlinePBX calls
    onlinepbxCalls.forEach((call) => {
      const manager = call.user || 'Unknown';
      const existing = callsByManager.get(manager) || { totalCalls: 0, totalDurationSec: 0 };
      existing.totalCalls += 1;
      existing.totalDurationSec += call.duration || 0;
      callsByManager.set(manager, existing);
    });

    // Process Utel calls
    utelCalls.forEach((call) => {
      const manager = call.manager || 'Unknown';
      const existing = callsByManager.get(manager) || { totalCalls: 0, totalDurationSec: 0 };
      existing.totalCalls += 1;
      existing.totalDurationSec += call.duration || 0;
      callsByManager.set(manager, existing);
    });

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
