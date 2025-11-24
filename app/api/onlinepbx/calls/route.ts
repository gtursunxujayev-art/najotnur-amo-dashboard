import { NextResponse } from "next/server";
import { recentCalls } from "@/app/api/onlinepbx/webhook/route";

export const dynamic = "force-dynamic";

type PeriodKey = "today" | "week" | "month";

function getPeriodDates(
  period: PeriodKey
): { from: Date; to: Date; label: string } {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  if (period === "today") {
    return { from: todayStart, to: now, label: "Bugun" };
  }

  if (period === "week") {
    const from = new Date(todayStart);
    const day = from.getDay();
    const diffToMonday = (day + 6) % 7;
    from.setDate(from.getDate() - diffToMonday);
    return { from, to: now, label: "Bu hafta" };
  }

  const from = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  return { from, to: now, label: "Bu oy" };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Support both period parameter and from/to date parameters
    const periodParam = searchParams.get("period") as PeriodKey | null;
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const limit = parseInt(searchParams.get("limit") || "1000");

    let fromDate: Date;
    let toDate: Date;

    if (fromParam && toParam) {
      // Use explicit date range if provided
      fromDate = new Date(fromParam);
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date(toParam);
      toDate.setHours(23, 59, 59, 999);
    } else {
      // Use period-based dates
      const period: PeriodKey = periodParam === "today" || periodParam === "month" ? periodParam : "week";
      const periodDates = getPeriodDates(period);
      fromDate = periodDates.from;
      toDate = periodDates.to;
    }

    console.log(
      `[OnlinePBX/Calls] Fetching calls from ${fromDate.toISOString()} to ${toDate.toISOString()}`
    );

    // Use webhook storage (real OnlinePBX data being pushed via webhook)
    let calls = Array.from(recentCalls).sort((a, b) => b.timestamp - a.timestamp);

    // Apply date filtering if provided
    if (fromDate && toDate) {
      const fromTime = fromDate.getTime();
      const toTime = toDate.getTime();
      
      calls = calls.filter((call) => {
        const callTime = new Date(call.date).getTime();
        return callTime >= fromTime && callTime <= toTime;
      });
    }

    // Apply limit
    const filteredCalls = calls.slice(0, limit);

    console.log(`[OnlinePBX/Calls] Returning ${filteredCalls.length} calls from webhook storage (total: ${recentCalls.length})`);

    return NextResponse.json({
      success: true,
      data: {
        totalCalls: recentCalls.length,
        filteredCount: filteredCalls.length,
        recentCalls: filteredCalls,
      },
    });
  } catch (error: any) {
    console.error("[OnlinePBX/Calls] Error:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        data: {
          totalCalls: 0,
          filteredCount: 0,
          recentCalls: [],
        },
      },
      { status: 500 }
    );
  }
}
