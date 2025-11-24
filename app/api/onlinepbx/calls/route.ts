import { NextResponse } from "next/server";
import { getOnlinePBXCalls, groupCallsByUser } from "@/lib/onlinepbx";

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

    // Fetch calls from OnlinePBX API
    const calls = await getOnlinePBXCalls(fromDate, toDate);

    console.log(`[OnlinePBX/Calls] Fetched ${calls.length} calls from OnlinePBX API`);

    // Transform to match dashboard format (same as webhook endpoint)
    const recentCalls = calls
      .map(call => ({
        id: call.id,
        type: call.type,
        date: call.date.toISOString(),
        duration: call.duration,
        phone: call.phone,
        user: call.user,
        source: "onlinepbx-api" as const,
        timestamp: call.date.getTime(),
      }))
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: {
        totalCalls: calls.length,
        filteredCount: recentCalls.length,
        recentCalls,
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
